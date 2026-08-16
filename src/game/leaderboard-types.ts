// Tipos compartidos entre el cliente (React) y el servidor (Vercel Functions).
// No importes desde aquí nada que dependa de DOM/Node — sólo declaraciones.

import type { LoggedAction, SuitMode } from "./types.js";

export type LeaderboardCategory = "won" | "lost";

/**
 * Identificador de una tabla del ranking: desenlace **y dificultad**.
 *
 * Son cuatro tablas —`won-2`, `won-4`, `lost-2`, `lost-4`— y no dos, porque con
 * 2 palos se puntúa bastante más alto: mezclarlas premia la dificultad baja y
 * compara lo incomparable.
 *
 * **La separación llega hasta la consulta, no se hace filtrando al final.** Un
 * top 10 mezclado que se llenara de partidas de 2 palos dejaría la tabla de 4
 * vacía aunque hubiera puntuaciones de sobra.
 *
 * Viaja tal cual en `?category=` y en el cuerpo del envío; el servidor lo
 * descompone. En la base de datos NO se guarda así: allí siguen conviviendo la
 * columna `category` y la columna `suit_mode`, que es lo que permitió separar
 * las tablas sin migrar ni una fila.
 */
export type BoardId = `${LeaderboardCategory}-${2 | 4}`;

export const boardId = (category: LeaderboardCategory, suitMode: 2 | 4): BoardId =>
  `${category}-${suitMode}`;

/** Descompone un identificador de tabla. `null` si no tiene la forma esperada. */
export function parseBoardId(
  raw: unknown
): { category: LeaderboardCategory; suitMode: 2 | 4 } | null {
  if (typeof raw !== "string") return null;
  const m = /^(won|lost)-(2|4)$/.exec(raw);
  if (!m) return null;
  return {
    category: m[1] as LeaderboardCategory,
    suitMode: Number(m[2]) as 2 | 4
  };
}

/** Entrada tal y como se almacena y se devuelve al cliente. */
export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  suitMode: SuitMode;
  /** Date.now() del momento del envío — usado para resaltar la entrada nueva. */
  ts: number;
}

/**
 * Payload que el cliente envía al endpoint POST /api/leaderboard.
 * Incluye la "prueba" de la partida: seed + acciones + suitMode + status.
 * El servidor reproduce la partida con esos datos y verifica que el score
 * y el desenlace coinciden con lo declarado.
 */
export interface SubmitPayload {
  name: string;
  /**
   * La tabla a la que va: desenlace y dificultad juntos (`"won-4"`). El
   * servidor lo descompone y comprueba que **las dos mitades** coinciden con
   * la simulación: el desenlace con `status` y la dificultad con `suitMode`.
   */
  category: BoardId;
  score: number;
  suitMode: SuitMode;
  seed: number;
  actions: LoggedAction[];
}

export interface SubmitResponse {
  ok: true;
  entries: LeaderboardEntry[];
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export const LEADERBOARD_MAX = 10;
