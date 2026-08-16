import { useState } from "react";
import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import type { SuitMode } from "../game";
import type { DailyCollection, DailyResult } from "../game/daily";
import { DailyCalendar } from "./DailyCalendar";
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
  /** Cuántos retos del mes lleva hechos, de cuántos hay. Se cuenta aparte de la racha. */
  dailyCollection: DailyCollection;
  /** Días jugables del mes. Vienen del motor: del 1 a hoy, nunca el futuro. */
  dailyDays: readonly string[];
  dailyResultsByDate: Readonly<Record<string, readonly DailyResult[]>>;
  dailyTodayKey: string;
  onSelectDaily(mode: SuitMode, date: string): void;
}

export function SuitSelectDialog({
  lang,
  canCancel,
  onSelect,
  onCancel,
  dailyStreak,
  dailyPlayedToday,
  dailyCollection,
  dailyDays,
  dailyResultsByDate,
  dailyTodayKey,
  onSelectDaily
}: Props) {
  const t = STRINGS[lang];

  /**
   * Día elegido en el calendario. Arranca en hoy siempre: el reto de hoy es el
   * que hace volver mañana, y tiene que seguir estando a un solo clic aunque el
   * calendario esté delante.
   */
  const [selectedDay, setSelectedDay] = useState<string>(dailyTodayKey);
  const dayResults = dailyResultsByDate[selectedDay] ?? [];
  const alreadyPlayed =
    selectedDay === dailyTodayKey ? dailyPlayedToday : dayResults.length > 0;
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
          <p className="suit-select__daily-hint">
            {selectedDay === dailyTodayKey ? t.dailyHint : t.dailyPickDay}
          </p>

          <DailyCalendar
            lang={lang}
            days={dailyDays}
            resultsByDate={dailyResultsByDate}
            todayKey={dailyTodayKey}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />

          <div className="suit-select__daily-actions">
            <button
              type="button"
              className="hud__btn suit-select__daily-btn"
              onClick={() => onSelectDaily(2, selectedDay)}
            >
              {t.twoSuits}
            </button>
            <button
              type="button"
              className="hud__btn suit-select__daily-btn"
              onClick={() => onSelectDaily(4, selectedDay)}
            >
              {t.fourSuits}
            </button>
          </div>

          {/*
            Racha y colección, contadas por separado a propósito: quien se haga
            quince retos atrasados en una tarde verá "racha 1 día · 15 de 31".
            La racha solo la consigue quien vuelve cada día, y es lo que empuja
            a volver; la colección es lo que le da algo que hacer hoy.

            La colección va por DÍAS y su total es el mes entero. Hacer las dos
            dificultades del mismo día no suma dos: el reto del día es uno.
          */}
          <p className="suit-select__daily-streak">
            {dailyStreak > 0 && (
              <span>
                🔥 {t.dailyStreak}: {dailyStreak} {dailyStreak === 1 ? t.day : t.days}
              </span>
            )}
            {dailyStreak > 0 && dailyCollection.total > 0 && <span> · </span>}
            {dailyCollection.total > 0 && (
              <span>
                🗓️ {dailyCollection.done}/{dailyCollection.total} {t.dailyCollected}
              </span>
            )}
          </p>
          {alreadyPlayed && (
            <p className="suit-select__daily-replay">
              {selectedDay === dailyTodayKey ? `${t.dailyPlayedToday} · ` : ""}
              {t.dailyReplayHint}
            </p>
          )}
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
