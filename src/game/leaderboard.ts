// ── ATADURA DEL NAPOLEÓN AL MECANISMO COMÚN ─────────────────────────────────
// El mecanismo del ranking vive en `src/core/leaderboard/` y no sabe nada de
// este juego. Aquí sólo se le dan los tipos concretos del Napoleón (la "prueba"
// de la partida: semilla + acciones + modo de palos) y se decide de dónde salen
// los datos según dónde se esté ejecutando el juego.

import { createLeaderboard } from "../core/leaderboard/index.js";
import { boardId, LEADERBOARD_MAX } from "./leaderboard-types.js";
import type {
  LeaderboardCategory,
  LeaderboardEntry,
  SubmitPayload
} from "./leaderboard-types.js";
import type { SuitMode } from "./types.js";

export type { BoardId, LeaderboardCategory, LeaderboardEntry } from "./leaderboard-types.js";
export { boardId } from "./leaderboard-types.js";

const STORAGE_PREFIX = "solnap.lb";

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

/**
 * Reparte el ranking local que quedó de cuando 2 y 4 palos compartían tabla.
 *
 * Las claves pasan de `solnap.lb.won` a `solnap.lb.won-2` y `solnap.lb.won-4`.
 * Sin esto, quien ya tuviera puntuaciones guardadas —y en un portal el ranking
 * local es el único que hay— las vería desaparecer de golpe. Cada entrada lleva
 * su `suitMode` desde el principio, así que repartirlas es exacto.
 *
 * Se ejecuta una vez y deja marca. Nunca lanza: si el almacenamiento no está
 * disponible, no haber podido migrar no puede impedir jugar.
 */
function migrarRankingLocal(): void {
  const HECHA = `${STORAGE_PREFIX}.split`;
  try {
    const ls = window.localStorage;
    if (ls.getItem(HECHA)) return;
    for (const categoria of ["won", "lost"] as const) {
      const viejo = ls.getItem(`${STORAGE_PREFIX}.${categoria}`);
      if (!viejo) continue;
      const parsed: unknown = JSON.parse(viejo);
      if (!Array.isArray(parsed)) continue;
      const entradas = parsed as LeaderboardEntry[];
      for (const suits of [2, 4] as const) {
        const suyas = entradas
          .filter((e) => e.suitMode === suits)
          .sort((a, b) => b.score - a.score || a.ts - b.ts)
          .slice(0, LEADERBOARD_MAX);
        if (suyas.length > 0) {
          ls.setItem(`${STORAGE_PREFIX}.${boardId(categoria, suits)}`, JSON.stringify(suyas));
        }
      }
      // La lista vieja se deja donde está: no ocupa nada y, si algo saliera
      // mal, todavía se puede recuperar a mano.
    }
    ls.setItem(HECHA, "1");
  } catch {
    // Modo privado, cuota llena o dato corrupto: se sigue sin migrar.
  }
}

function createBoard() {
  migrarRankingLocal();
  return createLeaderboard<LeaderboardEntry, SubmitPayload>({
    remoteBaseUrl,
    max: LEADERBOARD_MAX,
    local: {
      storageKey: STORAGE_PREFIX,
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

/**
 * Top de una tabla: desenlace y dificultad. Nunca lanza; sin servidor devuelve
 * el ranking local.
 */
export const fetchLeaderboard = (
  cat: LeaderboardCategory,
  suitMode: SuitMode
): Promise<LeaderboardEntry[]> => getBoard().list(boardId(cat, suitMode));

/** Envía la partida. Nunca lanza: sin servidor guarda en local y devuelve el top. */
export const submitScore = (payload: SubmitPayload): Promise<LeaderboardEntry[]> =>
  getBoard().submit(payload);

/**
 * ¿La puntuación entra en el top de SU tabla? Nunca lanza.
 *
 * La dificultad no es opcional: comparar una partida de 4 palos contra el top
 * de 2 palos haría que casi nunca clasificara, y al revés que clasificara
 * siempre. Es el mismo error que hacía falsa la tabla mezclada.
 */
export const qualifies = (
  cat: LeaderboardCategory,
  score: number,
  suitMode: SuitMode
): Promise<boolean> => getBoard().qualifies(boardId(cat, suitMode), score);

/**
 * "global" o "local", según de dónde vinieron las últimas entradas.
 *
 * Sirve para rotular la tabla con honestidad: en un portal el ranking es el del
 * dispositivo, y una tabla que se llama "Liga de Campeones" con tres nombres
 * que son todos tuyos tiene que decirlo.
 */
export const leaderboardScope = (): "global" | "local" => getBoard().getScope();
