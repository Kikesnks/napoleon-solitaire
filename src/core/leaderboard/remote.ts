// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Cliente HTTP del ranking global. La URL base la aporta quien lo instancia, no
// está escrita aquí: así el mismo código sirve para la web propia (ruta
// relativa) y para la app Android empaquetada (URL absoluta + CORS).

import type { CategoryId, EntryBase, LeaderboardBackend, PayloadBase } from "./types.js";

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

export function createRemoteLeaderboard<E extends EntryBase, P extends PayloadBase>(
  baseUrl: string
): LeaderboardBackend<E, P> {
  return {
    kind: "remote",

    async list(category: CategoryId) {
      const res = await fetch(`${baseUrl}/list?category=${encodeURIComponent(category)}`);
      const body = await parseJson<E[]>(res);
      if (!res.ok || !body.ok) {
        throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
      }
      return body.entries ?? [];
    },

    /**
     * Envía la partida. El backend la replica con el mismo motor de reglas y
     * verifica la puntuación antes de aceptarla; devuelve el top actualizado.
     */
    async submit(payload: P) {
      const res = await fetch(`${baseUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await parseJson<E[]>(res);
      if (!res.ok || !body.ok) {
        throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
      }
      return body.entries ?? [];
    }
  };
}
