import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { formatElapsed } from "../hooks/useTimer";

interface Props {
  lang: Lang;
  score: number;
  elapsedMs: number;
  round: number;
  moves: number;
  montonRemaining: number;
  canUndo: boolean;
  onUndo(): void;
  onNewGame(): void;
  onShowRules(): void;
  onShowLeaderboard(): void;
  onShowPrivacy(): void;
}

export function HUD({
  lang,
  score,
  elapsedMs,
  round,
  moves,
  montonRemaining,
  canUndo,
  onUndo,
  onNewGame,
  onShowRules,
  onShowLeaderboard,
  onShowPrivacy
}: Props) {
  const t = STRINGS[lang];
  return (
    <header className="hud">
      <div className="hud__stats">
        <Stat label={t.time} short={t.timeShort} value={formatElapsed(elapsedMs)} />
        <Stat label={t.score} short={t.scoreShort} value={score.toString()} />
        <Stat label={t.round} short={t.roundShort} value={`${round}/4`} />
        <Stat label={t.moves} short={t.movesShort} value={moves.toString()} />
        <Stat label={t.monton} short={t.montonShort} value={montonRemaining.toString()} />
      </div>
      {/*
        En pantallas estrechas el CSS oculta `.hud__btn-text` y deja sólo el
        icono. El nombre sigue en `aria-label` y en `title`, así que ni la
        accesibilidad ni el ratón pierden nada.
      */}
      <div className="hud__actions">
        <button
          type="button"
          className="hud__btn hud__btn--icon"
          onClick={onShowLeaderboard}
          aria-label={t.leaderboard}
          title={t.leaderboard}
        >
          🏆
        </button>
        <button
          type="button"
          className="hud__btn"
          onClick={onShowRules}
          aria-label={t.rules}
          title={t.rules}
        >
          <span className="hud__btn-icon" aria-hidden="true">
            📖
          </span>
          <span className="hud__btn-text"> {t.rules}</span>
        </button>
        {/*
          Privacidad en el menú principal, no sólo dentro de las reglas: con el
          RGPD europeo la política tiene que estar a la vista, y además es
          nuestro argumento de venta — esconderla sería contraproducente.

          Con el candado a secas nadie adivina para qué sirve, así que lleva
          texto como los demás. Va la etiqueta corta ("Privacidad"), no el
          título completo, que en francés no cabría en la barra.
        */}
        <button
          type="button"
          className="hud__btn"
          onClick={onShowPrivacy}
          aria-label={t.privacyTitle}
          title={t.privacyTitle}
        >
          <span className="hud__btn-icon" aria-hidden="true">
            🔒
          </span>
          <span className="hud__btn-text"> {t.privacyShort}</span>
        </button>
        <button
          type="button"
          className="hud__btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t.undo}
          title={t.undo}
        >
          <span className="hud__btn-icon" aria-hidden="true">
            ↶
          </span>
          <span className="hud__btn-text"> {t.undo}</span>
        </button>
        <button
          type="button"
          className="hud__btn hud__btn--primary"
          onClick={onNewGame}
          aria-label={t.newGame}
          title={t.newGame}
        >
          <span className="hud__btn-icon" aria-hidden="true">
            ✚
          </span>
          <span className="hud__btn-text"> {t.newGame}</span>
        </button>
      </div>
    </header>
  );
}

/**
 * Un dato del marcador. El nombre va completo cuando hay sitio y abreviado en
 * pantallas estrechas (lo decide el CSS, no JS: así no hay que escuchar el
 * `resize` ni se ve un parpadeo al girar el móvil).
 *
 * Los dos rótulos visibles quedan fuera del árbol de accesibilidad y es el
 * valor quien lleva el nombre completo: si no, un lector de pantalla leería la
 * abreviatura, o el rótulo dos veces. El `title` deja el nombre completo a un
 * palmo del ratón cuando lo que se ve es "Pts".
 */
function Stat({ label, short, value }: { label: string; short: string; value: string }) {
  return (
    <div className="hud__stat" title={label}>
      <div className="hud__stat-label" aria-hidden="true">
        <span className="hud__stat-label--long">{label}</span>
        <span className="hud__stat-label--short">{short}</span>
      </div>
      <div className="hud__stat-value" aria-label={`${label}: ${value}`}>
        {value}
      </div>
    </div>
  );
}
