import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { formatElapsed } from "../hooks/useTimer";
import type { Status } from "../game";
import type { DailyVariantProgress } from "../game/daily";

interface Props {
  lang: Lang;
  status: Status;
  score: number;
  elapsedMs: number;
  onPlayAgain(): void;
  /**
   * Aparta el cartel y deja ver el tablero como quedó. No se pierde nada: el
   * resultado ya está registrado y "Nueva" sigue en el HUD.
   */
  onClose(): void;
  /** Fecha del reto que acaba de terminar, o `null` si era partida libre. */
  dailyDate: string | null;
  /** Hoy, para saber si el reto jugado era el del día o uno atrasado. */
  todayKey: string;
  /** Días seguidos jugando el reto. */
  dailyStreak: number;
  /** El avance del mes en cada dificultad. Se cuenta aparte de la racha. */
  dailyCollections: readonly DailyVariantProgress[];
}

export function GameOverlay({
  lang,
  status,
  score,
  elapsedMs,
  onPlayAgain,
  onClose,
  dailyDate,
  todayKey,
  dailyStreak,
  dailyCollections
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
          <>
            <p className="overlay__daily">
              🗓️ {t.dailyTitle}
              {dayLabel}
              {dailyStreak > 0 && (
                <>
                  {" · 🔥 "}
                  {t.dailyStreak}: {dailyStreak} {dailyStreak === 1 ? t.day : t.days}
                </>
              )}
            </p>
            {/* El avance del mes, una cuenta por dificultad. En su propia línea:
                junto a la racha y al día del reto no cabía en un panel de 360 px. */}
            <p className="overlay__daily-collection">
              {dailyCollections.map((c, i) => (
                <span key={c.variant}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <strong>
                    {c.done}/{c.total}
                  </strong>{" "}
                  {c.suitMode === 2 ? t.twoSuits : t.fourSuits}
                </span>
              ))}
            </p>
          </>
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
        {/* Dos salidas, como todos los diálogos: la que propone el cartel y la
            de irse sin hacerla. Aquí "Ahora no" enseña el tablero como quedó,
            que es lo que uno quiere mirar justo después de perder. */}
        <div className="overlay__actions">
          <button type="button" className="hud__btn overlay__dismiss" onClick={onClose}>
            {t.notNow}
          </button>
          <button type="button" className="hud__btn hud__btn--primary" onClick={onPlayAgain}>
            {t.playAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
