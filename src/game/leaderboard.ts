// ── ATADURA DEL NAPOLEÓN AL MECANISMO COMÚN ─────────────────────────────────
// El mecanismo del ranking vive en `src/core/leaderboard/` y no sabe nada de
// este juego. Aquí sólo se le dan los tipos concretos del Napoleón (la "prueba"
// de la partida: semilla + acciones + modo de palos) y se decide de dónde salen
// los datos según dónde se esté ejecutando el juego.

import { createLeaderboard } from "../core/leaderboard/index.js";
import { LEADERBOARD_MAX } from "./leaderboard-types.js";
import type {
  LeaderboardCategory,
  LeaderboardEntry,
  SubmitPayload
} from "./leaderboard-types.js";

export type { LeaderboardCategory, LeaderboardEntry } from "./leaderboard-types.js";

/**
 * Destino del build. `portal` (CrazyGames, GameDistribution, Y8…) desactiva el
 * ranking global: el juego corre en el dominio del portal, donde nuestro
 * backend no existe. Se lee así, sin depender de los tipos de Vite, para que
 * `tsc --noEmit` siga funcionando tal cual.
 */
const TARGET =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_TARGET ??
  "web";

const REMOTE_BASE = TARGET === "portal" ? null : "/api/leaderboard";

const board = createLeaderboard<LeaderboardEntry, SubmitPayload>({
  remoteBaseUrl: REMOTE_BASE,
  max: LEADERBOARD_MAX,
  local: {
    storageKey: "solnap.lb",
    max: LEADERBOARD_MAX,
    toEntry: (payload) => ({
      name: payload.name,
      score: payload.score,
      suitMode: payload.suitMode,
      date: new Date().toISOString().slice(0, 10),
      ts: Date.now()
    })
  }
});

/** Top de la categoría. Nunca lanza: sin servidor devuelve el ranking local. */
export const fetchLeaderboard = (cat: LeaderboardCategory): Promise<LeaderboardEntry[]> =>
  board.list(cat);

/** Envía la partida. Nunca lanza: sin servidor guarda en local y devuelve el top. */
export const submitScore = (payload: SubmitPayload): Promise<LeaderboardEntry[]> =>
  board.submit(payload);

/** ¿La puntuación entra en el top? Nunca lanza. */
export const qualifies = (cat: LeaderboardCategory, score: number): Promise<boolean> =>
  board.qualifies(cat, score);

/** "global" o "local", según de dónde vinieron las últimas entradas. */
export const leaderboardScope = (): "global" | "local" => board.getScope();
