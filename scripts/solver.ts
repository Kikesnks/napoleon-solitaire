// ── SOLVER DEL SOLITARIO NAPOLEÓN ───────────────────────────────────────────
//
// Busca una PARTIDA GANADA para una semilla. No demuestra que un reparto sea
// imposible —eso exigiría explorar el espacio entero— sino que encuentra un
// camino a la victoria y lo devuelve como lista de acciones.
//
// Esa asimetría es justo lo que necesitamos: para el reto diario solo se
// publican semillas de las que TENEMOS una partida ganada, así que la garantía
// no es "el solver cree que se puede", es "aquí está la partida, reprodúcela".
//
// Por qué hay un modelo propio en vez de usar el motor directamente: el motor
// clona las 104 cartas en cada jugada (lo necesita para el deshacer), y una
// búsqueda hace cientos de miles de jugadas. Aquí las cartas son números y el
// estado es una cadena.
//
// El riesgo de tener dos modelos se cubre con la verificación final: la partida
// encontrada se reproduce contra el MOTOR DE VERDAD y solo vale si termina en
// "won". Si este modelo se desviara, el resultado se descarta; nunca se cuela.
//
// Uso directo (diagnóstico):  npx tsx scripts/solver.ts <semilla> <2|4> [nodos]

import { createInitialState } from "../src/game/state.ts";
import { reduceAction } from "../src/game/rules.ts";
import type { LoggedAction, PositionId, SuitMode } from "../src/game/types.ts";

// ---------------------------------------------------------------- modelo

/** Posiciones, en el orden que usa el modelo rápido. */
const POS: PositionId[] = [
  "I", "II", "III", "IV",       // 0-3  fundaciones descendentes
  "X",                          // 4    fundación ascendente
  "A1", "B1", "C1", "D1",       // 5-8  free cells
  "A", "B", "C", "D",           // 9-12 pilas boca abajo
  "pile1", "pile2", "pile3", "pile4", // 13-16 pilas de reparto
  "monton"                      // 17
];

const N_POS = 18;
const F_DESC_0 = 0, F_DESC_3 = 3, X_POS = 4;
const FC_0 = 5, FC_3 = 8, STOCK_0 = 9, STOCK_3 = 12;
const PILE_0 = 13, PILE_3 = 16, MONTON = 17;

/** Free cell → su pila. A1←A, B1←B, C1←C, D1←D. */
const STOCK_OF_FC = (fc: number): number => fc - FC_0 + STOCK_0;

/** Carta = palo*16 + rango. Rango 1..13, palo 0..3. */
const suitOf = (c: number): number => c >> 4;
const rankOf = (c: number): number => c & 15;

/** Cuántas cartas reparte el montón en cada ronda, y a cuántas pilas. */
const DEAL_SIZE: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1 };
const ACTIVE_PILES: Record<number, number[]> = {
  1: [PILE_0, PILE_0 + 1, PILE_0 + 2, PILE_0 + 3],
  2: [PILE_0, PILE_0 + 1, PILE_0 + 2],
  3: [PILE_0, PILE_0 + 1],
  4: [PILE_0]
};

type Piles = number[][];
interface Estado {
  piles: Piles;
  round: number;
}

/** Traduce el estado inicial del motor real al modelo rápido. */
function desdeMotor(seed: number, suitMode: SuitMode): Estado {
  const g = createInitialState({ seed, suitMode });
  const piles: Piles = POS.map((id) =>
    g.positions[id].map((c) => {
      const suit = ["spades", "hearts", "diamonds", "clubs"].indexOf(c.suit);
      return (suit << 4) | c.rank;
    })
  );
  return { piles, round: g.round };
}

const clonar = (e: Estado): Estado => ({ piles: e.piles.map((p) => p.slice()), round: e.round });

const cima = (p: number[]): number => (p.length === 0 ? -1 : p[p.length - 1]);

const esDescFoundation = (i: number): boolean => i >= F_DESC_0 && i <= F_DESC_3;
const esFreeCell = (i: number): boolean => i >= FC_0 && i <= FC_3;
const esStock = (i: number): boolean => i >= STOCK_0 && i <= STOCK_3;
const esPila = (i: number): boolean => i >= PILE_0 && i <= PILE_3;
const esFundacion = (i: number): boolean => i <= X_POS;

