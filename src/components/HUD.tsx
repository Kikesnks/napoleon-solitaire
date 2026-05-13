import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { formatElapsed } from "../hooks/useTimer";

interface Props {
  lang: Lang;
  score: number;
  elapsedMs: number;
  round: number;
  moves: number;
  montonRemaining: number;
  canUndo: boolean;
  onUndo(): void;
  onNewGame(): void;
  onShowRules(): void;
  onShowLeaderboard(): void;
}

export function HUD({
  lang,
  score,
  elapsedMs,
  round,
  moves,
  montonRemaining,
  canUndo,
  onUndo,
  onNewGame,
  onShowRules,
  onShowLeaderboard
}: Props) {
  const t = STRINGS[lang];
  return (
    <header className="hud">
      <div className="hud__stats">
        <Stat label={t.time} value={formatElapsed(elapsedMs)} />
        <Stat label={t.score} value={score.toString()} />
        <Stat label={t.round} value={`${round}/4`} />
        <Stat label={t.moves} value={moves.toString()} />
        <Stat label={t.monton} value={montonRemaining.toString()} />
      </div>
      <div className="hud__actions">
        <button
          type="button"
          className="hud__btn hud__btn--icon"
          onClick={onShowLeaderboard}
          aria-label={t.leaderboard}
          title={t.leaderboard}
        >
          🏆
        </button>
        <button
          type="button"
          className="hud__btn hud__btn--icon"
          onClick={onShowRules}
          aria-label={t.rules}
          title={t.rules}
        >
          📖
        </button>
        <button
          type="button"
          className="hud__btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t.undo}
        >
          ↶ {t.undo}
        </button>
        <button type="button" className="hud__btn hud__btn--primary" onClick={onNewGame}>
          {t.newGame}
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
