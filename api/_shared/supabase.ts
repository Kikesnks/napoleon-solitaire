// Cliente Supabase minimalista usando fetch (sin SDK).
// Evita añadir dependencias al bundle. Sólo cubrimos los dos endpoints
// que necesitamos: SELECT del top N y INSERT validado.

import type { LeaderboardCategory } from "../../src/game/leaderboard-types";

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

export async function selectTop(
  category: LeaderboardCategory,
  limit: number
): Promise<DbEntry[]> {
  const env = readEnv();
  const params = new URLSearchParams({
    select: "name,score,suit_mode,date,ts",
    category: `eq.${category}`,
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
    body: JSON.stringify({ category, ...entry })
  });
  if (!res.ok) {
    throw new Error(`Supabase INSERT ${res.status}: ${await res.text()}`);
  }
}
