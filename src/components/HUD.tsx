import { formatElapsed } from "../hooks/useTimer";

interface Props {
  score: number;
  elapsedMs: number;
  round: number;
  moves: number;
  montonRemaining: number;
  canUndo: boolean;
  onUndo(): void;
  onNewGame(): void;
}

export function HUD({
  score,
  elapsedMs,
  round,
  moves,
  montonRemaining,
  canUndo,
  onUndo,
  onNewGame
}: Props) {
  return (
    <header className="hud">
      <div className="hud__stats">
        <Stat label="Tiempo" value={formatElapsed(elapsedMs)} />
        <Stat label="Puntos" value={score.toString()} />
        <Stat label="Ronda" value={`${round}/4`} />
        <Stat label="Mov." value={moves.toString()} />
        <Stat label="Montón" value={montonRemaining.toString()} />
      </div>
      <div className="hud__actions">
        <button
          type="button"
          className="hud__btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Deshacer"
        >
          ↶ Deshacer
        </button>
        <button type="button" className="hud__btn hud__btn--primary" onClick={onNewGame}>
          Nueva
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud__stat">
      <div className="hud__stat-label">{label}</div>
      <div className="hud__stat-value">{value}</div>
    </div>
  );
}
