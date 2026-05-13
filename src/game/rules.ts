import { snapshot } from "./state";
import {
  DEAL_PILES,
  DEAL_SIZE_BY_ROUND,
  FOUNDATION_DESC,
  FREE_CELLS,
  STOCKS,
  STOCK_OF_FREECELL,
  type Card,
  type CoreState,
  type FoundationDescId,
  type FreeCellId,
  type GameState,
  type MoveRecord,
  type PositionId,
  type Round,
  type StockId
} from "./types";

// ---------- Helpers de inspección ----------

const FOUNDATIONS: PositionId[] = [...FOUNDATION_DESC, "X"];
const FREE_CELL_SET = new Set<PositionId>(FREE_CELLS);
const FOUNDATION_SET = new Set<PositionId>(FOUNDATIONS);

export function topOf(state: CoreState, id: PositionId): Card | null {
  const pile = state.positions[id];
  return pile.length === 0 ? null : pile[pile.length - 1];
}

export function isFoundation(id: PositionId): boolean {
  return FOUNDATION_SET.has(id);
}

export function isDescFoundation(id: PositionId): id is FoundationDescId {
  return id === "I" || id === "II" || id === "III" || id === "IV";
}

export function isFreeCell(id: PositionId): id is FreeCellId {
  return FREE_CELL_SET.has(id);
}

/** Posiciones desde las que se puede iniciar un movimiento. */
export function isValidSource(id: PositionId): boolean {
  return (
    STOCKS.includes(id as StockId) ||
    FREE_CELL_SET.has(id) ||
    DEAL_PILES.includes(id as (typeof DEAL_PILES)[number]) ||
    id === "X"
  );
}

// ---------- Validación de destino ----------

/**
 * ¿Encaja `card` sobre `top` para extender la fundación descendente I/II/III/IV?
 *  - Si la fundación está vacía, sólo entra una K.
 *  - Si tiene cartas, mismo palo y rango exactamente uno menos que el tope.
 */
function fitsDescFoundation(card: Card, top: Card | null): boolean {
  if (!top) return card.rank === 13;
  return card.suit === top.suit && card.rank === top.rank - 1;
}

