import { useCallback, useMemo, useState } from "react";
import {
  createInitialState,
  reduceAction,
  undo as undoState,
  type Action,
  type GameState,
  type PositionId
} from "../game";

export interface GameEngine {
  state: GameState;
  newGame(seed?: number): void;
  move(from: PositionId, to: PositionId): void;
  deal(): void;
  autoPromote(from: PositionId): void;
  undo(): void;
  canUndo: boolean;
}

export function useGameEngine(initialSeed?: number): GameEngine {
  const [state, setState] = useState<GameState>(() => createInitialState({ seed: initialSeed }));

  const dispatch = useCallback(
    (action: Action) => setState((prev) => reduceAction(prev, action)),
    []
  );

  const newGame = useCallback((seed?: number) => {
    setState(createInitialState({ seed }));
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
