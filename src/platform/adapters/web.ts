// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Nuestro dominio (Vercel). Es el comportamiento de siempre, ahora escrito
// como adaptador: backend propio disponible, ranking global y ningún anuncio.

import type { Platform } from "../types.js";

/** Ruta de nuestras funciones serverless de ranking. */
const REMOTE_BASE = "/api/leaderboard";

export function createWebPlatform(): Platform {
  return {
    id: "web",

    async init() {
      // No hay SDK que arrancar.
    },

    gameplayStart() {},
    gameplayStop() {},

    ads: {
      async interstitial() {
        // Sin publicidad en el dominio propio.
      },
      async rewarded() {
        return "unavailable";
      }
    },

    leaderboard: { remoteBaseUrl: REMOTE_BASE },

    analytics: {
      track() {
        // Todavía no hay analítica. Cuando la haya será sin cookies y sin datos
        // personales (principio rector nº 3), y solo en el dominio propio.
      }
    },

    capabilities: {
      rewardedAds: false,
      interstitialAds: false,
      externalApi: true,
      purchases: false,
      globalLeaderboard: true
    }
  };
}
