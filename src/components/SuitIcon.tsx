import type { Card } from "../game";

/**
 * Glifos SVG para los cuatro palos. Inline en JSX (sin sprite externo) para
 * que el render sea idéntico en cualquier plataforma y para evitar la
 * confusión entre ♠ y ♣ de las fuentes Unicode (en muchos sistemas se ven
 * casi iguales). Los path-d son geométricos sencillos pensados para verse
 * limpios incluso a tamaño pequeño.
 *
 * Todos los iconos usan `currentColor` para heredar el rojo o negro de
 * .card--red / .card--black.
 */
export function SuitIcon({
  suit,
  className = ""
}: {
  suit: Card["suit"];
  className?: string;
}) {
  const cls = `suit ${className}`.trim();
  switch (suit) {
    case "spades":
      return (
        <svg viewBox="0 0 32 32" className={cls} aria-hidden>
          {/* Lóbulo invertido + tronco con base */}
          <path
            d="M16 2 C 9 11 2 17 2 22 C 2 26 5 28 8 28 C 11 28 13 26 15 23 L 13 30 L 19 30 L 17 23 C 19 26 21 28 24 28 C 27 28 30 26 30 22 C 30 17 23 11 16 2 Z"
            fill="currentColor"
          />
        </svg>
      );
    case "clubs":
      return (
        <svg viewBox="0 0 32 32" className={cls} aria-hidden>
          {/* Tres círculos en triángulo + tronco */}
          <circle cx="16" cy="9" r="6.2" fill="currentColor" />
          <circle cx="8" cy="19" r="6.2" fill="currentColor" />
          <circle cx="24" cy="19" r="6.2" fill="currentColor" />
          <path
            d="M14 20 L 12 30 L 20 30 L 18 20 Z"
            fill="currentColor"
          />
        </svg>
      );
    case "hearts":
      return (
        <svg viewBox="0 0 32 32" className={cls} aria-hidden>
          <path
            d="M16 28 C 4 19 2 12 6 7 C 10 2 14 4 16 8 C 18 4 22 2 26 7 C 30 12 28 19 16 28 Z"
            fill="currentColor"
          />
        </svg>
      );
    case "diamonds":
      return (
        <svg viewBox="0 0 32 32" className={cls} aria-hidden>
          <path d="M16 2 L 28 16 L 16 30 L 4 16 Z" fill="currentColor" />
        </svg>
      );
  }
}
