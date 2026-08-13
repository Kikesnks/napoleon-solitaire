// ── ATADURA DEL NAPOLEÓN AL GUARDADO ────────────────────────────────────────
// Persistir la partida en curso para que sobreviva a recargar la página.
//
// No se guarda el tablero: se guardan **la semilla y el registro de acciones**,
// y al volver se reproduce la partida con el mismo motor puro. Es exactamente
// lo que ya hace el servidor para validar puntuaciones (`api/leaderboard/submit`),
// así que no hay una segunda forma de representar el estado que pueda
// desincronizarse. Ventaja añadida: ocupa unos pocos KB en vez del tablero entero.
//
// Principio rector nº 3: esto vive en el dispositivo del jugador y no viaja
// a ningún sitio.

import { readPref, writePref } from "../core/storage/prefs.js";
import { createInitialState } from "./state.js";
import { reduceAction, type Action } from "./rules.js";
import type { GameState, LoggedAction, SuitMode } from "./types.js";

const SAVE_KEY = "solnap.game";

interface SavedGame {
  v: 1;
  seed: number;
  suitMode: SuitMode;
  startedAt: number;
  actions: LoggedAction[];
}

/** Guarda la partida en curso. Las terminadas no se guardan: ya no se retoman. */
export function saveGame(state: GameState): void {
  if (state.status !== "playing") {
    clearSavedGame();
    return;
  }
  const save: SavedGame = {
    v: 1,
    seed: state.seed,
    suitMode: state.suitMode,
    startedAt: state.startedAt,
    actions: state.actionLog
  };
  writePref(SAVE_KEY, JSON.stringify(save));
}

export function clearSavedGame(): void {
  writePref(SAVE_KEY, "");
}

/**
 * Recupera la partida guardada reproduciéndola desde la semilla. Devuelve
 * `null` si no hay nada guardado o si el guardado no es utilizable — ante la
 * duda, empezar una partida nueva es preferible a arrancar roto.
 */
export function loadGame(): GameState | null {
  const raw = readPref(SAVE_KEY);
  if (!raw) return null;

  try {
    const save = JSON.parse(raw) as SavedGame;
    if (save.v !== 1 || typeof save.seed !== "number" || !Array.isArray(save.actions)) {
      return null;
    }

    let state = createInitialState({ seed: save.seed, suitMode: save.suitMode });
    for (const action of save.actions) {
      state = reduceAction(state, action as Action);
    }

    // Si la partida guardada ya estaba acabada, no se retoma.
    if (state.status !== "playing") return null;

    // Se conserva el cronómetro: el jugador no gana tiempo por recargar.
    return { ...state, startedAt: save.startedAt };
  } catch {
    // Guardado corrupto o de una versión de reglas incompatible.
    return null;
  }
}
