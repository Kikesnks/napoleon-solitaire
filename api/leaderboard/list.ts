// GET /api/leaderboard?category=won|lost
// Devuelve el top 10 de la categoría solicitada desde Supabase.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { selectTop } from "../_shared/supabase.js";
import { LEADERBOARD_MAX } from "../../src/game/leaderboard-types.js";
import type {
  ErrorResponse,
  LeaderboardCategory,
  LeaderboardEntry
} from "../../src/game/leaderboard-types";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  if (req.method !== "GET") {
    const err: ErrorResponse = { ok: false, error: "Method not allowed" };
    return res.status(405).json(err);
  }

  const cat = req.query.category;
  if (cat !== "won" && cat !== "lost") {
    const err: ErrorResponse = {
      ok: false,
      error: "category debe ser 'won' o 'lost'"
    };
    return res.status(400).json(err);
  }

  try {
    const rows = await selectTop(cat as LeaderboardCategory, LEADERBOARD_MAX);
    const entries: LeaderboardEntry[] = rows.map((r) => ({
      name: r.name,
      score: r.score,
      date: r.date,
      suitMode: r.suit_mode,
      ts: r.ts
    }));
    // Cache 30s en el edge para reducir lecturas al pico.
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json({ ok: true, entries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const err: ErrorResponse = { ok: false, error: msg };
    return res.status(500).json(err);
  }
}
