// Tipos compartidos entre el cliente (React) y el servidor (Vercel Functions).
// No importes desde aquí nada que dependa de DOM/Node — sólo declaraciones.

import type { LoggedAction, SuitMode } from "./types";

export type LeaderboardCategory = "won" | "lost";

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
  category: LeaderboardCategory;
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
