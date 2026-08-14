// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Mecanismo de leaderboard reutilizable por cualquier juego. NO conoce el
// Solitario Napoleón: los tipos concretos (qué es una "prueba" de partida, qué
// campos extra lleva una entrada) los aporta el juego al instanciarlo.
//
// Esta carpeta es la parte reutilizable del proyecto: si mañana hay un segundo
// solitario, se lleva `core/` entero y solo escribe su atadura.

/** Categorías del ranking. Cada juego decide cuáles usa ("won" | "lost"…). */
export type CategoryId = string;

/** Campos mínimos que toda entrada de ranking debe tener. */
export interface EntryBase {
  name: string;
  score: number;
  /** Fecha legible, ya formateada por quien la crea. */
  date: string;
  /** `Date.now()` del envío — sirve para resaltar la entrada recién añadida. */
  ts: number;
}

/** Campos mínimos que todo envío debe traer. */
export interface PayloadBase {
  name: string;
  category: CategoryId;
  score: number;
}

/**
 * Un backend de ranking: sabe listar y enviar. Puede fallar (lanzar); quien
 * compone los backends es el responsable de que el jugador nunca vea el fallo.
 */
export interface LeaderboardBackend<E extends EntryBase, P extends PayloadBase> {
  readonly kind: "remote" | "local";
  list(category: CategoryId): Promise<E[]>;
  submit(payload: P): Promise<E[]>;
}
