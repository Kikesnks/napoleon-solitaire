// Cliente del leaderboard global. Habla con /api/leaderboard sobre HTTP.
// La persistencia es server-side (Supabase) — ya no usamos localStorage.

import type {
  LeaderboardCategory,
  LeaderboardEntry,
  SubmitPayload,
  SubmitResponse
} from "./leaderboard-types";

export type { LeaderboardCategory, LeaderboardEntry } from "./leaderboard-types";

const API_BASE = "/api/leaderboard";

interface ApiOk<T> {
  ok: true;
  entries?: T;
}

interface ApiErr {
  ok: false;
  error: string;
}

async function parseJson<T>(res: Response): Promise<ApiOk<T> | ApiErr> {
  try {
    return (await res.json()) as ApiOk<T> | ApiErr;
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}

/** Recupera el top 10 de la categoría. Lanza con mensaje legible si falla. */
export async function fetchLeaderboard(
  cat: LeaderboardCategory
): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/list?category=${encodeURIComponent(cat)}`);
  const body = await parseJson<LeaderboardEntry[]>(res);
  if (!res.ok || !body.ok) {
    throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
  }
  return body.entries ?? [];
}

/**
 * Envía una partida al servidor. El backend la replica con el motor de
 * reglas y verifica la puntuación antes de aceptarla. Devuelve el top 10
 * actualizado tras la inserción.
 */
export async function submitScore(payload: SubmitPayload): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await parseJson<LeaderboardEntry[]>(res)) as SubmitResponse | ApiErr;
  if (!res.ok || !body.ok) {
    throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
  }
  return body.entries;
}

/**
 * ¿La puntuación entra en el top 10 actual? Optimismo del cliente: descarga
 * el ranking y compara. El servidor también valida (vía la propia inserción
 * que es atómica + selección reordenada), así que esto es sólo UX.
 */
export async function qualifies(
  cat: LeaderboardCategory,
  score: number
): Promise<boolean> {
  const entries = await fetchLeaderboard(cat);
  if (entries.length < 10) return true;
  return score > entries[entries.length - 1].score;
}