/** ¿Se puede dejar `carta` en `destino`? Réplica exacta de `canPlace`. */
function encaja(carta: number, destino: number, top: number, origen: number): boolean {
  if (esDescFoundation(destino)) {
    if (top === -1) return rankOf(carta) === 13;
    return suitOf(carta) === suitOf(top) && rankOf(carta) === rankOf(top) - 1;
  }
  if (destino === X_POS) {
    if (top === -1) return rankOf(carta) === 1;
    return suitOf(carta) === suitOf(top) && rankOf(carta) === rankOf(top) + 1;
  }
  if (esFreeCell(destino)) {
    if (top !== -1) return suitOf(carta) === suitOf(top) && rankOf(carta) === rankOf(top) + 1;
    // Vacía: solo se rellena desde su propia pila.
    return origen === STOCK_OF_FC(destino);
  }
  return false;
}

/** Una free cell vacía tira de su pila. Réplica de `replenishFreeCell`. */
function reponer(e: Estado, fc: number): void {
  if (e.piles[fc].length > 0) return;
  const stock = e.piles[STOCK_OF_FC(fc)];
  if (stock.length === 0) return;
  e.piles[fc].push(stock.pop()!);
}

/**
 * Aplica un movimiento, con el encadenado a fundación desde free cell o X que
 * hace el motor: tras colocar la primera carta sigue colocando las que encajen,
 * limitado a las que ya estaban en el origen.
 */
function mover(e: Estado, from: number, to: number): void {
  const largoOriginal = e.piles[from].length;
  const carta = e.piles[from].pop()!;
  if (esFreeCell(from)) reponer(e, from);
  e.piles[to].push(carta);

  let despejada = false;
  if (esDescFoundation(to) && rankOf(carta) === 1) {
    e.piles[to] = [];
    despejada = true;
  } else if (to === X_POS && rankOf(carta) === 13) {
    e.piles[to] = [];
    despejada = true;
  }

  const encadena = esFundacion(to) && (esFreeCell(from) || from === X_POS);
  if (!encadena || despejada) return;

  let hechos = 1;
  while (hechos < largoOriginal) {
    const siguiente = cima(e.piles[from]);
    if (siguiente === -1) break;
    if (!encaja(siguiente, to, cima(e.piles[to]), from)) break;
    e.piles[from].pop();
    if (esFreeCell(from)) reponer(e, from);
    e.piles[to].push(siguiente);
    hechos++;
    if (esDescFoundation(to) && rankOf(siguiente) === 1) {
      e.piles[to] = [];
      break;
    }
    if (to === X_POS && rankOf(siguiente) === 13) {
      e.piles[to] = [];
      break;
    }
  }
}

/** Reparte del montón, o cambia de ronda si está vacío. Réplica del motor. */
function repartir(e: Estado): void {
  if (e.piles[MONTON].length > 0) {
    const size = DEAL_SIZE[e.round];
    const activas = ACTIVE_PILES[e.round];
    for (let i = 0; i < size; i++) {
      if (e.piles[MONTON].length === 0) break;
      e.piles[activas[i]].push(e.piles[MONTON].pop()!);
    }
    return;
  }
  // Montón agotado: las pilas activas se juntan y forman el montón siguiente.
  const activas = ACTIVE_PILES[e.round];
  const nuevo: number[] = [];
  for (let i = activas.length - 1; i >= 0; i--) {
    nuevo.push(...e.piles[activas[i]]);
    e.piles[activas[i]] = [];
  }
  nuevo.reverse();
  e.piles[MONTON] = nuevo;
  e.round += 1;
}

/** Cartas fuera de fundaciones: 0 significa que ya no queda nada por colocar. */
function heuristica(e: Estado): number {
  let n = 0;
  for (let i = FC_0; i < N_POS; i++) n += e.piles[i].length;
  return n;
}

function ganada(e: Estado): boolean {
  for (let i = 0; i < N_POS; i++) if (e.piles[i].length > 0) return false;
  return true;
}

/** Clave para detectar estados repetidos. Es también cómo se guarda el nodo. */
function codificar(e: Estado): string {
  let s = String(e.round);
  for (let i = 0; i < N_POS; i++) {
    s += "|";
    const p = e.piles[i];
    for (let j = 0; j < p.length; j++) s += String.fromCharCode(p[j] + 1);
  }
  return s;
}

function descodificar(clave: string): Estado {
  const partes = clave.split("|");
  const piles: Piles = [];
  for (let i = 1; i <= N_POS; i++) {
    const trozo = partes[i];
    const arr: number[] = [];
    for (let j = 0; j < trozo.length; j++) arr.push(trozo.charCodeAt(j) - 1);
    piles.push(arr);
  }
  return { piles, round: Number(partes[0]) };
}

