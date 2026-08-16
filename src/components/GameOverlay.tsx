import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { formatElapsed } from "../hooks/useTimer";
import type { Status } from "../game";
import type { DailyCollection } from "../game/daily";

interface Props {
  lang: Lang;
  status: Status;
  score: number;
  elapsedMs: number;
  onPlayAgain(): void;
  /** Fecha del reto que acaba de terminar, o `null` si era partida libre. */
  dailyDate: string | null;
  /** Hoy, para saber si el reto jugado era el del día o uno atrasado. */
  todayKey: string;
  /** Días seguidos jugando el reto. */
  dailyStreak: number;
  /** Retos del mes hechos y disponibles. Se cuenta aparte de la racha. */
  dailyCollection: DailyCollection;
}

export function GameOverlay({
  lang,
  status,
  score,
  elapsedMs,
  onPlayAgain,
  dailyDate,
  todayKey,
  dailyStreak,
  dailyCollection
}: Props) {
  if (status === "playing") return null;
  const t = STRINGS[lang];
  const won = status === "won";
  const wasDaily = dailyDate !== null;
  // Un reto atrasado dice de qué día era. Sin esto, quien se hace varios
  // seguidos ve el mismo cartel una y otra vez sin saber cuál acaba de cerrar.
  const dayLabel =
    wasDaily && dailyDate !== todayKey ? ` · ${t.dailyDayLabel} ${Number(dailyDate.slice(8, 10))}` : "";
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className={`overlay__panel ${won ? "overlay__panel--win" : "overlay__panel--lose"}`}>
        <h2 className="overlay__title">{won ? t.won : t.lost}</h2>
        {wasDaily && (
          <p className="overlay__daily">
            🗓️ {t.dailyTitle}
            {dayLabel}
            {dailyStreak > 0 && (
              <>
                {" · 🔥 "}
                {t.dailyStreak}: {dailyStreak} {dailyStreak === 1 ? t.day : t.days}
              </>
            )}
            {dailyCollection.total > 0 && (
              <>
                {" · "}
                {dailyCollection.done}/{dailyCollection.total} {t.dailyCollected}
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
