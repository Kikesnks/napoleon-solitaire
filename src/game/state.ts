import { buildDecks, mulberry32, shuffle } from "./deck";
import {
  ALL_POSITIONS,
  STOCKS,
  type Card,
  type CoreState,
  type GameState,
  type PositionId
} from "./types";

function emptyPositions(): Record<PositionId, Card[]> {
  const map = {} as Record<PositionId, Card[]>;
  for (const id of ALL_POSITIONS) map[id] = [];
  return map;
}

export interface InitOptions {
  seed?: number;
  /** Permite inyectar una baraja ya construida (tests). */
  preshuffled?: Card[];
  now?: number;
}

/**
 * Reparte la posición inicial:
 * - 4 pilas A/B/C/D de 10 cartas boca abajo, con la superior boca arriba.
 * - 4 cartas A1/B1/C1/D1 boca arriba.
 * - Las 64 restantes en el montón, boca abajo.
 */
export function createInitialState(options: InitOptions = {}): GameState {
  const { seed, preshuffled, now = Date.now() } = options;
  const rng = seed != null ? mulberry32(seed) : Math.random;
  const cards = preshuffled ? preshuffled.slice() : shuffle(buildDecks(), rng);
  if (cards.length !== 104) {
    throw new Error(`Se esperaban 104 cartas, llegaron ${cards.length}`);
  }

  const positions = emptyPositions();

  // PRIMER PASO: 4 pilas A/B/C/D de 10 cartas boca abajo (40 cartas).
  let cursor = 0;
  for (const stock of STOCKS) {
    const pile: Card[] = [];
    for (let i = 0; i < 10; i++) {
      pile.push({ ...cards[cursor++], faceUp: false });
    }
    positions[stock] = pile;
  }

  // SEGUNDO PASO: sacar una carta de cada pila a A1/B1/C1/D1 boca arriba, y
  // voltear boca arriba la nueva superior de A/B/C/D. Total dispuesto: 40
  // cartas (9+1 por columna), 64 quedan en el montón.
  const freeCells = ["A1", "B1", "C1", "D1"] as const;
  for (let i = 0; i < STOCKS.length; i++) {
    const stockId = STOCKS[i];
    const moved = positions[stockId].pop()!;
    moved.faceUp = true;
    positions[freeCells[i]] = [moved];
    const newTop = positions[stockId][positions[stockId].length - 1];
    newTop.faceUp = true;
  }

  positions.monton = cards.slice(cursor).map((c) => ({ ...c, faceUp: false }));

  const core: CoreState = {
    positions,
    round: 1,
    score: 0,
    moves: 0,
    status: "playing",
    lastMove: null
  };

  return {
    ...core,
    startedAt: now,
    finishedAt: null,
    history: []
  };
}

/**
 * Snapshot profundo del estado núcleo (para el undo).
 *
 * IMPORTANTE: clonamos las propias cartas ({...c}), no sólo los arrays. Las
 * funciones de motor (applyMove, dealFromMonton, advanceRound, replenishFreeCell)
 * mutan `card.faceUp` en sitio para reflejar volteos. Si compartiéramos las
 * referencias entre el estado actual y el almacenado en history, tras un undo
 * el montón aparecería boca arriba (mismo objeto Card mutado por dealFromMonton).
 */
export function snapshot(state: CoreState): CoreState {
  const positions = {} as Record<PositionId, Card[]>;
  for (const id of ALL_POSITIONS) {
    positions[id] = state.positions[id].map((c) => ({ ...c }));
  }
  return {
    positions,
    round: state.round,
    score: state.score,
    moves: state.moves,
    status: state.status,
    lastMove: state.lastMove ? { ...state.lastMove } : null
  };
}