// ---------------------------------------------------------------- acciones

type Accion = { tipo: "mover"; from: number; to: number } | { tipo: "repartir" };

const ORIGENES = [
  X_POS,
  FC_0, FC_0 + 1, FC_0 + 2, FC_0 + 3,
  STOCK_0, STOCK_0 + 1, STOCK_0 + 2, STOCK_0 + 3,
  PILE_0, PILE_0 + 1, PILE_0 + 2, PILE_0 + 3
];
const DESTINOS = [F_DESC_0, F_DESC_0 + 1, F_DESC_0 + 2, F_DESC_0 + 3, X_POS, FC_0, FC_0 + 1, FC_0 + 2, FC_0 + 3];

function acciones(e: Estado): Accion[] {
  const out: Accion[] = [];
  for (const from of ORIGENES) {
    const carta = cima(e.piles[from]);
    if (carta === -1) continue;
    for (const to of DESTINOS) {
      if (to === from) continue;
      if (encaja(carta, to, cima(e.piles[to]), from)) out.push({ tipo: "mover", from, to });
    }
  }
  // Repartir en la ronda 4 con el montón vacío solo sirve para perder: el motor
  // da la partida por terminada. No se genera como opción.
  if (!(e.round === 4 && e.piles[MONTON].length === 0)) out.push({ tipo: "repartir" });
  return out;
}

function aplicar(e: Estado, a: Accion): void {
  if (a.tipo === "repartir") repartir(e);
  else mover(e, a.from, a.to);
}

/** La acción tal y como la entiende el motor y el registro de la partida. */
function aLoggedAction(a: Accion): LoggedAction {
  return a.tipo === "repartir"
    ? { type: "deal" }
    : { type: "move", from: POS[a.from], to: POS[a.to] };
}

// ---------------------------------------------------------------- búsqueda

interface Nodo {
  clave: string;
  padre: number;
  accion: Accion | null;
  h: number;
  prof: number;
}

/** Montículo binario por prioridad (menor primero). */
class Cola {
  private datos: { f: number; orden: number; idx: number }[] = [];
  private contador = 0;

  get size(): number {
    return this.datos.length;
  }

  push(f: number, idx: number): void {
    const item = { f, orden: this.contador++, idx };
    this.datos.push(item);
    let i = this.datos.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.mejor(this.datos[i], this.datos[p])) {
        [this.datos[i], this.datos[p]] = [this.datos[p], this.datos[i]];
        i = p;
      } else break;
    }
  }

  pop(): number | undefined {
    if (this.datos.length === 0) return undefined;
    const top = this.datos[0];
    const last = this.datos.pop()!;
    if (this.datos.length > 0) {
      this.datos[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.datos.length && this.mejor(this.datos[l], this.datos[m])) m = l;
        if (r < this.datos.length && this.mejor(this.datos[r], this.datos[m])) m = r;
        if (m === i) break;
        [this.datos[i], this.datos[m]] = [this.datos[m], this.datos[i]];
        i = m;
      }
    }
    return top.idx;
  }

  /** Menor f primero; a igualdad, el que entró antes (búsqueda estable). */
  private mejor(a: { f: number; orden: number }, b: { f: number; orden: number }): boolean {
    return a.f < b.f || (a.f === b.f && a.orden < b.orden);
  }
}

export interface ResultadoSolver {
  /** La partida ganada, o `null` si no se encontró dentro del presupuesto. */
  solucion: LoggedAction[] | null;
  /** Nodos expandidos. Sirve para saber si el presupuesto se agotó. */
  nodos: number;
  /** Cartas que quedaron sin colocar en el mejor intento (0 = victoria). */
  mejorH: number;
  agotado: boolean;
}

export interface OpcionesSolver {
  /** Tope de nodos a expandir. Es el mando de "cuánto esfuerzo". */
  presupuesto?: number;
  /**
   * Peso de la profundidad en la prioridad. 0 = codicia pura (va a por el
   * progreso y no mira el coste). Un poco de peso evita caminos larguísimos.
   */
  pesoProfundidad?: number;
  /**
   * Número de intento. Cambia el desempate entre estados que pintan igual de
   * bien, sin tocar la búsqueda: reintentar con otro número explora otra rama.
   * Es la técnica que más rendimiento da aquí, porque el atasco típico no es
   * "no hay solución", es "me metí por el pasillo equivocado al principio".
   * El intento 0 es determinista y sin ruido.
   */
  intento?: number;
}

