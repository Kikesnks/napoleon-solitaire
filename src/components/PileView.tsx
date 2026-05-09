import type { CSSProperties } from "react";
import type { Card, PositionId } from "../game";
import { CardView } from "./CardView";

interface Props {
  id: PositionId;
  cards: Card[];
  label?: string;
  /** Si esta posición es un destino válido en el drag actual. */
  isDropTarget?: boolean;
  /** Visible cuando la posición está vacía: símbolo guía. */
  emptyGlyph?: string;
  /** Top draggable handlers. */
  onPointerDownTop?: (e: React.PointerEvent) => void;
  onClickTop?: () => void;
  /** Para que el contenedor mismo sea drop target cuando está vacío. */
  isPlayableEmpty?: boolean;
  /** Oculta la carta superior (en uso por overlay de drag). */
  hideTop?: boolean;
  /** Click en la pila vacía o entera (p.ej. monton para repartir). */
  onClickPile?: () => void;
  /** Pinta la(s) carta(s) en orientación horizontal (rotadas 90°). */
  horizontal?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PileView({
  id,
  cards,
  label,
  isDropTarget,
  emptyGlyph,
  onPointerDownTop,
  onClickTop,
  isPlayableEmpty,
  hideTop,
  onClickPile,
  horizontal = false,
  className = "",
  style
}: Props) {
  const top = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <div
      className={`pile ${horizontal ? "pile--horizontal" : ""} ${className} ${isDropTarget ? "pile--target" : ""}`}
      style={style}
      data-drop-target={id}
      data-pile-id={id}
      onClick={onClickPile}
    >
      {label != null && <div className="pile__label">{label}</div>}
      <div className="pile__slot" data-drop-target={id}>
        {cards.length === 0 && (
          <div className="pile__placeholder" data-drop-target={id}>
            {emptyGlyph ?? ""}
          </div>
        )}
        {top && (
          <div className="pile__card" data-drop-target={id}>
            <CardView
              card={top}
              onPointerDown={top.faceUp ? onPointerDownTop : undefined}
              onClick={top.faceUp ? onClickTop : undefined}
              inert={!top.faceUp || hideTop}
            />
            {hideTop && <div className="pile__hidden-overlay" data-drop-target={id} />}
          </div>
        )}
        {cards.length > 1 && (
          <div className="pile__count" aria-label={`${cards.length} cartas`}>
            {cards.length}
          </div>
        )}
        {cards.length === 0 && isPlayableEmpty && (
          <div className="pile__empty-target" data-drop-target={id} aria-hidden />
        )}
      </div>
    </div>
  );
}
