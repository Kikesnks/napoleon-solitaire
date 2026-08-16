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

/**
 * La partida que produjo el mejor resultado guardado de un reto: semilla y
 * registro de acciones, lo justo para **reproducirla**.
 *
 * Se guarda aparte de los resultados, en su propia clave, y por un motivo
 * concreto: ocupa dos órdenes de magnitud más. Si el almacenamiento se llena,
 * lo que se pierde es la prueba —un lujo para acreditar puntuaciones más
 * adelante—, nunca el progreso que el jugador ve en el calendario.
 *
 * Las acciones son `unknown` a propósito: esta capa no sabe qué es una jugada
 * en ningún solitario, solo las guarda y las devuelve tal cual.
 */
export interface DailyReplay {
  date: string;
  variant: string;
  seed: number;
  actions: readonly unknown[];
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
  /**
   * Con qué dificultades se puede jugar el reto, p. ej. `["2", "4"]`. Sirve
   * para descartar resultados de una variante que ya no existe. Si no se pasa,
   * se cuentan todos.
   */
  variants?: readonly string[];
}

/**
 * El avance del mes: **un reto por día**, y el total son los días que tiene el
 * mes —28, 29, 30 o 31—.
 *
 * Es una meta mensual, así que el total **incluye los días que aún no han
 * llegado**: enseñar "2 de 31" el día 2 es lo que le da al jugador algo hacia
 * lo que ir. Contar solo los días transcurridos daría "2 de 2", que no invita
 * a nada. Esto no abre ningún reto futuro: quién se puede jugar lo sigue
 * decidiendo `playableKeys`.
 *
 * Un día cuenta como hecho **cuando se ha terminado su reto en cualquiera de
 * las dificultades**. Hacerlo en las dos no suma dos: el reto del día es uno y
 * la dificultad es cómo se afronta.
 */
export interface DailyCollection {
  done: number;
  total: number;
}

export interface Daily {
  /** Fecha de hoy en horario **local** del jugador, `YYYY-MM-DD`. */
  todayKey(now?: Date): string;
  /** Semilla del reto: la de la tabla si está, y si no una derivada de la fecha. */
  seedFor(date: string, variant: string): number;
  /** ¿La semilla viene de la tabla validada o es derivada? */
  isFromTable(date: string, variant: string): boolean;
  /**
   * Días que se pueden jugar: del **día 1 del mes en curso al día de hoy**,
   * ambos incluidos. Nunca un día futuro y nunca un mes anterior.
   */
  playableKeys(now?: Date): string[];
  /** ¿Ese día se puede jugar? La misma regla que `playableKeys`, para uno solo. */
  isPlayable(date: string, now?: Date): boolean;
  /** Estado de la racha, ya calculado para el día de hoy. */
  streak(now?: Date): DailyStreak;
  /** Marca el reto de hoy como jugado y devuelve la racha resultante. */
  markPlayed(date: string): DailyStreak;
  /**
   * Guarda el resultado de un reto. Se queda con el mejor de cada variante.
   *
   * Si se le pasan `seed` y `actions`, guarda además la partida para poder
   * reproducirla después. La partida guardada es **siempre la que produjo la
   * puntuación guardada**: si el intento nuevo no mejora, no se toca ninguna
   * de las dos cosas; si mejora, se cambian las dos a la vez.
   */
  recordResult(r: Omit<DailyResult, "ts"> & { seed?: number; actions?: readonly unknown[] }): void;
  /** Resultados guardados de una fecha (las dos variantes). */
  resultsOf(date: string): DailyResult[];
  /** La partida que produjo el mejor resultado de un reto, si se guardó. */
  replayOf(date: string, variant: string): DailyReplay | null;
  /** Cuántos retos del mes en curso lleva hechos, de cuántos hay disponibles. */
  collection(now?: Date): DailyCollection;
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
  const variants = opts.variants ?? [];
  const KEY_STREAK = `${opts.storagePrefix}.streak`;
  const KEY_RESULTS = `${opts.storagePrefix}.results`;
  const KEY_REPLAYS = `${opts.storagePrefix}.replays`;

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

  function readReplays(): DailyReplay[] {
    const all = parseJson<DailyReplay[]>(safeGet(KEY_REPLAYS), []);
    return Array.isArray(all) ? all : [];
  }

