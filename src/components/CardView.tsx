import { memo } from "react";
import type { Card } from "../game";
import { SuitIcon } from "./SuitIcon";

const RANK_LABEL: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K"
};

export function rankLabel(card: Card): string {
  return RANK_LABEL[card.rank] ?? String(card.rank);
}

export function isRedSuit(suit: Card["suit"]): boolean {
  return suit === "hearts" || suit === "diamonds";
}

interface Props {
  card: Card;
  /** Si la carta está actualmente arrastrándose por el dedo/ratón. */
  dragging?: boolean;
  /** Posición absoluta cuando se está arrastrando. */
  dragX?: number;
  dragY?: number;
  width?: number;
  height?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: () => void;
  /** Hace la carta inerte a interacción (no top de pila). */
  inert?: boolean;
}

export const CardView = memo(function CardView({
  card,
  dragging = false,
  dragX,
  dragY,
  width,
  height,
  onPointerDown,
  onClick,
  inert = false
}: Props) {
  const classes = ["card"];
  if (!card.faceUp) classes.push("card--back");
  else classes.push(isRedSuit(card.suit) ? "card--red" : "card--black");
  if (dragging) classes.push("card--dragging");
  if (inert) classes.push("card--inert");

  const style: React.CSSProperties | undefined = dragging
    ? {
        position: "fixed",
        left: dragX,
        top: dragY,
        width,
        height,
        pointerEvents: "none",
        zIndex: 1000
      }
    : undefined;

  if (!card.faceUp) {
    return <div className={classes.join(" ")} style={style} aria-hidden />;
  }

  const rank = rankLabel(card);

  // Diseño de la carta:
  //  - Rango en la esquina superior izquierda (orientación normal)
  //  - Rango en la esquina inferior derecha (rotado 180°)
  //  - Un único símbolo de palo GRANDE en el centro
  // Las esquinas y el centro están en franjas distintas (top / middle / bottom)
  // para que el palo y el número no se solapen.
  return (
    <div
      className={classes.join(" ")}
      style={style}
      onPointerDown={inert ? undefined : onPointerDown}
      onClick={inert ? undefined : onClick}
      role={inert ? undefined : "button"}
      aria-label={`${rank} de ${card.suit}`}
    >
      <span className="card__rank card__rank--tl">{rank}</span>
      <span className="card__center" aria-hidden>
        <SuitIcon suit={card.suit} />
      </span>
      <span className="card__rank card__rank--br">{rank}</span>
    </div>
  );
});
