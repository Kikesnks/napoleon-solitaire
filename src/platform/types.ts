// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// El contrato con el mundo exterior. Aísla DÓNDE corre el juego (nuestro
// dominio, un portal, la app de Android) de QUÉ hace el juego.
//
// Regla que no se rompe: este archivo no sabe que existe el Napoleón, y
// `src/game/` no importa nada de aquí. La conexión entre ambos la hace la capa
// de aplicación (`main.tsx`), que es la única que conoce a los dos lados.

/** Cada destino donde puede correr el mismo juego. */
export type PlatformId =
  | "web" // nuestro dominio en Vercel
  | "portal" // portal genérico: dominio ajeno, sin backend propio
  | "crazygames"
  | "gamedistribution"
  | "y8"
  | "capacitor"; // Android

/**
 * Lo que el juego puede preguntar ANTES de ofrecer algo.
 *
 * El objetivo de esto es que la interfaz nunca pregunte "¿estoy en
 * CrazyGames?", sino "¿hay anuncio recompensado?". Así, añadir un portal nuevo
 * es escribir un adaptador y no revisar la interfaz entera.
 */
export interface PlatformCapabilities {
  /** ¿Se puede ofrecer una recompensa a cambio de ver un vídeo? */
  rewardedAds: boolean;
  /** ¿Se pueden mostrar anuncios entre partidas? */
  interstitialAds: boolean;
  /** ¿Podemos llamar a nuestro propio backend desde aquí? */
  externalApi: boolean;
  /** ¿Hay compras integradas? */
  purchases: boolean;
  /** ¿El ranking que se muestra es global, o solo de este dispositivo? */
  globalLeaderboard: boolean;
}

/** Resultado de ofrecer un vídeo recompensado. */
export type RewardResult = "granted" | "dismissed" | "unavailable";

export interface Platform {
  readonly id: PlatformId;

  /** Arranque del SDK del destino. En web y en portal genérico no hace nada. */
  init(): Promise<void>;

  // ── Ciclo de partida ──────────────────────────────────────────────────────
  // Los portales lo exigen: es como miden el tiempo de juego real y como
  // deciden cuándo pueden interrumpir con un anuncio. Fuera de un portal son
  // dos llamadas que no hacen nada.
  gameplayStart(): void;
  gameplayStop(): void;

  readonly ads: {
    interstitial(): Promise<void>;
    rewarded(): Promise<RewardResult>;
  };

  readonly leaderboard: {
    /**
     * URL base de nuestro backend de puntuaciones, o `null` si desde aquí no
     * se puede llamar (portales) y el ranking debe quedarse en local.
     *
     * Esta es la línea que antes estaba escrita a fuego dentro del juego: la
     * aporta la plataforma, no el Napoleón.
     */
     readonly remoteBaseUrl: string | null;
  };

  readonly analytics: {
    track(event: string, props?: Record<string, unknown>): void;
  };

  readonly capabilities: PlatformCapabilities;
}
