// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Punto de entrada de la capa de plataforma. El resto de la aplicación pide
// aquí la plataforma y pregunta por CAPACIDADES, nunca por identidad.

import { createPortalPlatform } from "./adapters/portal.js";
import { createWebPlatform } from "./adapters/web.js";
import { detectPlatformId } from "./detect.js";
import type { Platform, PlatformId } from "./types.js";

export type {
  Platform,
  PlatformCapabilities,
  PlatformId,
  RewardResult
} from "./types.js";
export { detectPlatformId } from "./detect.js";

/** Construye el adaptador correspondiente a un destino concreto. */
export function createPlatform(id: PlatformId): Platform {
  switch (id) {
    case "portal":
    // Los tres portales comparten de momento el adaptador genérico: sin SDK,
    // sin anuncios y con ranking local. Se separarán cuando haya SDK real.
    case "crazygames":
    case "gamedistribution":
    case "y8":
      return createPortalPlatform();

    case "capacitor":
    // Pendiente (Fase 3). Hasta entonces se comporta como la web: mismo
    // backend, con la diferencia de que allí hará falta URL absoluta y CORS.
    case "web":
    default:
      return createWebPlatform();
  }
}

let actual: Platform | null = null;

/** La plataforma de esta ejecución. Se detecta una vez y se reutiliza. */
export function getPlatform(): Platform {
  if (!actual) actual = createPlatform(detectPlatformId());
  return actual;
}
