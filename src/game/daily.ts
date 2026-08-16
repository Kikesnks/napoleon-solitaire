// ── ATADURA DEL NAPOLEÓN AL RETO DIARIO ─────────────────────────────────────
// El mecanismo vive en `src/core/daily/` y no sabe nada de este juego. Aquí se
// le dan las dos cosas concretas del Napoleón: su tabla de semillas y sus dos
// variantes de dificultad.

import { createDaily } from "../core/daily/index.js";
import { DAILY_SEEDS, type DailyVariant } from "./daily-seeds.js";
import type { SuitMode } from "./types.js";

export type { DailyCollection, DailyReplay, DailyResult, DailyStreak } from "../core/daily/index.js";
export type { DailyVariant } from "./daily-seeds.js";

/** El modo de palos, como variante del reto. Son dos retos distintos por día. */
export const variantOf = (suitMode: SuitMode): DailyVariant => (suitMode === 2 ? "2" : "4");

/** Los dos retos que hay cada día. Es lo que hace que "12 de 16" tenga sentido. */
export const DAILY_VARIANTS: readonly DailyVariant[] = ["2", "4"];

export const daily = createDaily({
  storagePrefix: "solnap.daily",
  seeds: DAILY_SEEDS,
  variants: DAILY_VARIANTS
});

/** Semilla del reto de un día concreto para una dificultad. */
export const seedForDate = (date: string, suitMode: SuitMode): number =>
  daily.seedFor(date, variantOf(suitMode));

/** Semilla del reto de hoy para una dificultad. */
export const todaysSeed = (suitMode: SuitMode, now?: Date): number =>
  seedForDate(daily.todayKey(now), suitMode);

/**
 * ¿De qué día es el reto que se está jugando? `null` si es una partida libre.
 *
 * Se deduce comparando la semilla contra la de cada día jugable, sin guardar
 * ninguna marca extra: las semillas son deterministas, así que la propia
 * partida ya lo dice. Evita tocar el estado del motor —que es territorio de las
 * reglas— solo para llevar una etiqueta.
 *
 * Solo se miran los días jugables, así que una partida libre que por un azar
 * astronómico coincidiera con la semilla de un día futuro no contaría como
 * reto: **el futuro no se abre por ninguna vía**.
 */
export function challengeDateOf(seed: number, suitMode: SuitMode, now?: Date): string | null {
  const variante = variantOf(suitMode);
  return daily.playableKeys(now).find((fecha) => daily.seedFor(fecha, variante) === seed) ?? null;
}

/** ¿La partida en curso es el reto de hoy? */
export const isTodaysChallenge = (seed: number, suitMode: SuitMode, now?: Date): boolean =>
  seed === todaysSeed(suitMode, now);
