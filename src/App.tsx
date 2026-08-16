import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./components/Board";
import { Confetti } from "./components/Confetti";
import { GameOverlay } from "./components/GameOverlay";
import { HUD } from "./components/HUD";
import { Instructions } from "./components/Instructions";
import { LeaderboardDialog } from "./components/LeaderboardDialog";
import { LeaderboardViewer } from "./components/LeaderboardViewer";
import { NameEntryDialog } from "./components/NameEntryDialog";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { SuitSelectDialog } from "./components/SuitSelectDialog";
import { readPref, writePref } from "./core/storage/prefs";
import { useFitBoard } from "./hooks/useFitBoard";
import { useGameEngine } from "./hooks/useGameEngine";
import { useTimer } from "./hooks/useTimer";
import { useFirstRun, useLanguage } from "./i18n/useLanguage";
import { STRINGS } from "./i18n/strings";
import type { SuitMode, Status } from "./game";
import { challengeDateOf, daily, seedForDate, variantOf, type DailyResult } from "./game/daily";
import { qualifies, submitScore, type LeaderboardCategory, type LeaderboardEntry } from "./game/leaderboard";

/** Duración del reparto inicial: 9 pilas con stagger 80ms + 520ms keyframe ≈ 1.2s. */
const DEAL_ANIMATION_MS = 1400;

/** Dificultad elegida la última vez. Preferencia funcional, no rastreo. */
const SUIT_MODE_KEY = "solnap.suitMode";

function readSuitMode(): SuitMode {
  return readPref(SUIT_MODE_KEY) === "2" ? 2 : 4;
}

