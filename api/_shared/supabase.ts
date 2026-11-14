// Cliente Supabase minimalista usando fetch (sin SDK).
// Evita añadir dependencias al bundle. Sólo cubrimos los dos endpoints
// que necesitamos: SELECT del top N y INSERT validado.

import type { LeaderboardCategory } from "../../src/game/leaderboard-types.js";

/**
 * Qué juego es este backend. La tabla `leaderboard` la comparten varios
 * solitarios y la columna `game` es lo único que separa sus puntuaciones.
 *
 * Es una constante del servidor y se define SOLO aquí: `selectTop` la pone
 * siempre en el filtro e `insertEntry` la manda siempre. **Nunca se lee de la
 * petición**: si viniera del cliente, cualquiera podría escribir en el ranking
 * de otro juego con una partida validada por las reglas de este.
 */
const GAME = "napoleon";

export interface DbEntry {
  name: string;
  score: number;
  suit_mode: 2 | 4;
  date: string;
  ts: number;
}

interface Env {
  url: string;
  serviceKey: string;
}

function readEnv(): Env {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return { url: url.replace(/\/$/, ""), serviceKey };
}

function headers(env: Env, extra?: Record<string, string>) {
  return {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

/**
 * Top de una tabla. El filtro por dificultad va **en la consulta**, no después:
 * pedir el top mezclado y quedarse con los de 4 palos devolvería una tabla
 * vacía en cuanto los diez primeros fueran de 2 palos.
 *
 * La base de datos no cambió para esto: `category` y `suit_mode` ya eran dos
 * columnas, así que separar las tablas no ha movido ni una fila.
 */
export async function selectTop(
  category: LeaderboardCategory,
  suitMode: 2 | 4,
  limit: number
): Promise<DbEntry[]> {
  const env = readEnv();
  const params = new URLSearchParams({
    select: "name,score,suit_mode,date,ts",
    game: `eq.${GAME}`,
    category: `eq.${category}`,
    suit_mode: `eq.${suitMode}`,
    order: "score.desc,ts.asc",
    limit: String(limit)
  });
  const res = await fetch(`${env.url}/rest/v1/leaderboard?${params}`, {
    headers: headers(env)
  });
  if (!res.ok) {
    throw new Error(`Supabase SELECT ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as DbEntry[];
}

export async function insertEntry(
  category: LeaderboardCategory,
  entry: DbEntry
): Promise<void> {
  const env = readEnv();
  const res = await fetch(`${env.url}/rest/v1/leaderboard`, {
    method: "POST",
    headers: headers(env, { Prefer: "return=minimal" }),
    // `game` va al final para que nada de lo anterior pueda pisarlo.
    body: JSON.stringify({ category, ...entry, game: GAME })
  });
  if (!res.ok) {
    throw new Error(`Supabase INSERT ${res.status}: ${await res.text()}`);
  }
}
