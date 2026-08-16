import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import type { SuitMode } from "../game";
import { SuitIcon } from "./SuitIcon";

interface Props {
  lang: Lang;
  /** Si false, no se muestra el botón Cancelar (primer arranque o partida acabada). */
  canCancel: boolean;
  onSelect(mode: SuitMode): void;
  onCancel(): void;
  /** Reto diario: días seguidos jugando. */
  dailyStreak: number;
  /** ¿Ya se ha jugado el reto de hoy? Solo informa; se puede repetir. */
  dailyPlayedToday: boolean;
  onSelectDaily(mode: SuitMode): void;
}

export function SuitSelectDialog({
  lang,
  canCancel,
  onSelect,
  onCancel,
  dailyStreak,
  dailyPlayedToday,
  onSelectDaily
}: Props) {
  const t = STRINGS[lang];
  return (
    <div
      className="overlay suit-select"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suit-select-title"
    >
      <div className="overlay__panel suit-select__panel">
        <h2 id="suit-select-title" className="overlay__title">
          {t.chooseSuits}
        </h2>

        <p className="suit-select__section">{t.freeGame}</p>

        <div className="suit-select__options">
          <button
            type="button"
            className="suit-select__option"
            onClick={() => onSelect(2)}
          >
            <div className="suit-select__icons">
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="hearts" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="spades" />
              </span>
            </div>
            <span className="suit-select__name">{t.twoSuits}</span>
            <span className="suit-select__desc">{t.twoSuitsDesc}</span>
          </button>

          <button
            type="button"
            className="suit-select__option"
            onClick={() => onSelect(4)}
          >
            <div className="suit-select__icons">
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="hearts" />
              </span>
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="diamonds" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="spades" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="clubs" />
              </span>
            </div>
            <span className="suit-select__name">{t.fourSuits}</span>
            <span className="suit-select__desc">{t.fourSuitsDesc}</span>
          </button>
        </div>

        {/*
          Reto diario. Va aquí y no en el HUD a propósito: la cabecera ya iba
          justa a 320 px y un botón más la volvía a partir en dos filas. Este
          es además el momento natural — el jugador está eligiendo qué partida
          empezar.

          Ningún texto promete que el reparto de hoy tenga solución.
        */}
        <section className="suit-select__daily" aria-labelledby="daily-title">
          <h3 id="daily-title" className="suit-select__daily-title">
            🗓️ {t.dailyTitle}
          </h3>
          <p className="suit-select__daily-hint">{t.dailyHint}</p>
          <div className="suit-select__daily-actions">
            <button
              type="button"
              className="hud__btn suit-select__daily-btn"
              onClick={() => onSelectDaily(2)}
            >
              {t.twoSuits}
            </button>
            <button
              type="button"
              className="hud__btn suit-select__daily-btn"
              onClick={() => onSelectDaily(4)}
            >
              {t.fourSuits}
            </button>
          </div>
          <p className="suit-select__daily-streak">
            {dailyStreak > 0 && (
              <span>
                🔥 {t.dailyStreak}: {dailyStreak} {dailyStreak === 1 ? t.day : t.days}
              </span>
            )}
            {dailyPlayedToday && <span> · {t.dailyPlayedToday}</span>}
          </p>
        </section>

        {canCancel && (
          <button type="button" className="hud__btn suit-select__cancel" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
