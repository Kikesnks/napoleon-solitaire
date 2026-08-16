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
 * De dónde salen las puntuaciones. **Lo decide la plataforma, no el juego**:
 * en nuestro dominio hay backend; en un portal el juego corre en un dominio
 * ajeno donde `/api/...` no existe y el ranking se queda en local.
 *
 * El Napoleón no sabe dónde está corriendo —no importa nada de `src/platform/`—
 * así que la capa de aplicación se lo dice al arrancar, con `configureLeaderboard`.
 */
let remoteBaseUrl: string | null = "/api/leaderboard";

/**
 * Conecta el ranking con el destino donde corre el juego. Lo llama `main.tsx`
 * antes de pintar nada.
 *
 * Si no se llamara, el valor por defecto es el del dominio propio. Es el
 * respaldo menos malo: en un build de portal un olvido se ve enseguida
 * —aparecen 404 y el test `T4.1` lo caza—, mientras que el defecto contrario
 * degradaría el ranking global a local sin que nadie se enterase.
 */
export function configureLeaderboard(opts: { remoteBaseUrl: string | null }): void {
  remoteBaseUrl = opts.remoteBaseUrl;
  board = null; // se reconstruye con la configuración nueva
}

let board: ReturnType<typeof createBoard> | null = null;

function createBoard() {
  return createLeaderboard<LeaderboardEntry, SubmitPayload>({
    remoteBaseUrl,
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
}

/** El ranking se construye en el primer uso, ya configurado. */
function getBoard(): ReturnType<typeof createBoard> {
  if (!board) board = createBoard();
  return board;
}

/** Top de la categoría. Nunca lanza: sin servidor devuelve el ranking local. */
export const fetchLeaderboard = (cat: LeaderboardCategory): Promise<LeaderboardEntry[]> =>
  getBoard().list(cat);

/** Envía la partida. Nunca lanza: sin servidor guarda en local y devuelve el top. */
export const submitScore = (payload: SubmitPayload): Promise<LeaderboardEntry[]> =>
  getBoard().submit(payload);

/** ¿La puntuación entra en el top? Nunca lanza. */
export const qualifies = (cat: LeaderboardCategory, score: number): Promise<boolean> =>
  getBoard().qualifies(cat, score);

/** "global" o "local", según de dónde vinieron las últimas entradas. */
export const leaderboardScope = (): "global" | "local" => getBoard().getScope();
