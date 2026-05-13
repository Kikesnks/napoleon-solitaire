import type { SuitMode } from "./types";

export type LeaderboardCategory = "won" | "lost";

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  suitMode: SuitMode;
  ts: number; // Date.now() — garantiza unicidad al buscar la entrada recién añadida
}

const KEYS: Record<LeaderboardCategory, string> = {
  won: "napoleon_lb_won",
  lost: "napoleon_lb_lost"
};

const MAX = 10;

export function getLeaderboard(cat: LeaderboardCategory): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEYS[cat]);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

/** True si la puntuación entraría en el top 10. */
export function qualifies(cat: LeaderboardCategory, score: number): boolean {
  const board = getLeaderboard(cat);
  if (board.length < MAX) return true;
  return score > board[board.length - 1].score;
}

/**
 * Inserta la entrada, reordena por puntuación (empate: ts más antiguo primero),
 * recorta a MAX y persiste. Devuelve la lista actualizada.
 */
export function addEntry(
  cat: LeaderboardCategory,
  entry: LeaderboardEntry
): LeaderboardEntry[] {
  const board = getLeaderboard(cat);
  const updated = [...board, entry]
    .sort((a, b) => b.score - a.score || a.ts - b.ts)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEYS[cat], JSON.stringify(updated));
  } catch {
    // localStorage lleno o no disponible — ignorar
  }
  return updated;
}
