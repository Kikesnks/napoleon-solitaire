// Tipos del modelo del juego. Sin dependencias externas: pura TS para que la
// lógica sea trivial de portar (Capacitor, tests Node, otra UI).

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

/** 1 = As, 11 = J, 12 = Q, 13 = K. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type DeckIndex = 0 | 1;

export interface Card {
  /** Identificador único e inmutable. Necesario porque hay 2 barajas. */
  id: string;
  suit: Suit;
  rank: Rank;
  deck: DeckIndex;
  faceUp: boolean;
}

/** Fundaciones descendentes: K → A. Al colocar el A se retiran. */
export type FoundationDescId = "I" | "II" | "III" | "IV";
/** Fundación ascendente: A → K. Al colocar el K se retira. */
export type FoundationAscId = "X";
/** Free cells / posiciones secundarias asociadas a cada pila A/B/C/D. */
export type FreeCellId = "A1" | "B1" | "C1" | "D1";
/** Pilas boca abajo iniciales (carta superior boca arriba). */
export type StockId = "A" | "B" | "C" | "D";
/** Pilas de reparto (1..4 según ronda). */
export type DealPileId = "pile1" | "pile2" | "pile3" | "pile4";
export type MontonId = "monton";

export type FoundationId = FoundationDescId | FoundationAscId;
export type PositionId =
  | FoundationDescId
  | FoundationAscId
  | FreeCellId
  | StockId
  | DealPileId
  | MontonId;

export type Round = 1 | 2 | 3 | 4;
export type Status = "playing" | "won" | "lost";

export interface MoveRecord {
  from: PositionId;
  to: PositionId;
  cardCount: number;
  /** ¿Esta jugada disparó una retirada de fundación completa? */
  cleared?: boolean;
}

export interface CoreState {
  /** Cada posición es un array; el último elemento es la carta superior. */
  positions: Record<PositionId, Card[]>;
  round: Round;
  score: number;
  moves: number;
  status: Status;
  /** Última jugada — usado por la UI para resaltados. */
  lastMove: MoveRecord | null;
  /**
   * Cartas representativas de cada secuencia ya completada y retirada del
   * tablero. Cuando una fundación I/II/III/IV se vacía por colocar el As,
   * el As se guarda aquí. Cuando X se vacía por colocar el K, el K se guarda.
   * La UI lo pinta como una fila de 8 slots arriba del todo (objetivo del juego).
   */
  completed: Card[];
}

export interface GameState extends CoreState {
  startedAt: number;
  finishedAt: number | null;
  /** Historial para undo. Snapshots inmutables previos a cada acción. */
  history: CoreState[];
}

/** Cuántas cartas reparte el montón en cada ronda. */
export const DEAL_SIZE_BY_ROUND: Record<Round, number> = {
  1: 4,
  2: 3,
  3: 2,
  4: 1
};

export const FOUNDATION_DESC: FoundationDescId[] = ["I", "II", "III", "IV"];
export const FREE_CELLS: FreeCellId[] = ["A1", "B1", "C1", "D1"];
export const STOCKS: StockId[] = ["A", "B", "C", "D"];
export const DEAL_PILES: DealPileId[] = ["pile1", "pile2", "pile3", "pile4"];
export const ALL_POSITIONS: PositionId[] = [
  ...FOUNDATION_DESC,
  "X",
  ...FREE_CELLS,
  ...STOCKS,
  ...DEAL_PILES,
  "monton"
];

/** Pareja stock ↔ free cell. */
export const STOCK_OF_FREECELL: Record<FreeCellId, StockId> = {
  A1: "A",
  B1: "B",
  C1: "C",
  D1: "D"
};
