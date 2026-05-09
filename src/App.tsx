import { useEffect } from "react";
import { Board } from "./components/Board";
import { GameOverlay } from "./components/GameOverlay";
import { HUD } from "./components/HUD";
import { useGameEngine } from "./hooks/useGameEngine";
import { useTimer } from "./hooks/useTimer";

export default function App() {
  const engine = useGameEngine();
  const { state } = engine;

  const elapsedMs = useTimer(
    state.startedAt,
    state.status === "playing"
  );

  // Atajos de teclado: U para deshacer, Espacio para repartir.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [engine]);

  return (
    <div className="app">
      <HUD
        score={state.score}
        elapsedMs={elapsedMs}
        round={state.round}
        moves={state.moves}
        montonRemaining={state.positions.monton.length}
        canUndo={engine.canUndo}
        onUndo={engine.undo}
        onNewGame={() => engine.newGame()}
      />
      <main className="app__main">
        <Board
          state={state}
          onMove={engine.move}
          onAutoPromote={engine.autoPromote}
          onDeal={engine.deal}
        />
      </main>
      <GameOverlay
        status={state.status}
        score={state.score}
        elapsedMs={elapsedMs}
        onPlayAgain={() => engine.newGame()}
      />
    </div>
  );
}