/** Análoga para X (ascendente, empieza en A). */
function fitsAscFoundation(card: Card, top: Card | null): boolean {
  if (!top) return card.rank === 1;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

/**
 * Free cells A1/B1/C1/D1:
 *  - Si están VACÍAS: sólo aceptan una carta procedente de su stock
 *    correspondiente (A1 ← A, B1 ← B, C1 ← C, D1 ← D). Otras fuentes no son
 *    válidas. Esto refleja la regla original del PDF: A1 es el "puesto" de A.
 *  - Si tienen cartas: aceptan otra del MISMO palo y color en orden
 *    ASCENDENTE (rango = top.rank + 1), independientemente del origen. Esto
 *    permite construir secuencias ascendentes en la free cell.
 */
function fitsFreeCell(
  card: Card,
  top: Card | null,
  dest: FreeCellId,
  from: PositionId | undefined
): boolean {
  if (top !== null) {
    return card.suit === top.suit && card.rank === top.rank + 1;
  }
  // Vacía: sólo se rellena desde la pila A/B/C/D asociada.
  return from !== undefined && STOCK_OF_FREECELL[dest] === from;
}

export function canPlace(
  card: Card,
  dest: PositionId,
  destTop: Card | null,
  from?: PositionId
): boolean {
  if (isDescFoundation(dest)) return fitsDescFoundation(card, destTop);
  if (dest === "X") return fitsAscFoundation(card, destTop);
  if (isFreeCell(dest)) return fitsFreeCell(card, destTop, dest, from);
  return false;
}

/** Lista todos los destinos válidos para la carta superior de `from`. */
export function legalDestinations(state: CoreState, from: PositionId): PositionId[] {
  const card = topOf(state, from);
  if (!card || !card.faceUp) return [];
  if (!isValidSource(from)) return [];
  const dests: PositionId[] = [];
  for (const dest of [...FOUNDATION_DESC, "X" as PositionId, ...FREE_CELLS]) {
    if (dest === from) continue;
    if (canPlace(card, dest, topOf(state, dest), from)) dests.push(dest);
  }
  return dests;
}

// ---------- Reglas de movimiento ----------

export interface MoveResult {
  state: CoreState;
  record: MoveRecord;
}

/**
 * Aplica un movimiento de una carta de `from` a `to`. Devuelve nuevo estado y
 * registro. Si después de colocar la carta la fundación se completa (As en
 * I/II/III/IV o K en X) la fundación se vacía automáticamente y `cleared = true`.
 *
 * Nota: el "encadenado" desde A1/B1/C1/D1/X a fundación (regla del PDF: "se
 * colocan todas las que haya en orden") se obtiene aplicando esta función
 * repetidamente vía `chainMoveToFoundation`.
 */
export function applyMove(state: CoreState, from: PositionId, to: PositionId): MoveResult {
  if (!isValidSource(from)) {
    throw new Error(`Movimiento inválido: origen ${from} no permitido`);
  }
  const card = topOf(state, from);
  if (!card) throw new Error(`Movimiento inválido: ${from} está vacía`);
  if (!card.faceUp) throw new Error(`Movimiento inválido: carta boca abajo`);
  if (!canPlace(card, to, topOf(state, to), from)) {
    throw new Error(`Movimiento inválido: ${from} → ${to}`);
  }

  const next = snapshot(state);
  // Quita la carta del origen.
  next.positions[from].pop();
  // Reposiciones / volteos según el tipo de origen.
  if (isFreeCell(from)) {
    replenishFreeCell(next, from);
  } else if (STOCKS.includes(from as StockId)) {
    // Las pilas A/B/C/D siempre muestran su carta superior boca arriba.
    const stock = next.positions[from];
    if (stock.length > 0 && !stock[stock.length - 1].faceUp) {
      stock[stock.length - 1].faceUp = true;
    }
  }

  // Coloca en destino.
  next.positions[to].push(card);

  let cleared = false;
  // Detección de fundación completa: el As cierra una descendente, el Rey
  // cierra la ascendente X. Guardamos la carta cerradora en `completed` para
  // que la UI la muestre en la fila de objetivos completados (8 en total).
  if (isDescFoundation(to) && card.rank === 1) {
    next.positions[to] = [];
    next.completed = [...next.completed, { ...card }];
    cleared = true;
  } else if (to === "X" && card.rank === 13) {
    next.positions[to] = [];
    next.completed = [...next.completed, { ...card }];
    cleared = true;
  }

  next.moves += 1;
  next.score += scoreForMove(from, to, cleared);
  const record: MoveRecord = { from, to, cardCount: 1, cleared };
  next.lastMove = record;
  next.status = computeStatus(next);
  return { state: next, record };
}

/**
 * Cuando una free cell A1/B1/C1/D1 se vacía: si su pila A/B/C/D tiene cartas,
 * la superior (boca arriba) sube a la free cell y la siguiente carta tapada
 * de la pila se voltea boca arriba. (PDF, página 3.)
 */
function replenishFreeCell(state: CoreState, fc: FreeCellId): void {
  if (state.positions[fc].length > 0) return;
  const stockId = STOCK_OF_FREECELL[fc];
  const stock = state.positions[stockId];
  if (stock.length === 0) return;

  // Saca la carta superior (la que estaba boca arriba) y muévela a la free cell.
  const moving = stock.pop()!;
  moving.faceUp = true;
  state.positions[fc].push(moving);

  // Voltea la nueva superior si queda alguna.
  if (stock.length > 0) {
    stock[stock.length - 1].faceUp = true;
  }
}

/**
 * Implementa la regla "se colocan todas las que haya en orden" cuando el
 * jugador mueve desde A1/B1/C1/D1/X hacia una fundación: tras colocar la
 * primera carta, intentamos seguir colocando cartas del mismo origen mientras
 * encajen.
 */
export function chainMoveToFoundation(
  state: CoreState,
  from: PositionId,
  to: PositionId
): { state: CoreState; records: MoveRecord[] } {
  const records: MoveRecord[] = [];
  const canChain = isFoundation(to) && (isFreeCell(from) || from === "X");
  // Limitamos el encadenado a las cartas que estaban en `from` antes del primer
  // movimiento — así la reposición de free cells (A→A1) no genera promociones
  // automáticas adicionales más allá de lo que el jugador disparó.
  const originalLength = state.positions[from].length;

  const first = applyMove(state, from, to);
  records.push(first.record);
  let current = first.state;
  let movesMade = 1;

  if (!canChain || first.record.cleared) {
    return { state: current, records };
  }

  while (movesMade < originalLength) {
    const nextCard = topOf(current, from);
    if (!nextCard || !nextCard.faceUp) break;
    if (!canPlace(nextCard, to, topOf(current, to))) break;
    const step = applyMove(current, from, to);
    records.push(step.record);
    current = step.state;
    movesMade += 1;
    if (step.record.cleared) break;
  }

  return { state: current, records };
}

// ---------- Reparto del montón ----------

/**
 * Reparte cartas del montón a las pilas de reparto activas según la ronda
 * actual. Si el montón se queda vacío durante el reparto, lo que se haya
 * dado se queda dado (la última tirada puede ser parcial).
 */
export function dealFromMonton(state: CoreState): CoreState {
  const next = snapshot(state);
  const size = DEAL_SIZE_BY_ROUND[next.round];
  const piles = activePilesFor(next.round);
  for (let i = 0; i < size; i++) {
    if (next.positions.monton.length === 0) break;
    const card = next.positions.monton.pop()!;
    card.faceUp = true;
    next.positions[piles[i]].push(card);
  }
  next.lastMove = null;
  next.status = computeStatus(next);
  return next;
}

/**
 * Cuando el jugador agotó el montón en una ronda, juntamos las pilas activas
 * (pila1 sobre pila2 sobre pila3 sobre pila4), volteamos boca abajo, y eso
 * forma el nuevo montón para la ronda siguiente. Si ya estamos en ronda 4 y
 * el montón se agota, la partida termina (ganada o perdida).
 */
export function advanceRound(state: CoreState): CoreState {
  if (state.positions.monton.length !== 0) return state;
  const next = snapshot(state);

  if (next.round === 4) {
    next.status = computeStatus(next);
    if (next.status === "playing") {
      // No quedan repartos posibles — la partida está perdida si no hay
      // movimientos legales que conduzcan a la victoria.
      next.status = boardEmpty(next) ? "won" : "lost";
    }
    return next;
  }

  const piles = activePilesFor(next.round);
  // pila1 sobre pila2 sobre pila3 sobre pila4: el resultado, leído de abajo
  // arriba en la pila final, es pila4 (más antiguo) → ... → pila1 (más reciente).
  const newMonton: Card[] = [];
  for (let i = piles.length - 1; i >= 0; i--) {
    newMonton.push(...next.positions[piles[i]]);
    next.positions[piles[i]] = [];
  }
  // Volteamos boca abajo. La pila se "da la vuelta" — el orden visible se
  // invierte para que la primera carta a repartir sea la última que se colocó.
  // Implementación: invertir el array y poner faceUp=false.
  newMonton.reverse();
  for (const c of newMonton) c.faceUp = false;
  next.positions.monton = newMonton;

  next.round = (next.round + 1) as Round;
  next.lastMove = null;
  next.status = computeStatus(next);
  return next;
}

export function activePilesFor(round: Round): ("pile1" | "pile2" | "pile3" | "pile4")[] {
  switch (round) {
    case 1:
      return ["pile1", "pile2", "pile3", "pile4"];
    case 2:
      return ["pile1", "pile2", "pile3"];
    case 3:
      return ["pile1", "pile2"];
    case 4:
      return ["pile1"];
  }
}

/** ¿Quedan cartas en juego (fuera del montón ya dispuesto en pilas/free cells)? */
export function boardEmpty(state: CoreState): boolean {
  for (const id of [
    ...FOUNDATION_DESC,
    "X" as PositionId,
    ...FREE_CELLS,
    ...STOCKS,
    ...DEAL_PILES,
    "monton" as PositionId
  ]) {
    if (state.positions[id].length > 0) return false;
  }
  return true;
}

function computeStatus(state: CoreState): "playing" | "won" | "lost" {
  if (boardEmpty(state)) return "won";
  return state.status === "lost" ? "lost" : "playing";
}

// ---------- Puntuación ----------

/**
 * +10 por carta a fundación descendente.
 * +10 por carta a fundación ascendente (X).
 * +50 bonus al completar una fundación (As cae en I/II/III/IV o K en X).
 *  -1 por mover de free cell a free cell (penalización suave para evitar abuso).
 *  +0 por reparto.
 */
function scoreForMove(from: PositionId, to: PositionId, cleared: boolean): number {
  let s = 0;
  if (FOUNDATION_SET.has(to)) s += 10;
  if (cleared) s += 50;
  if (FREE_CELL_SET.has(from) && FREE_CELL_SET.has(to)) s -= 1;
  return s;
}

// ---------- Acciones de alto nivel ----------

/** Intenta auto-promover una carta del top de `from` a la mejor fundación posible. */
export function autoPromote(state: CoreState, from: PositionId): { state: CoreState; moved: boolean } {
  const card = topOf(state, from);
  if (!card || !card.faceUp || !isValidSource(from)) return { state, moved: false };
  const candidates: PositionId[] = [...FOUNDATION_DESC, "X"];
  for (const dest of candidates) {
    if (canPlace(card, dest, topOf(state, dest))) {
      const result = chainMoveToFoundation(state, from, dest);
      return { state: result.state, moved: true };
    }
  }
  return { state, moved: false };
}

/** Acciones públicas con historial — ver `applyAction` en el hook. */
export type Action =
  | { type: "move"; from: PositionId; to: PositionId }
  | { type: "deal" }
  | { type: "autoPromote"; from: PositionId };

export function reduceAction(state: GameState, action: Action): GameState {
  if (state.status !== "playing") return state;
  const previous = snapshot(state);
  let nextCore: CoreState;

  try {
    switch (action.type) {
      case "move": {
        // Para origen=A1/B1/C1/D1/X y destino fundación, encadena automáticamente.
        const useChain =
          FOUNDATION_SET.has(action.to) && (isFreeCell(action.from) || action.from === "X");
        nextCore = useChain
          ? chainMoveToFoundation(state, action.from, action.to).state
          : applyMove(state, action.from, action.to).state;
        break;
      }
      case "deal": {
        if (state.positions.monton.length === 0) {
          nextCore = advanceRound(state);
        } else {
          nextCore = dealFromMonton(state);
        }
        break;
      }
      case "autoPromote": {
        const result = autoPromote(state, action.from);
        if (!result.moved) return state;
        nextCore = result.state;
        break;
      }
    }
  } catch (err) {
    // Acción inválida (la UI debería filtrarlas, pero no queremos crashear).
    if (typeof console !== "undefined") console.warn("reduceAction:", err);
    return state;
  }

  return {
    ...nextCore,
    startedAt: state.startedAt,
    finishedAt: nextCore.status === "playing" ? null : Date.now(),
    history: [...state.history, previous].slice(-200),
    suitMode: state.suitMode
  };
}

export function undo(state: GameState): GameState {
  if (state.history.length === 0) return state;
  const prev = state.history[state.history.length - 1];
  return {
    ...prev,
    startedAt: state.startedAt,
    finishedAt: prev.status === "playing" ? null : state.finishedAt,
    history: state.history.slice(0, -1),
    suitMode: state.suitMode
  };
}
