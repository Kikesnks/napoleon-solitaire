// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Ranking local en localStorage. Es el respaldo cuando no hay servidor: en los
// portales (CrazyGames y compañía) el juego corre en el dominio del portal, así
// que no existe backend propio al que llamar.
//
// Cumple el principio rector nº 3 (cero recopilación de datos): lo que se
// guarda no sale nunca del dispositivo del jugador.

import type { CategoryId, EntryBase, LeaderboardBackend, PayloadBase } from "./types.js";

export interface LocalOptions<E extends EntryBase, P extends PayloadBase> {
  /** Prefijo de las claves de localStorage, p. ej. "solnap.lb". */
  storageKey: string;
  /** Cuántas entradas se conservan por categoría. */
  max: number;
  /** Convierte un envío en la entrada que se almacenará. */
  toEntry(payload: P): E;
}

function keyFor(prefix: string, category: CategoryId): string {
  return `${prefix}.${category}`;
}

function read<E>(key: string): E[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as E[]) : [];
  } catch {
    // Modo privado, cuota llena o JSON corrupto: un ranking vacío es una
    // respuesta perfectamente válida. Nunca es motivo para romper la partida.
    return [];
  }
}

function write<E>(key: string, entries: E[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // ignorar: no poder guardar el ranking no puede impedir jugar
  }
}

export function createLocalLeaderboard<E extends EntryBase, P extends PayloadBase>(
  opts: LocalOptions<E, P>
): LeaderboardBackend<E, P> {
  return {
    kind: "local",

    async list(category) {
      return read<E>(keyFor(opts.storageKey, category));
    },

    async submit(payload) {
      const key = keyFor(opts.storageKey, payload.category);
      const entries = read<E>(key);
      entries.push(opts.toEntry(payload));
      entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
      const top = entries.slice(0, opts.max);
      write(key, top);
      return top;
    }
  };
}
