import { formatElapsed } from "../hooks/useTimer";
import type { Status } from "../game";

interface Props {
  status: Status;
  score: number;
  elapsedMs: number;
  onPlayAgain(): void;
}

export function GameOverlay({ status, score, elapsedMs, onPlayAgain }: Props) {
  if (status === "playing") return null;
  const won = status === "won";
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className={`overlay__panel ${won ? "overlay__panel--win" : "overlay__panel--lose"}`}>
        <h2 className="overlay__title">{won ? "¡Has ganado!" : "Fin de la partida"}</h2>
        <p className="overlay__message">
          {won
            ? "Solitario completado."
            : "Se acabaron los repartos del montón sin ordenar todas las cartas."}
        </p>
        <dl className="overlay__stats">
          <div>
            <dt>Puntuación</dt>
            <dd>{score}</dd>
          </div>
          <div>
            <dt>Tiempo</dt>
            <dd>{formatElapsed(elapsedMs)}</dd>
          </div>
        </dl>
        <button type="button" className="hud__btn hud__btn--primary" onClick={onPlayAgain}>
          Jugar otra
        </button>
      </div>
    </div>
  );
}
