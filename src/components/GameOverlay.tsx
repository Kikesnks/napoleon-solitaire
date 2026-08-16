import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { formatElapsed } from "../hooks/useTimer";
import type { Status } from "../game";

interface Props {
  lang: Lang;
  status: Status;
  score: number;
  elapsedMs: number;
  onPlayAgain(): void;
  /** La partida que acaba de terminar era el reto de hoy. */
  wasDaily: boolean;
  /** Días seguidos jugando el reto. */
  dailyStreak: number;
}

export function GameOverlay({
  lang,
  status,
  score,
  elapsedMs,
  onPlayAgain,
  wasDaily,
  dailyStreak
}: Props) {
  if (status === "playing") return null;
  const t = STRINGS[lang];
  const won = status === "won";
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className={`overlay__panel ${won ? "overlay__panel--win" : "overlay__panel--lose"}`}>
        <h2 className="overlay__title">{won ? t.won : t.lost}</h2>
        {wasDaily && (
          <p className="overlay__daily">
            🗓️ {t.dailyTitle}
            {dailyStreak > 0 && (
              <>
                {" · 🔥 "}
                {t.dailyStreak}: {dailyStreak} {dailyStreak === 1 ? t.day : t.days}
              </>
            )}
          </p>
        )}
        <p className="overlay__message">{won ? t.wonMessage : t.lostMessage}</p>
        <dl className="overlay__stats">
          <div>
            <dt>{t.score}</dt>
            <dd>{score}</dd>
          </div>
          <div>
            <dt>{t.time}</dt>
            <dd>{formatElapsed(elapsedMs)}</dd>
          </div>
        </dl>
        <button type="button" className="hud__btn hud__btn--primary" onClick={onPlayAgain}>
          {t.playAgain}
        </button>
      </div>
    </div>
  );
}
