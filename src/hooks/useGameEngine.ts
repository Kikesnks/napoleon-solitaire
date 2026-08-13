import { useCallback, useEffect, useMemo, useState } from "react";
import { clearSavedGame, loadGame, saveGame } from "../game/save";
import {
  createInitialState,
  reduceAction,
  undo as undoState,
  type Action,
  type GameState,
  type PositionId,
  type SuitMode
} from "../game";

export interface GameEngine {
  state: GameState;
  newGame(seed?: number, suitMode?: SuitMode): void;
  move(from: PositionId, to: PositionId): void;
  deal(): void;
  autoPromote(from: PositionId): void;
  undo(): void;
  canUndo: boolean;
}

export function useGameEngine(initialSeed?: number, initialSuitMode: SuitMode = 4): GameEngine {
  // Se retoma la partida guardada si la hay; si no, uno nuevo. Recargar la
  // pagina no puede costarle al jugador la partida que llevaba.
  const [state, setState] = useState<GameState>(
    () => loadGame() ?? createInitialState({ seed: initialSeed, suitMode: initialSuitMode })
  );

  // Se guarda tras cada cambio. Es barato: solo semilla + registro de acciones.
  useEffect(() => {
    saveGame(state);
  }, [state]);

  const dispatch = useCallback(
    (action: Action) => setState((prev) => reduceAction(prev, action)),
    []
  );

  const newGame = useCallback((seed?: number, suitMode: SuitMode = 4) => {
    clearSavedGame();
    setState(createInitialState({ seed, suitMode }));
  }, []);

  const move = useCallback(
    (from: PositionId, to: PositionId) => dispatch({ type: "move", from, to }),
    [dispatch]
  );
  const deal = useCallback(() => dispatch({ type: "deal" }), [dispatch]);
  const autoPromote = useCallback(
    (from: PositionId) => dispatch({ type: "autoPromote", from }),
    [dispatch]
  );
  const undo = useCallback(() => setState(undoState), []);

  return useMemo(
    () => ({
      state,
      newGame,
      move,
      deal,
      autoPromote,
      undo,
      canUndo: state.history.length > 0
    }),
    [state, newGame, move, deal, autoPromote, undo]
  );
}
