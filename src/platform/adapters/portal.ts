// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Portal genérico (CrazyGames, GameDistribution, Y8… en Basic Launch, sin SDK).
//
// El juego corre en el dominio del portal, donde nuestro backend sencillamente
// no existe: `remoteBaseUrl` va en `null` para que no se dispare ni una
// petición fallida. El ranking se queda en local, que es la decisión de alcance
// tomada para la subida.
//
// De este adaptador saldrán después los específicos de cada portal, cuando haya
// un SDK real que integrar y una invitación a Full Launch que lo justifique.

import type { Platform } from "../types.js";

export function createPortalPlatform(): Platform {
  return {
    id: "portal",

    async init() {
      // Sin SDK todavía.
    },

    gameplayStart() {},
    gameplayStop() {},

    ads: {
      async interstitial() {
        // En Basic Launch la monetización está desactivada.
      },
      async rewarded() {
        return "unavailable";
      }
    },

    leaderboard: { remoteBaseUrl: null },

    analytics: {
      track() {
        // Nunca un tracker propio desde el dominio de un portal: sería una
        // petición a un tercero y rompería la promesa de privacidad. Las
        // métricas que valen aquí son las del panel del portal.
      }
    },

    capabilities: {
      rewardedAds: false,
      interstitialAds: false,
      externalApi: false,
      purchases: false,
      globalLeaderboard: false
    }
  };
}
