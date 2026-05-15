// POST /api/leaderboard
// Body: SubmitPayload (ver src/game/leaderboard-types.ts)
//
// 1. Valida formato del payload.
// 2. Replica la partida en el servidor con el mismo motor de reglas.
// 3. Comprueba que score y status declarados coinciden con la simulación.
// 4. Si todo cuadra: inserta en Supabase y devuelve el top 10 actualizado.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { insertEntry, selectTop } from "../_shared/supabase";
import { createInitialState } from "../../src/game/state";
import { reduceAction } from "../../src/game/rules";
import type { Action } from "../../src/game/rules";
import {
  LEADERBOARD_MAX,
  type ErrorResponse,
  type LeaderboardEntry,
  type SubmitPayload,
  type SubmitResponse
} from "../../src/game/leaderboard-types";
import type { GameState } from "../../src/game/types";

const MAX_NAME = 30;
const MAX_ACTIONS = 5000; // cota dura para evitar payloads abusivos.

function fail(res: VercelResponse, status: number, error: string): VercelResponse {
  const body: ErrorResponse = { ok: false, error };
  return res.status(status).json(body);
}

function isValidPayload(x: unknown): x is SubmitPayload {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  if (typeof p.name !== "string" || p.name.trim().length === 0 || p.name.length > MAX_NAME)
    return false;
  if (p.category !== "won" && p.category !== "lost") return false;
  if (typeof p.score !== "number" || !Number.isFinite(p.score) || p.score < 0) return false;
  if (p.suitMode !== 2 && p.suitMode !== 4) return false;
  if (typeof p.seed !== "number" || !Number.isFinite(p.seed)) return false;
  if (!Array.isArray(p.actions) || p.actions.length > MAX_ACTIONS) return false;
  for (const a of p.actions) {
    if (!a || typeof a !== "object") return false;
    const act = a as Record<string, unknown>;
    if (act.type === "deal") continue;
    if (act.type === "move") {
      if (typeof act.from !== "string" || typeof act.to !== "string") return false;
      continue;
    }
    if (act.type === "autoPromote") {
      if (typeof act.from !== "string") return false;
      continue;
    }
    return false;
  }
  return true;
}

function replay(payload: SubmitPayload): GameState {
  let state = createInitialState({ seed: payload.seed, suitMode: payload.suitMode });
  for (const a of payload.actions) {
    state = reduceAction(state, a as Action);
  }
  return state;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");

  const payload = req.body as unknown;
  if (!isValidPayload(payload)) return fail(res, 400, "Payload inválido");

  // Replica de la partida con el mismo motor → anti-trampas.
  let simulated: GameState;
  try {
    simulated = replay(payload);
  } catch (e) {
    return fail(res, 400, "La simulación de la partida falló: acciones inválidas");
  }

  if (simulated.status !== payload.category) {
    return fail(
      res,
      400,
      `Status declarado (${payload.category}) no coincide con la simulación (${simulated.status})`
    );
  }
  if (simulated.score !== payload.score) {
    return fail(
      res,
      400,
      `Score declarado (${payload.score}) no coincide con la simulación (${simulated.score})`
    );
  }

  const now = Date.now();
  const d = new Date(now);
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;

  try {
    await insertEntry(payload.category, {
      name: payload.name.trim(),
      score: payload.score,
      suit_mode: payload.suitMode,
      date,
      ts: now
    });
    const rows = await selectTop(payload.category, LEADERBOARD_MAX);
    const entries: LeaderboardEntry[] = rows.map((r) => ({
      name: r.name,
      score: r.score,
      date: r.date,
      suitMode: r.suit_mode,
      ts: r.ts
    }));
    const body: SubmitResponse = { ok: true, entries };
    return res.status(200).json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(res, 500, msg);
  }
}
