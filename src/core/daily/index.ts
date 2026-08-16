// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Reto diario: una partida idéntica para todos cada día. No sabe nada de las
// reglas de ningún solitario — solo reparte semillas por fecha, lleva la racha
// y guarda el resultado del día. Vale igual para el siguiente juego.
//
// Dos piezas encajan aquí:
//   · La TABLA DE SEMILLAS, que aporta el juego. Es un archivo de datos, y es
//     el contrato con el solver: cuando exista, escribirá en esa tabla sin que
//     esta capa ni la interfaz se enteren.
//   · La derivación por fecha, que cubre cualquier día que no esté en la tabla.
//     Así el reto nunca falta, aunque nadie haya rellenado nada.
//
// Aviso deliberado: **no se garantiza que el reparto del día tenga solución**
// mientras la tabla no esté validada. Por eso la interfaz no lo promete.

import { readPref, writePref } from "../storage/prefs.js";

/** Almacenamiento inyectable: por defecto el del navegador, que nunca lanza. */
export interface DailyStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Resultado guardado de un reto. Uno por fecha y variante: el mejor. */
export interface DailyResult {
  date: string;
  variant: string;
  score: number;
  won: boolean;
  ts: number;
}

export interface DailyStreak {
  /** Días seguidos jugando. Ya cuenta rota si se saltó un día. */
  current: number;
  /** La mejor racha conseguida. */
  best: number;
  /** Último día jugado, o `null` si nunca. */
  last: string | null;
  /** ¿Ya se ha jugado el reto de hoy? */
  playedToday: boolean;
}

export interface DailyOptions {
  /** Prefijo de las claves de almacenamiento, p. ej. `"solnap.daily"`. */
  storagePrefix: string;
  /** Tabla `fecha → variante → semilla`, la que aporta el juego. */
  seeds?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  storage?: DailyStorage;
  /** Cuántos días de resultados se conservan (por no crecer sin fin). */
  keepDays?: number;
}

export interface Daily {
  /** Fecha de hoy en horario **local** del jugador, `YYYY-MM-DD`. */
  todayKey(now?: Date): string;
  /** Semilla del reto: la de la tabla si está, y si no una derivada de la fecha. */
  seedFor(date: string, variant: string): number;
  /** ¿La semilla viene de la tabla validada o es derivada? */
  isFromTable(date: string, variant: string): boolean;
  /** Estado de la racha, ya calculado para el día de hoy. */
  streak(now?: Date): DailyStreak;
  /** Marca el reto de hoy como jugado y devuelve la racha resultante. */
  markPlayed(date: string): DailyStreak;
  /** Guarda el resultado del día. Se queda con el mejor de cada variante. */
  recordResult(r: Omit<DailyResult, "ts">): void;
  /** Resultados guardados de una fecha (las dos variantes). */
  resultsOf(date: string): DailyResult[];
}

const DEFAULT_STORAGE: DailyStorage = { get: readPref, set: writePref };

/** Fecha local en `YYYY-MM-DD`. Local y no UTC: la racha es del jugador. */
function keyOf(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * El día anterior a una fecha. Se construye a mediodía a propósito: sumar o
 * restar 24 horas se tuerce en los cambios de hora, y una racha no puede
 * romperse porque el país haya adelantado el reloj.
 */
function previousKey(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const prev = new Date(y, m - 1, d, 12);
  prev.setDate(prev.getDate() - 1);
  return keyOf(prev);
}

/**
 * Semilla derivada de la fecha (FNV-1a). Determinista: el mismo día y la misma
 * variante dan siempre el mismo reparto, en cualquier dispositivo y sin
 * necesidad de servidor.
 *
 * Se exporta porque el generador de semillas la usa como primer candidato: si
 * el reparto natural del día resulta ganable, la tabla acaba confirmando lo que
 * el jugador habría tenido igualmente.
 */
export function deriveSeed(date: string, variant: string): number {
  let h = 0x811c9dc5;
  const texto = `${date}|${variant}`;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 lo deja positivo; el motor espera una semilla entera sin signo.
  return h >>> 0;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Dato corrupto o de una versión anterior: se empieza de cero sin avisar.
    return fallback;
  }
}

export function createDaily(opts: DailyOptions): Daily {
  const storage = opts.storage ?? DEFAULT_STORAGE;
  const seeds = opts.seeds ?? {};
  const keepDays = opts.keepDays ?? 60;
  const KEY_STREAK = `${opts.storagePrefix}.streak`;
  const KEY_RESULTS = `${opts.storagePrefix}.results`;

  type Stored = { current: number; best: number; last: string | null };

  // El almacenamiento se inyecta, así que puede ser cualquiera: el del
  // navegador —que ya absorbe sus errores—, el de un portal o uno que reviente
  // en modo privado estricto. Aquí se asume lo peor: **nada de esto lanza
  // nunca**. Quedarse sin racha es un incordio; que el juego no arranque, no.
  function safeGet(key: string): string | null {
    try {
      return storage.get(key);
    } catch {
      return null;
    }
  }

  function safeSet(key: string, value: string): void {
    try {
      storage.set(key, value);
    } catch {
      // Se juega igual, simplemente sin recordar nada.
    }
  }

  function readStreak(): Stored {
    return parseJson<Stored>(safeGet(KEY_STREAK), { current: 0, best: 0, last: null });
  }

  function readResults(): DailyResult[] {
    const all = parseJson<DailyResult[]>(safeGet(KEY_RESULTS), []);
    return Array.isArray(all) ? all : [];
  }

  return {
    todayKey: (now = new Date()) => keyOf(now),

    seedFor: (date, variant) => seeds[date]?.[variant] ?? deriveSeed(date, variant),

    isFromTable: (date, variant) => seeds[date]?.[variant] !== undefined,

    streak(now = new Date()) {
      const s = readStreak();
      const hoy = keyOf(now);
      // La racha guardada sigue viva solo si se jugó hoy o ayer. Si el último
      // día es más antiguo, ya está rota y así hay que enseñarla.
      const viva = s.last === hoy || s.last === previousKey(hoy);
      return {
        current: viva ? s.current : 0,
        best: s.best,
        last: s.last,
        playedToday: s.last === hoy
      };
    },

    markPlayed(date) {
      const s = readStreak();
      let current: number;
      if (s.last === date) current = s.current; // ya contaba: jugar dos veces no suma
      else if (s.last === previousKey(date)) current = s.current + 1;
      else current = 1;

      const actualizado: Stored = {
        current,
        best: Math.max(s.best, current),
        last: date
      };
      safeSet(KEY_STREAK, JSON.stringify(actualizado));
      return { ...actualizado, playedToday: true };
    },

    recordResult(r) {
      const todos = readResults();
      const previo = todos.find((x) => x.date === r.date && x.variant === r.variant);
      // Se conserva el mejor intento del día, y ganar no se pierde nunca.
      const mejor: DailyResult =
        previo && previo.score >= r.score
          ? { ...previo, won: previo.won || r.won }
          : { ...r, won: (previo?.won ?? false) || r.won, ts: Date.now() };

      const resto = todos.filter((x) => !(x.date === r.date && x.variant === r.variant));
      const limite = [...resto, mejor]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, keepDays * 2);
      safeSet(KEY_RESULTS, JSON.stringify(limite));
    },

    resultsOf: (date) => readResults().filter((r) => r.date === date)
  };
}
