import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import type { DailyResult, DailyVariant } from "../game/daily";
import { DAILY_VARIANTS } from "../game/daily";

interface Props {
  lang: Lang;
  /** Días jugables, del 1 del mes a hoy. Los da el motor, nunca la interfaz. */
  days: readonly string[];
  /** Resultados guardados de cada día, por fecha. */
  resultsByDate: Readonly<Record<string, readonly DailyResult[]>>;
  todayKey: string;
  selected: string;
  onSelect(date: string): void;
}

/** Lunes = 0. La semana empieza en lunes en los tres idiomas que hablamos. */
function weekdayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  // A mediodía, como en el resto del reto diario: construir una fecha a las
  // 00:00 se va al día anterior en los husos que se adelantan a medianoche.
  return (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
}

const dayNumber = (date: string): number => Number(date.slice(8, 10));

/**
 * El calendario del mes en curso: qué retos hay, cuáles llevas y cuál estás a
 * punto de jugar.
 *
 * Solo pinta lo que le pasan. **Los días futuros no se le pasan nunca** porque
 * `days` viene de `daily.playableKeys()`, que va del día 1 a hoy — este
 * componente no decide qué se puede jugar, y por eso no puede equivocarse.
 */
export function DailyCalendar({
  lang,
  days,
  resultsByDate,
  todayKey,
  selected,
  onSelect
}: Props) {
  const t = STRINGS[lang];
  if (days.length === 0) return null;

  // Huecos hasta el primer día del mes, para que cada número caiga bajo su
  // letra. El mes siempre empieza el día 1, así que basta con mirar ese.
  const huecos = weekdayIndex(days[0]);

  const estadoDe = (fecha: string, variante: DailyVariant): "won" | "done" | "pending" => {
    const r = resultsByDate[fecha]?.find((x) => x.variant === variante);
    if (!r) return "pending";
    return r.won ? "won" : "done";
  };

  const etiqueta = (fecha: string): string => {
    const partes = DAILY_VARIANTS.map((v) => {
      const e = estadoDe(fecha, v);
      const estado = e === "won" ? t.dailyDayWon : e === "done" ? t.dailyDayDone : t.dailyDayPending;
      return `${v === "2" ? t.twoSuits : t.fourSuits}: ${estado}`;
    });
    const hoy = fecha === todayKey ? ` (${t.dailyToday})` : "";
    return `${t.dailyDayLabel} ${dayNumber(fecha)}${hoy} — ${partes.join(", ")}`;
  };

  return (
    <div className="daily-cal">
      <div className="daily-cal__weekdays" aria-hidden="true">
        {t.weekdayInitials.map((inicial, i) => (
          <span key={i} className="daily-cal__weekday">
            {inicial}
          </span>
        ))}
      </div>
      <div className="daily-cal__grid" role="group" aria-label={t.dailyMonthTitle}>
        {Array.from({ length: huecos }, (_, i) => (
          <span key={`hueco-${i}`} className="daily-cal__gap" aria-hidden="true" />
        ))}
        {days.map((fecha) => {
          const esHoy = fecha === todayKey;
          const esSeleccionado = fecha === selected;
          const clases = [
            "daily-cal__day",
            esHoy ? "daily-cal__day--today" : "",
            esSeleccionado ? "daily-cal__day--selected" : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={fecha}
              type="button"
              className={clases}
              aria-pressed={esSeleccionado}
              aria-label={etiqueta(fecha)}
              onClick={() => onSelect(fecha)}
            >
              <span className="daily-cal__num">{dayNumber(fecha)}</span>
              <span className="daily-cal__marks" aria-hidden="true">
                {DAILY_VARIANTS.map((v) => (
                  <span key={v} className={`daily-cal__mark daily-cal__mark--${estadoDe(fecha, v)}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