export default function App() {
  const { firstRun, markSeen } = useFirstRun();
  const engine = useGameEngine(undefined, readSuitMode());
  const { state } = engine;
  const [lang, setLang] = useLanguage();

  /**
   * showRules: sólo en la PRIMERA visita. En las siguientes el jugador cae
   * directo en el tablero — un muro de texto en cada carga es la fuga de
   * retención más tonta que puede tener un juego de portal, y la retención es
   * justo lo que decide si CrazyGames nos invita a monetizar. Siguen accesibles
   * en todo momento con el botón 📖 del HUD.
   */
  const [showRules, setShowRules] = useState<boolean>(firstRun);

  /**
   * rulesOnLoad: true mientras las reglas que se ven forman parte del flujo
   * de carga inicial. Pasa a false al cerrarlas por primera vez. Determina
   * la etiqueta del botón ("Empezar a jugar" vs "Cerrar") y si el siguiente
   * paso tras cerrarlas es el selector de palos.
   */
  const [rulesOnLoad, setRulesOnLoad] = useState<boolean>(firstRun);

  /**
   * pendingSuitSource: cuando está establecido, muestra el selector de palos.
   * "hud"      → el jugador pulsó "Nueva" (puede cancelar y seguir la partida).
   * "gameover" → el jugador pulsó "Jugar otra" (no puede cancelar).
   * "firstrun" → flujo de carga inicial: se muestra tras cerrar las reglas.
   * Se inicializa siempre a "firstrun" — el render del selector está
   * condicionado a !showRules para que el flujo sea secuencial (reglas → palos).
   */
  const [pendingSuitSource, setPendingSuitSource] = useState<
    "hud" | "gameover" | "firstrun" | null
  >(firstRun ? "firstrun" : null);

  // ── Liga de Campeones ─────────────────────────────────────────────────────
  // El flujo es asíncrono porque la persistencia es en servidor (Supabase):
  //  1. Al terminar la partida, consultamos al servidor si el score clasifica.
  //  2. Si sí, pedimos el nombre.
  //  3. Enviamos el payload (seed + acciones) para que el servidor valide
  //     y devuelva el top 10 actualizado, que pintamos resaltando la entrada.
  type LbPhase =
    | { step: "idle" }
    | { step: "name-entry"; category: LeaderboardCategory; score: number; suitMode: SuitMode }
    | { step: "submitting"; category: LeaderboardCategory }
    | { step: "show-table"; category: LeaderboardCategory; entries: LeaderboardEntry[]; highlightTs: number }
    | { step: "error"; category: LeaderboardCategory; score: number; suitMode: SuitMode; message: string };

  const [lbPhase, setLbPhase] = useState<LbPhase>({ step: "idle" });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLbViewer, setShowLbViewer] = useState(false);

  // ── Reto diario ───────────────────────────────────────────────────────────
  // La racha se guarda en localStorage y se relee tras cada partida, así que
  // basta con un contador para forzar el refresco. Que la partida en curso sea
  // el reto de hoy se DEDUCE de la semilla: es determinista y no hace falta
  // guardar ninguna marca extra ni tocar el estado del motor.
  const [dailyTick, setDailyTick] = useState(0);
  const dailyStreak = useMemo(() => daily.streak(), [dailyTick]);
  const dailyCollection = useMemo(() => daily.collection(), [dailyTick]);
  const dailyTodayKey = useMemo(() => daily.todayKey(), [dailyTick]);
  /** Los días jugables los decide el motor: del 1 del mes a hoy, nunca el futuro. */
  const dailyDays = useMemo(() => daily.playableKeys(), [dailyTick]);
  const dailyResultsByDate = useMemo(() => {
    const out: Record<string, readonly DailyResult[]> = {};
    for (const fecha of dailyDays) out[fecha] = daily.resultsOf(fecha);
    return out;
  }, [dailyDays, dailyTick]);

  /**
   * De qué día es el reto que se está jugando, o `null` si es partida libre.
   * Se deduce de la semilla, sin marcas extra ni campos nuevos en el motor.
   */
  const dailyGameDate = challengeDateOf(state.seed, state.suitMode);

  // Detecta el fin de partida una sola vez por juego.
  const prevStatusRef = useRef<Status>("playing");
  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = state.status;
    prevStatusRef.current = cur;

    if (cur === "playing") {
      // Nueva partida empezada: limpiar estado de leaderboard.
      setLbPhase({ step: "idle" });
      return;
    }
    if (prev !== "playing") return; // ya gestionado en esta partida

    // Resultado del reto: se guarda en local, solo en este dispositivo.
    //
    // Va con la SEMILLA Y EL REGISTRO DE ACCIONES, no solo con la puntuación.
    // El servidor acredita reproduciendo la partida, así que sin esto el día
    // que exista la clasificación mensual no podría acreditar nada de lo jugado
    // antes y la tabla nacería vacía. Guardarlo ahora es barato; después, no.
    if (dailyGameDate !== null) {
      daily.recordResult({
        date: dailyGameDate,
        variant: variantOf(state.suitMode),
        score: state.score,
        won: cur === "won",
        seed: state.seed,
        actions: state.actionLog
      });
      setDailyTick((n) => n + 1);
    }

    const category: LeaderboardCategory = cur === "won" ? "won" : "lost";
    let cancelled = false;
    void qualifies(category, state.score)
      .then((ok) => {
        if (cancelled || !ok) return;
        setLbPhase({ step: "name-entry", category, score: state.score, suitMode: state.suitMode });
      })
      // `qualifies` ya absorbe los fallos, pero sin este catch un rechazo
      // inesperado quedaría como "unhandled rejection" en la consola — y en la
      // revisión de calidad de un portal eso es justo lo que no queremos.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const handleLbNameSave = async (name: string) => {
    if (lbPhase.step !== "name-entry") return;
    const { category, score, suitMode } = lbPhase;
    setLbPhase({ step: "submitting", category });
    try {
      const entries = await submitScore({
        name,
        category,
        score,
        suitMode,
        seed: state.seed,
        actions: state.actionLog
      });
      // El servidor devuelve el top 10 reordenado. Resaltamos la última
      // entrada coincidente con name+score (no tenemos el ts asignado
      // server-side, pero coincide en nombre y puntos).
      const mine = [...entries].reverse().find((e) => e.name === name && e.score === score);
      setLbPhase({
        step: "show-table",
        category,
        entries,
        highlightTs: mine ? mine.ts : -1
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLbPhase({ step: "error", category, score, suitMode, message: msg });
    }
  };

  const handleLbRetry = () => {
    if (lbPhase.step !== "error") return;
    const { category, score, suitMode } = lbPhase;
    setLbPhase({ step: "name-entry", category, score, suitMode });
  };

  const handleLbAccept = () => setLbPhase({ step: "idle" });


  /**
   * Reparto inicial animado: cuando empieza una partida (state.startedAt cambia)
   * y el modal de reglas no está visible, activamos un flag durante 1.4s. El
   * Board aplica la clase `board--dealing` y las cartas vuelan a su posición
   * con stagger CSS. Si el modal está abierto al cargar, esperamos a que el
   * jugador lo cierre antes de animar.
   */
  const [dealing, setDealing] = useState<boolean>(false);
  /**
   * Última partida ya animada. Sin esto, el efecto se relanzaba cada vez que
   * se cerraba el modal de reglas y las cartas volvían a "repartirse" en
   * pantalla: quien consultaba las reglas a mitad de partida creía que había
   * perdido lo jugado (la partida seguía intacta, era sólo la animación).
   */
  const animatedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (showRules || pendingSuitSource !== null) return;
    if (animatedForRef.current === state.startedAt) return;
    animatedForRef.current = state.startedAt;
    // Partida retomada tras recargar: el tablero ya está a medias, repartir
    // otra vez sería mentir sobre lo que está pasando.
    if (state.moves > 0) return;
    setDealing(true);
    const t = window.setTimeout(() => setDealing(false), DEAL_ANIMATION_MS);
    return () => window.clearTimeout(t);
  }, [state.startedAt, showRules, pendingSuitSource]);

  const elapsedMs = useTimer(state.startedAt, state.status === "playing" && !showRules);

  // Atajos de teclado: U para deshacer, Espacio para repartir, Escape para
  // cerrar instrucciones. Se desactivan cuando el modal está abierto (excepto Escape).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // La política se abre ENCIMA de las reglas, así que se cierra primero.
      // Sin esto, Escape cerraba las reglas de debajo y dejaba la política
      // colgada en pantalla, sólo cerrable con su botón.
      if (showPrivacy) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowPrivacy(false);
        }
        return;
      }
      if (showRules) {
        if (e.key === "Escape") {
          e.preventDefault();
          dismissRules();
        }
        return;
      }
      if (pendingSuitSource === "hud" && e.key === "Escape") {
        e.preventDefault();
        handleSuitCancel();
        return;
      }
      if (pendingSuitSource !== null) return;
      // Bloquear atajos mientras el leaderboard esté activo.
      if (lbPhase.step !== "idle") return;
      if (showLbViewer) {
        if (e.key === "Escape") { e.preventDefault(); setShowLbViewer(false); }
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        engine.undo();
      } else if (e.code === "Space") {
        e.preventDefault();
        engine.deal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, showRules, showPrivacy, pendingSuitSource, lbPhase.step, showLbViewer]);

  const dismissRules = () => {
    if (firstRun) markSeen();
    setShowRules(false);
    // Al cerrar las reglas mostradas en la carga inicial, pendingSuitSource
    // ya está en "firstrun" y el selector aparecerá automáticamente. En las
    // aperturas posteriores desde el HUD, rulesOnLoad es false y no hacemos nada.
    setRulesOnLoad(false);
  };

  const handleSuitSelect = (mode: SuitMode) => {
    setPendingSuitSource(null);
    writePref(SUIT_MODE_KEY, String(mode));
    engine.newGame(undefined, mode);
  };

  const handleSuitCancel = () => {
    setPendingSuitSource(null);
  };

  /**
   * Empieza el reto de un día. Misma dificultad elegida, pero con la semilla de
   * ese día: el mismo reparto para todo el mundo. Se marca como jugado al
   * empezar, no al ganar — el Napoleón es difícil y una racha que solo contara
   * victorias sería un cero permanente, justo lo contrario de lo que hace
   * volver mañana.
   *
   * La racha se marca **en el día de hoy**, sea cual sea el reto elegido: mide
   * que el jugador ha venido hoy, no qué reparto ha jugado. Por eso quien se
   * hace treinta retos atrasados en una tarde tiene racha de 1 día y treinta
   * retos en la colección: son dos cosas distintas y se cuentan por separado.
   *
   * Repetir un reto ya jugado está permitido: mismo reparto, se conserva la
   * mejor puntuación y la racha no se toca (ya estaba marcada).
   */
  const handleDailySelect = (mode: SuitMode, date: string) => {
    // Cinturón: la interfaz solo ofrece días jugables, pero el motor manda.
    if (!daily.isPlayable(date)) return;
    setPendingSuitSource(null);
    writePref(SUIT_MODE_KEY, String(mode));
    engine.newGame(seedForDate(date, mode), mode);
    daily.markPlayed(daily.todayKey());
    setDailyTick((n) => n + 1);
  };

  // El tablero se escala al hueco medido, no al estimado — ver `useFitBoard`.
  const mainRef = useRef<HTMLElement>(null);
  useFitBoard(mainRef);

  return (
    <div className="app">
      <HUD
        lang={lang}
        score={state.score}
        elapsedMs={elapsedMs}
        round={state.round}
        moves={state.moves}
        montonRemaining={state.positions.monton.length}
        canUndo={engine.canUndo}
        onUndo={engine.undo}
        onNewGame={() => setPendingSuitSource("hud")}
        onShowRules={() => setShowRules(true)}
        onShowLeaderboard={() => setShowLbViewer(true)}
        onShowPrivacy={() => setShowPrivacy(true)}
      />
      <main className="app__main" ref={mainRef}>
        <Board
          state={state}
          dealing={dealing}
          onMove={engine.move}
          onDeal={engine.deal}
          onPromote={engine.autoPromote}
        />
      </main>
      {state.status === "won" && <Confetti />}
      <GameOverlay
        lang={lang}
        status={state.status}
        score={state.score}
        elapsedMs={elapsedMs}
        onPlayAgain={() => setPendingSuitSource("gameover")}
        dailyDate={dailyGameDate}
        todayKey={dailyTodayKey}
        dailyStreak={dailyStreak.current}
        dailyCollection={dailyCollection}
      />
      {showRules && (
        <Instructions
          lang={lang}
          onLangChange={setLang}
          onDismiss={dismissRules}
          showPlayButton={rulesOnLoad}
          onShowPrivacy={() => setShowPrivacy(true)}
        />
      )}
      {!showRules && pendingSuitSource !== null && (
        <SuitSelectDialog
          lang={lang}
          canCancel={pendingSuitSource === "hud"}
          onSelect={handleSuitSelect}
          onCancel={handleSuitCancel}
          dailyStreak={dailyStreak.current}
          dailyPlayedToday={dailyStreak.playedToday}
          dailyCollection={dailyCollection}
          dailyDays={dailyDays}
          dailyResultsByDate={dailyResultsByDate}
          dailyTodayKey={dailyTodayKey}
          onSelectDaily={handleDailySelect}
        />
      )}
      {lbPhase.step === "name-entry" && (
        <NameEntryDialog
          lang={lang}
          category={lbPhase.category}
          score={lbPhase.score}
          onSave={handleLbNameSave}
        />
      )}
      {lbPhase.step === "submitting" && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlay__panel lb-dialog__panel">
            <p className="lb__empty">{STRINGS[lang].lbSubmitting}</p>
          </div>
        </div>
      )}
      {lbPhase.step === "error" && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlay__panel lb-dialog__panel">
            <h2 className="lb-dialog__title">{STRINGS[lang].lbError}</h2>
            <p className="lb__empty">{lbPhase.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <button type="button" className="hud__btn" onClick={handleLbAccept}>
                {STRINGS[lang].close}
              </button>
              <button
                type="button"
                className="hud__btn hud__btn--primary"
                onClick={handleLbRetry}
              >
                {STRINGS[lang].lbRetry}
              </button>
            </div>
          </div>
        </div>
      )}
      {lbPhase.step === "show-table" && (
        <LeaderboardDialog
          lang={lang}
          category={lbPhase.category}
          entries={lbPhase.entries}
          highlightTs={lbPhase.highlightTs}
          onAccept={handleLbAccept}
        />
      )}
      {showPrivacy && <PrivacyPolicy lang={lang} onClose={() => setShowPrivacy(false)} />}
      {showLbViewer && (
        <LeaderboardViewer lang={lang} onClose={() => setShowLbViewer(false)} />
      )}
    </div>
  );
}
