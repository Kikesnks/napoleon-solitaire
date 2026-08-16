// ── ATADURA DEL NAPOLEÓN AL RETO DIARIO ─────────────────────────────────────
// El mecanismo vive en `src/core/daily/` y no sabe nada de este juego. Aquí se
// le dan las dos cosas concretas del Napoleón: su tabla de semillas y sus dos
// variantes de dificultad.

import { createDaily } from "../core/daily/index.js";
import { DAILY_SEEDS, type DailyVariant } from "./daily-seeds.js";
import type { SuitMode } from "./types.js";

export type { DailyResult, DailyStreak } from "../core/daily/index.js";
export type { DailyVariant } from "./daily-seeds.js";

/** El modo de palos, como variante del reto. Son dos retos distintos por día. */
export const variantOf = (suitMode: SuitMode): DailyVariant => (suitMode === 2 ? "2" : "4");

export const daily = createDaily({
  storagePrefix: "solnap.daily",
  seeds: DAILY_SEEDS
});

/** Semilla del reto de hoy para una dificultad. */
export const todaysSeed = (suitMode: SuitMode, now?: Date): number =>
  daily.seedFor(daily.todayKey(now), variantOf(suitMode));

/**
 * ¿La partida en curso es el reto de hoy?
 *
 * Se deduce comparando la semilla, sin guardar ninguna marca extra: la semilla
 * del día es determinista, así que la propia partida ya lo dice. Evita tocar el
 * estado del motor —que es territorio de las reglas— solo para llevar una
 * etiqueta.
 */
export const isTodaysChallenge = (seed: number, suitMode: SuitMode, now?: Date): boolean =>
  seed === todaysSeed(suitMode, now);