/** Ruido reproducible para el desempate, distinto en cada intento. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Busca una partida ganada. Determinista: mismas entradas, mismo resultado.
 * No usa azar en ningún punto, así que un test puede fiarse de él.
 */
export function resolver(
  seed: number,
  suitMode: SuitMode,
  opts: OpcionesSolver = {}
): ResultadoSolver {
  const presupuesto = opts.presupuesto ?? 120_000;
  const peso = opts.pesoProfundidad ?? 0;
  const intento = opts.intento ?? 0;
  // El intento 0 no lleva ruido: así el resultado es reproducible palabra por
  // palabra y un test puede fiarse de él.
  const rnd = intento === 0 ? () => 0 : mulberry(seed ^ (intento * 0x9e3779b9));

  const raiz = desdeMotor(seed, suitMode);
  const claveRaiz = codificar(raiz);
  const nodos: Nodo[] = [{ clave: claveRaiz, padre: -1, accion: null, h: heuristica(raiz), prof: 0 }];
  const vistos = new Set<string>([claveRaiz]);
  const cola = new Cola();
  cola.push(nodos[0].h, 0);

  let expandidos = 0;
  let mejorH = nodos[0].h;

  while (cola.size > 0 && expandidos < presupuesto) {
    const idx = cola.pop()!;
    const nodo = nodos[idx];
    const estado = descodificar(nodo.clave);
    expandidos++;

    for (const accion of acciones(estado)) {
      const siguiente = clonar(estado);
      aplicar(siguiente, accion);

      if (ganada(siguiente)) {
        return {
          solucion: reconstruir(nodos, idx, accion),
          nodos: expandidos,
          mejorH: 0,
          agotado: false
        };
      }

      const clave = codificar(siguiente);
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const h = heuristica(siguiente);
      if (h < mejorH) mejorH = h;
      const nuevo: Nodo = { clave, padre: idx, accion, h, prof: nodo.prof + 1 };
      nodos.push(nuevo);
      // El ruido es menor que una unidad de heurística: nunca cambia qué estado
      // es mejor, solo el orden entre los que empatan.
      cola.push(h * 1000 + peso * nuevo.prof + rnd() * 900, nodos.length - 1);
    }
  }

  return { solucion: null, nodos: expandidos, mejorH, agotado: cola.size > 0 };
}

function reconstruir(nodos: Nodo[], idx: number, ultima: Accion): LoggedAction[] {
  const camino: Accion[] = [ultima];
  let i = idx;
  while (i > 0) {
    const n = nodos[i];
    if (n.accion) camino.push(n.accion);
    i = n.padre;
  }
  camino.reverse();
  return camino.map(aLoggedAction);
}

// ---------------------------------------------------------------- garantía

/**
 * **La pieza que sostiene toda la promesa.** Reproduce la partida contra el
 * motor de verdad —el mismo que juega el jugador y el mismo que valida el
 * servidor— y solo devuelve true si termina ganada.
 *
 * Si el modelo rápido de este archivo se desviara del motor, esto lo caza y la
 * semilla se descarta. Por eso una semilla publicada es una semilla jugable.
 */
export function verificar(seed: number, suitMode: SuitMode, acciones: LoggedAction[]): boolean {
  let estado = createInitialState({ seed, suitMode });
  for (const a of acciones) {
    estado = reduceAction(estado, a);
  }
  return estado.status === "won";
}

// ---------------------------------------------------------------- CLI

const esEjecutable = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/solver.ts");
if (esEjecutable) {
  const seed = Number(process.argv[2] ?? 1);
  const modo = (Number(process.argv[3] ?? 4) === 2 ? 2 : 4) as SuitMode;
  const presupuesto = Number(process.argv[4] ?? 120_000);

  const t0 = Date.now();
  const r = resolver(seed, modo, { presupuesto });
  const ms = Date.now() - t0;

  if (r.solucion) {
    const ok = verificar(seed, modo, r.solucion);
    console.log(
      `semilla ${seed} (${modo} palos): GANADA en ${r.solucion.length} acciones · ` +
        `${r.nodos} nodos · ${ms} ms · verificada contra el motor: ${ok ? "SÍ" : "NO"}`
    );
    process.exit(ok ? 0 : 1);
  } else {
    console.log(
      `semilla ${seed} (${modo} palos): sin solución encontrada · ${r.nodos} nodos · ` +
        `${ms} ms · mejor intento dejó ${r.mejorH} cartas sin colocar`
    );
    process.exit(2);
  }
}
