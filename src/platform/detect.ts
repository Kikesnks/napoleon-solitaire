// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Elige el adaptador. Hoy la señal es el destino del build; mañana serán
// además señales de tiempo de ejecución (SDK del portal presente, Capacitor…).
//
// Se separa `detectPlatformId()` de la creación para poder probar la decisión
// sin construir nada.

import type { PlatformId } from "./types.js";

/**
 * Destino del build. Se lee con un cast en vez de con los tipos de Vite para
 * que `tsc --noEmit` y los scripts de test funcionen tal cual, fuera del
 * empaquetador.
 */
function buildTarget(): string {
  return (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_TARGET ??
    "web"
  );
}

/**
 * Dónde estamos corriendo.
 *
 * Orden de las señales, de más fiable a menos:
 *  1. El destino del build (`VITE_TARGET=portal`), que es una decisión nuestra.
 *  2. *(pendiente)* SDK del portal presente en `window`, para distinguir
 *     CrazyGames de GameDistribution dentro de un mismo build de portal.
 *  3. *(pendiente)* Capacitor, para la app de Android.
 */
export function detectPlatformId(): PlatformId {
  if (buildTarget() === "portal") return "portal";
  return "web";
}
