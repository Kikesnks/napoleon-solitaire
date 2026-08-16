// GET /api/leaderboard?category=won-2|won-4|lost-2|lost-4
// Devuelve el top 10 de esa tabla desde Supabase.
//
// La categoría trae el desenlace Y la dificultad, porque son cuatro tablas
// separadas: con 2 palos se puntúa más alto y mezclarlas premia la dificultad
// baja. Aquí se descompone y las dos mitades van al filtro de la consulta.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { selectTop } from "../_shared/supabase.js";
import { LEADERBOARD_MAX, parseBoardId } from "../../src/game/leaderboard-types.js";
import type { ErrorResponse, LeaderboardEntry } from "../../src/game/leaderboard-types";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  if (req.method !== "GET") {
    const err: ErrorResponse = { ok: false, error: "Method not allowed" };
    return res.status(405).json(err);
  }

  const tabla = parseBoardId(req.query.category);
  if (!tabla) {
    const err: ErrorResponse = {
      ok: false,
      error: "category debe ser 'won-2', 'won-4', 'lost-2' o 'lost-4'"
    };
    return res.status(400).json(err);
  }

  try {
    const rows = await selectTop(tabla.category, tabla.suitMode, LEADERBOARD_MAX);
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
