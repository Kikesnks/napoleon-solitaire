import type { Card, DeckIndex, Rank, Suit } from "./types";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** Crea las 104 cartas (2 barajas francesas, 4 palos). */
export function buildDecks(): Card[] {
  const cards: Card[] = [];
  for (const deck of [0, 1] as DeckIndex[]) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${deck}-${suit}-${rank}`,
          suit,
          rank,
          deck,
          faceUp: false
        });
      }
    }
  }
  return cards;
}

/**
 * Crea las 104 cartas en modo 2 palos: 4 copias del palo rojo elegido y 4
 * copias del palo negro elegido (4×13 + 4×13 = 104). El jugador usa sólo
 * dos palos distintos, lo que simplifica la partida.
 */
export function buildDecks2Suits(redSuit: Suit, blackSuit: Suit): Card[] {
  const cards: Card[] = [];
  for (const suit of [redSuit, blackSuit]) {
    for (let copy = 0; copy < 4; copy++) {
      for (const rank of RANKS) {
        cards.push({
          id: `${copy}-${suit}-${rank}`,
          suit,
          rank,
          deck: copy as DeckIndex,
          faceUp: false
        });
      }
    }
  }
  return cards;
}

/**
 * Mulberry32 — PRNG determinista a partir de una semilla. Permite reproducir
 * partidas para tests o compartir un "deal del día".
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates con un generador inyectable. Devuelve una copia barajada. */
export function shuffle<T>(input: readonly T[], rng: () => number = Math.random): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
