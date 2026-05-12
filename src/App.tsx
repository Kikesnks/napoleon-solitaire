import { useEffect, useState } from "react";
import { Board } from "./components/Board";
import { Confetti } from "./components/Confetti";
import { GameOverlay } from "./components/GameOverlay";
import { HUD } from "./components/HUD";
import { Instructions } from "./components/Instructions";
import { useGameEngine } from "./hooks/useGameEngine";
import { useTimer } from "./hooks/useTimer";
import { useFirstRun, useLanguage } from "./i18n/useLanguage";

/** Duración del reparto inicial: 9 pilas con stagger 80ms + 520ms keyframe ≈ 1.2s. */
const DEAL_ANIMATION_MS = 1400;

export default function App() {
  const engine = useGameEngine();
  const { state } = engine;
  const [lang, setLang] = useLanguage();
  const { firstRun, markSeen } = useFirstRun();

  /**
   * showRules controla la visibilidad del modal de instrucciones.
   * - Al primer arranque (firstRun) lo abrimos automáticamente.
   * - Desde el HUD, el botón "📖 Reglas" lo reabre cuando quieras.
   */
  const [showRules, setShowRules] = useState<boolean>(firstRun);

  // Si el flag firstRun cambia (otro tab marca como visto), reflejarlo aquí.
  useEffect(() => {
    if (firstRun) setShowRules(true);
  }, [firstRun]);

  /**
   * Reparto inicial animado: cuando empieza una partida (state.startedAt cambia)
   * y el modal de reglas no está visible, activamos un flag durante 1.4s. El
   * Board aplica la clase `board--dealing` y las cartas vuelan a su posición
   * con stagger CSS. Si el modal está abierto al cargar, esperamos a que el
   * jugador lo cierre antes de animar.
   */
  const [dealing, setDealing] = useState<boolean>(false);
  useEffect(() => {
    if (showRules) return;
    setDealing(true);
    const t = window.setTimeout(() => setDealing(false), DEAL_ANIMATION_MS);
    return () => window.clearTimeout(t);
  }, [state.startedAt, showRules]);

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
  }, [engine, showRules]);

  const dismissRules = () => {
    if (firstRun) markSeen();
    setShowRules(false);
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
        onNewGame={() => engine.newGame()}
        onShowRules={() => setShowRules(true)}
      />
      <main className="app__main">
        <Board
          state={state}
          dealing={dealing}
          onMove={engine.move}
          onAutoPromote={engine.autoPromote}
          onDeal={engine.deal}
        />
      </main>
      {state.status === "won" && <Confetti />}
      <GameOverlay
        lang={lang}
        status={state.status}
        score={state.score}
        elapsedMs={elapsedMs}
        onPlayAgain={() => engine.newGame()}
      />
      {showRules && (
        <Instructions
          lang={lang}
          onLangChange={setLang}
          onDismiss={dismissRules}
          firstRun={firstRun}
        />
      )}
    </div>
  );
}
