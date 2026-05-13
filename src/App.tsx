import { useEffect, useRef, useState } from "react";
import { Board } from "./components/Board";
import { Confetti } from "./components/Confetti";
import { GameOverlay } from "./components/GameOverlay";
import { HUD } from "./components/HUD";
import { Instructions } from "./components/Instructions";
import { LeaderboardDialog } from "./components/LeaderboardDialog";
import { LeaderboardViewer } from "./components/LeaderboardViewer";
import { NameEntryDialog } from "./components/NameEntryDialog";
import { SuitSelectDialog } from "./components/SuitSelectDialog";
import { useGameEngine } from "./hooks/useGameEngine";
import { useTimer } from "./hooks/useTimer";
import { useFirstRun, useLanguage } from "./i18n/useLanguage";
import type { SuitMode, Status } from "./game";
import { addEntry, qualifies, type LeaderboardCategory, type LeaderboardEntry } from "./game/leaderboard";

/** Duración del reparto inicial: 9 pilas con stagger 80ms + 520ms keyframe ≈ 1.2s. */
const DEAL_ANIMATION_MS = 1400;

export default function App() {
  const engine = useGameEngine();
  const { state } = engine;
  const [lang, setLang] = useLanguage();
  const { firstRun, markSeen } = useFirstRun();

  /**
   * showRules: SIEMPRE true al cargar la página (también en F5, no solo en
   * el primer arranque). Desde el HUD también se puede reabrir.
   */
  const [showRules, setShowRules] = useState<boolean>(true);

  /**
   * rulesOnLoad: true mientras las reglas que se ven forman parte del flujo
   * de carga inicial. Pasa a false al cerrarlas por primera vez. Determina
   * la etiqueta del botón ("Empezar a jugar" vs "Cerrar") y si el siguiente
   * paso tras cerrarlas es el selector de palos.
   */
  const [rulesOnLoad, setRulesOnLoad] = useState<boolean>(true);

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
  >("firstrun");

  // ── Liga de Campeones ─────────────────────────────────────────────────────
  type LbPhase =
    | { step: "idle" }
    | { step: "name-entry"; category: LeaderboardCategory; score: number; suitMode: SuitMode }
    | { step: "show-table"; category: LeaderboardCategory; entries: LeaderboardEntry[]; highlightTs: number };

  const [lbPhase, setLbPhase] = useState<LbPhase>({ step: "idle" });
  const [showLbViewer, setShowLbViewer] = useState(false);

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

    const category: LeaderboardCategory = cur === "won" ? "won" : "lost";
    if (qualifies(category, state.score)) {
      setLbPhase({ step: "name-entry", category, score: state.score, suitMode: state.suitMode });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const handleLbNameSave = (name: string) => {
    if (lbPhase.step !== "name-entry") return;
    const ts = Date.now();
    const d = new Date();
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
    const entry: LeaderboardEntry = { name, score: lbPhase.score, date, suitMode: lbPhase.suitMode, ts };
    const entries = addEntry(lbPhase.category, entry);
    setLbPhase({ step: "show-table", category: lbPhase.category, entries, highlightTs: ts });
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
  useEffect(() => {
    if (showRules || pendingSuitSource !== null) return;
    setDealing(true);
    const t = window.setTimeout(() => setDealing(false), DEAL_ANIMATION_MS);
    return () => window.clearTimeout(t);
  }, [state.startedAt, showRules, pendingSuitSource]);

  const elapsedMs = useTimer(state.startedAt, state.status === "playing" && !showRules);

  // Atajos de teclado: U para deshacer, Espacio para repartir, Escape para
  // cerrar instrucciones. Se desactivan cuando el modal está abierto (excepto Escape).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [engine, showRules, pendingSuitSource, lbPhase.step, showLbViewer]);

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
    engine.newGame(undefined, mode);
  };

  const handleSuitCancel = () => {
    setPendingSuitSource(null);
  };

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
      />
      <main className="app__main">
        <Board
          state={state}
          dealing={dealing}
          onMove={engine.move}
          onDeal={engine.deal}
        />
      </main>
      {state.status === "won" && <Confetti />}
      <GameOverlay
        lang={lang}
        status={state.status}
        score={state.score}
        elapsedMs={elapsedMs}
        onPlayAgain={() => setPendingSuitSource("gameover")}
      />
      {showRules && (
        <Instructions
          lang={lang}
          onLangChange={setLang}
          onDismiss={dismissRules}
          showPlayButton={rulesOnLoad}
        />
      )}
      {!showRules && pendingSuitSource !== null && (
        <SuitSelectDialog
          lang={lang}
          canCancel={pendingSuitSource === "hud"}
          onSelect={handleSuitSelect}
          onCancel={handleSuitCancel}
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
      {lbPhase.step === "show-table" && (
        <LeaderboardDialog
          lang={lang}
          category={lbPhase.category}
          entries={lbPhase.entries}
          highlightTs={lbPhase.highlightTs}
          onAccept={handleLbAccept}
        />
      )}
      {showLbViewer && (
        <LeaderboardViewer lang={lang} onClose={() => setShowLbViewer(false)} />
      )}
    </div>
  );
}