  const sameChallenge = (a: { date: string; variant: string }, date: string, variant: string) =>
    a.date === date && a.variant === variant;

  /**
   * Los días jugables: del 1 del mes en curso al día de hoy. Una sola fuente
   * para el calendario, para el recuento de la colección y para `isPlayable`,
   * porque si estas tres se calcularan por separado acabarían discrepando.
   */
  function playableRange(now: Date): string[] {
    const mes = keyOf(now).slice(0, 8); // "AAAA-MM-"
    const out: string[] = [];
    for (let d = 1; d <= now.getDate(); d++) out.push(`${mes}${String(d).padStart(2, "0")}`);
    return out;
  }

  return {
    todayKey: (now = new Date()) => keyOf(now),

    seedFor: (date, variant) => seeds[date]?.[variant] ?? deriveSeed(date, variant),

    isFromTable: (date, variant) => seeds[date]?.[variant] !== undefined,

    // El calendario de retos pasados se sirve de aquí, y de ningún otro sitio.
    // La regla vive en el motor a propósito: **el futuro no se abre nunca**, ni
    // por un error de la interfaz ni porque la tabla de semillas tenga días por
    // delante. Que una semilla exista no significa que su día se pueda jugar.
    playableKeys: (now = new Date()) => playableRange(now),

    isPlayable(date, now = new Date()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const hoy = keyOf(now);
      // Las fechas ISO se ordenan bien como texto, así que basta comparar.
      return date >= `${hoy.slice(0, 8)}01` && date <= hoy;
    },

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
      const { seed, actions, ...resultado } = r;
      const todos = readResults();
      const previo = todos.find((x) => sameChallenge(x, r.date, r.variant));
      // Se conserva el mejor intento del día, y ganar no se pierde nunca.
      let mejor: DailyResult;
      let sustituye: boolean;
      if (previo !== undefined && previo.score >= r.score) {
        mejor = { ...previo, won: previo.won || r.won };
        sustituye = false;
      } else {
        mejor = { ...resultado, won: (previo?.won ?? false) || r.won, ts: Date.now() };
        sustituye = true;
      }

      const resto = todos.filter((x) => !sameChallenge(x, r.date, r.variant));
      const limite = [...resto, mejor]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, keepDays * 2);
      safeSet(KEY_RESULTS, JSON.stringify(limite));

      // La partida guardada tiene que corresponder con la puntuación guardada.
      // Si este intento no la mejora, no se toca nada. Si la mejora, se cambia
      // la partida también — y si esta vez no vienen las acciones, la anterior
      // se BORRA: una prueba que acredita otra puntuación es peor que ninguna.
      if (!sustituye) return;
      const otras = readReplays().filter((x) => !sameChallenge(x, r.date, r.variant));
      const vigentes =
        seed !== undefined && actions !== undefined
          ? [...otras, { date: r.date, variant: r.variant, seed, actions }]
          : otras;
      // Solo se conservan las del mes en curso: son las únicas que sirven para
      // la clasificación mensual, y son con diferencia lo más pesado que guarda
      // el juego. Vaciar cada mes mantiene el gasto acotado.
      const mes = r.date.slice(0, 8);
      safeSet(KEY_REPLAYS, JSON.stringify(vigentes.filter((x) => x.date.slice(0, 8) === mes)));
    },

    resultsOf: (date) => readResults().filter((r) => r.date === date),

    replayOf: (date, variant) =>
      readReplays().find((x) => sameChallenge(x, date, variant)) ?? null,

    collection(now = new Date()) {
      // El día 0 del mes siguiente es el último del actual: 28, 29, 30 o 31.
      const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const mes = keyOf(now).slice(0, 8); // "AAAA-MM-"
      // Por DÍA, no por resultado: hacer las dos dificultades del mismo día no
      // cuenta dos veces, y un almacenamiento con duplicados de una versión
      // anterior tampoco puede inflar la cuenta.
      const dias = new Set(
        readResults()
          .filter(
            (r) =>
              r.date.slice(0, 8) === mes &&
              (variants.length === 0 || variants.includes(r.variant))
          )
          .map((r) => r.date)
      );
      return { done: dias.size, total };
    }
  };
}
