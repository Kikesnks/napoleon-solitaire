// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Fachada del ranking: compone un backend remoto opcional con un respaldo local
// y garantiza que **nunca lanza**. Que no haya servidor es un caso normal de
// funcionamiento, no un error que el jugador deba ver.

import { createLocalLeaderboard, type LocalOptions } from "./local.js";
import { createRemoteLeaderboard } from "./remote.js";
import type { CategoryId, EntryBase, LeaderboardBackend, PayloadBase } from "./types.js";

export type { CategoryId, EntryBase, LeaderboardBackend, PayloadBase } from "./types.js";
export { createLocalLeaderboard } from "./local.js";
export { createRemoteLeaderboard } from "./remote.js";

/** De dónde salieron las entradas que se están mostrando. */
export type LeaderboardScope = "global" | "local";

export interface LeaderboardOptions<E extends EntryBase, P extends PayloadBase> {
  /**
   * URL base del backend propio, o `null` para no intentarlo siquiera. En los
   * builds de portal va en `null`: así no se dispara ni una petición fallida.
   */
  remoteBaseUrl: string | null;
  local: LocalOptions<E, P>;
  /** Cuántas entradas entran en el ranking (para calcular si una puntuación clasifica). */
  max: number;
}

export interface Leaderboard<E extends EntryBase, P extends PayloadBase> {
  /** Nunca lanza: si el remoto falla, devuelve el ranking local. */
  list(category: CategoryId): Promise<E[]>;
  /** Nunca lanza: si el remoto falla, guarda y devuelve el ranking local. */
  submit(payload: P): Promise<E[]>;
  /** Nunca lanza: ante la duda, deja pasar al jugador a introducir su nombre. */
  qualifies(category: CategoryId, score: number): Promise<boolean>;
  /** Origen de la última respuesta servida. Útil para rotular la tabla con honestidad. */
  getScope(): LeaderboardScope;
}

export function createLeaderboard<E extends EntryBase, P extends PayloadBase>(
  opts: LeaderboardOptions<E, P>
): Leaderboard<E, P> {
  const local = createLocalLeaderboard(opts.local);
  const remote: LeaderboardBackend<E, P> | null = opts.remoteBaseUrl
    ? createRemoteLeaderboard<E, P>(opts.remoteBaseUrl)
    : null;

  let scope: LeaderboardScope = remote ? "global" : "local";

  /** Intenta el remoto y, si no puede, cae al local. Silencioso por diseño. */
  async function withFallback(run: (b: LeaderboardBackend<E, P>) => Promise<E[]>): Promise<E[]> {
    if (remote) {
      try {
        const entries = await run(remote);
        scope = "global";
        return entries;
      } catch {
        // Sin conexión, backend caído o dominio ajeno (portales): seguimos en local.
        scope = "local";
      }
    }
    try {
      return await run(local);
    } catch {
      return [];
    }
  }

  return {
    list: (category) => withFallback((b) => b.list(category)),
    submit: (payload) => withFallback((b) => b.submit(payload)),

    async qualifies(category, score) {
      const entries = await withFallback((b) => b.list(category));
      if (entries.length < opts.max) return true;
      return score > entries[entries.length - 1].score;
    },

    getScope: () => scope
  };
}
