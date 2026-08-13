import { useCallback, useMemo } from "react";
import {
  activePilesFor,
  canPlace,
  isValidSource,
  topOf,
  type GameState,
  type PositionId
} from "../game";
import { useDragDrop } from "../hooks/useDragDrop";
import { CardView } from "./CardView";
import { PileView } from "./PileView";

interface Props {
  state: GameState;
  /** Cuando es true se aplica `.board--dealing` y las cartas iniciales
   *  entran con stagger CSS — animación de reparto al empezar partida. */
  dealing?: boolean;
  onMove(from: PositionId, to: PositionId): void;
  onDeal(): void;
  /** Toque/clic sobre una carta: la sube a una fundación si cabe en alguna. */
  onPromote(from: PositionId): void;
}

/**
 * Layout en cruz, página 9 del PDF (POSICION DE TODAS LAS CARTAS II):
 *
 *   I   II   [B1]   III  IV   M
 *            [B]
 *   A1  A    [X]    C    C1
 *            [D]
 *            [D1]
 *        [1] [2] [3] [4]
 *
 * B1, B, D, D1 horizontales (rotadas y escaladas a 1/1.45 para que dos cartas
 * apiladas equivalgan en altura a una vertical). El layout entero usa CSS Grid
 * con áreas con nombre — ver `index.css` sección "Tablero - layout en cruz".
 */
export function Board({ state, dealing = false, onMove, onDeal, onPromote }: Props) {
  const isLegalTarget = useCallback(
    (from: PositionId, to: PositionId) => {
      if (from === to) return false;
      if (!isValidSource(from)) return false;
      const card = topOf(state, from);
      if (!card || !card.faceUp) return false;
      return canPlace(card, to, topOf(state, to), from);
    },
    [state]
  );

  const { drag, hoveredTarget, beginDrag } = useDragDrop({
    onDrop: onMove,
    onTap: onPromote,
    isLegalTarget
  });

  const draggingCard = useMemo(() => (drag ? topOf(state, drag.from) : null), [drag, state]);

  const dropHinted = useCallback(
    (id: PositionId) => hoveredTarget === id,
    [hoveredTarget]
  );

  const pileFor = (id: PositionId) => state.positions[id];
  const isHidden = (id: PositionId) => drag?.from === id;

  return (
    <div className={`board ${dealing ? "board--dealing" : ""}`}>
      {/* Fila 0 (arriba del todo): 8 slots de fundaciones completadas. */}
      <div className="board__completed" aria-label="Fundaciones completadas">
        {Array.from({ length: 8 }, (_, i) => {
          const card = state.completed[i];
          return (
            <div className="completed-slot" key={i} data-filled={card ? "yes" : "no"}>
              {card ? <CardView card={card} inert /> : null}
            </div>
          );
        })}
      </div>

      {/* Fila 1: I  II  [substack-top: B1+B]  III  IV  M */}
      <PileView
        id="I"
        cards={pileFor("I")}
        label="I"
        emptyGlyph="K"
        isDropTarget={dropHinted("I")}
        isPlayableEmpty
      />
      <PileView
        id="II"
        cards={pileFor("II")}
        label="II"
        emptyGlyph="K"
        isDropTarget={dropHinted("II")}
        isPlayableEmpty
      />
      <div className="board__substack board__substack--top">
        <PileView
          id="B1"
          cards={pileFor("B1")}
          label="B1"
          horizontal
          isDropTarget={dropHinted("B1")}
          isPlayableEmpty
          onPointerDownTop={(e) => beginDrag(e, "B1")}
          hideTop={isHidden("B1")}
        />
        <PileView
          id="B"
          cards={pileFor("B")}
          label="B"
          horizontal
          onPointerDownTop={(e) => beginDrag(e, "B")}
          hideTop={isHidden("B")}
        />
      </div>
      <PileView
        id="III"
        cards={pileFor("III")}
        label="III"
        emptyGlyph="K"
        isDropTarget={dropHinted("III")}
        isPlayableEmpty
      />
      <PileView
        id="IV"
        cards={pileFor("IV")}
        label="IV"
        emptyGlyph="K"
        isDropTarget={dropHinted("IV")}
        isPlayableEmpty
      />
      <PileView
        id="monton"
        cards={pileFor("monton")}
        label="Montón"
        emptyGlyph={pileFor("monton").length === 0 ? "↻" : ""}
        onClickPile={onDeal}
        className={pileFor("monton").length === 0 ? "pile--monton-empty" : ""}
      />

      {/* Fila 2: A1  A  X  C  C1  (col 6 vacía) */}
      <PileView
        id="A1"
        cards={pileFor("A1")}
        label="A1"
        isDropTarget={dropHinted("A1")}
        isPlayableEmpty
        onPointerDownTop={(e) => beginDrag(e, "A1")}
        hideTop={isHidden("A1")}
      />
      <PileView
        id="A"
        cards={pileFor("A")}
        label="A"
        onPointerDownTop={(e) => beginDrag(e, "A")}
        hideTop={isHidden("A")}
      />
      <PileView
        id="X"
        cards={pileFor("X")}
        label="X"
        emptyGlyph="A"
        isDropTarget={dropHinted("X")}
        isPlayableEmpty
        onPointerDownTop={(e) => beginDrag(e, "X")}
        hideTop={isHidden("X")}
      />
      <PileView
        id="C"
        cards={pileFor("C")}
        label="C"
        onPointerDownTop={(e) => beginDrag(e, "C")}
        hideTop={isHidden("C")}
      />
      <PileView
        id="C1"
        cards={pileFor("C1")}
        label="C1"
        isDropTarget={dropHinted("C1")}
        isPlayableEmpty
        onPointerDownTop={(e) => beginDrag(e, "C1")}
        hideTop={isHidden("C1")}
      />

      {/* Fila 3: D + D1 horizontales en col 3 */}
      <div className="board__substack board__substack--bot">
        <PileView
          id="D"
          cards={pileFor("D")}
          label="D"
          horizontal
          onPointerDownTop={(e) => beginDrag(e, "D")}
          hideTop={isHidden("D")}
        />
        <PileView
          id="D1"
          cards={pileFor("D1")}
          label="D1"
          horizontal
          isDropTarget={dropHinted("D1")}
          isPlayableEmpty
          onPointerDownTop={(e) => beginDrag(e, "D1")}
          hideTop={isHidden("D1")}
        />
      </div>

      {/* Fila 4: SOLO los slots activos según la ronda (4 en R1, 3 en R2, 2
          en R3, 1 en R4). Centrados horizontalmente. La línea fina superior
          separa visualmente del substack D/D1. */}
      <div className="board__deal">
        {activePilesFor(state.round).map((id) => (
          <PileView
            key={id}
            id={id}
            cards={pileFor(id)}
            label={id.replace("pile", "")}
            onPointerDownTop={(e) => beginDrag(e, id)}
            hideTop={isHidden(id)}
          />
        ))}
      </div>

      {/* Capa de drag flotante (vive fuera del grid; portrait, sin rotación) */}
      {drag && draggingCard && (
        <CardView
          card={draggingCard}
          dragging
          dragX={drag.pointerX - drag.offsetX}
          dragY={drag.pointerY - drag.offsetY}
          width={drag.width}
          height={drag.height}
        />
      )}
    </div>
  );
}
