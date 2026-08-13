import type { Lang } from "../i18n/strings";
import { LANG_LABELS, LANG_ORDER, STRINGS } from "../i18n/strings";

/**
 * Diagrama del tablero a escala reducida. Mismo layout en cruz que la página 9
 * del PDF de reglas y que `Board.tsx`: 6 columnas (col 3 más ancha para
 * acomodar las cartas horizontales), 4 filas, sub-stacks B1+B y D+D1 en col 3,
 * pilas de reparto en su propia fila centradas bajo X. Las etiquetas
 * universales (A, B, C, ..., I, II, ..., 1-4, X, M) no necesitan traducción.
 */
function BoardDiagram() {
  return (
    <figure className="diagram" aria-label="Disposición del tablero / Board layout">
      <div className="diagram__grid">
        <Slot id="I" />
        <Slot id="II" />
        <div className="diagram__substack diagram__substack--top">
          <Slot id="B1" horizontal />
          <Slot id="B" horizontal />
        </div>
        <Slot id="III" />
        <Slot id="IV" />
        <Slot id="M" emphasis />

        <Slot id="A1" />
        <Slot id="A" />
        <Slot id="X" />
        <Slot id="C" />
        <Slot id="C1" />

        <div className="diagram__substack diagram__substack--bot">
          <Slot id="D" horizontal />
          <Slot id="D1" horizontal />
        </div>

        <div className="diagram__deal">
          <Slot id="1" />
          <Slot id="2" />
          <Slot id="3" />
          <Slot id="4" />
        </div>
      </div>
    </figure>
  );
}

function Slot({
  id,
  horizontal = false,
  emphasis = false
}: {
  id: string;
  horizontal?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`diagram__slot ${horizontal ? "diagram__slot--horizontal" : ""} ${emphasis ? "diagram__slot--emphasis" : ""}`}
      data-pos={id}
    >
      <span>{id}</span>
    </div>
  );
}

interface Props {
  lang: Lang;
  onLangChange(next: Lang): void;
  /** Cierra la pantalla. La primera vez además marca "visto" en localStorage. */
  onDismiss(): void;
  /** Si es true, el cierre conduce a empezar partida (selector de palos);
   *  mostramos "Empezar a jugar". Si es false (consulta desde el HUD durante
   *  la partida), mostramos "Cerrar". */
  showPlayButton: boolean;
  /** Abre la politica de privacidad, que vive en App para poder abrirse
   *  tambien desde el HUD. */
  onShowPrivacy(): void;
}

export function Instructions({
  lang,
  onLangChange,
  onDismiss,
  showPlayButton,
  onShowPrivacy
}: Props) {
  const t = STRINGS[lang];
  return (
    <div className="instructions" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <div className="instructions__panel">
        <header className="instructions__header">
          <h2 id="rules-title" className="instructions__title">
            {t.rulesTitle}
          </h2>
          <div className="instructions__lang" role="group" aria-label="Language">
            {LANG_ORDER.map((code) => {
              const { flag, name } = LANG_LABELS[code];
              return (
                <button
                  key={code}
                  type="button"
                  className={`instructions__lang-btn ${lang === code ? "is-active" : ""}`}
                  onClick={() => onLangChange(code)}
                  aria-pressed={lang === code}
                  lang={code}
                  title={name}
                >
                  <span className="instructions__lang-flag" aria-hidden="true">
                    {flag}
                  </span>
                  <span className="instructions__lang-name">{name}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="instructions__body">
          {/* Arriba del todo, no al final del scroll: si el jugador tiene que
              buscarlo, deja de ser un argumento de venta. */}
          <PrivacyNote lang={lang} onOpenPrivacy={onShowPrivacy} />
          {lang === "es" ? <RulesES /> : lang === "fr" ? <RulesFR /> : <RulesEN />}
        </div>

        <footer className="instructions__footer">
          <button
            type="button"
            className="hud__btn instructions__privacy-link"
            onClick={onShowPrivacy}
          >
            🔒 {t.privacyTitle}
          </button>
          <button
            type="button"
            className="hud__btn hud__btn--primary instructions__cta"
            onClick={onDismiss}
          >
            {showPlayButton ? t.play : t.close}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Nota de privacidad. No es un trámite legal escondido en la letra pequeña: es
 * nuestro diferenciador y va donde se ve — principio rector nº 3 del plan de
 * monetización. Se redacta SIEMPRE referida al juego, nunca a la página que lo
 * aloja: en un portal, los anuncios y las cookies de alrededor son suyos.
 */
function PrivacyNote({ lang, onOpenPrivacy }: { lang: Lang; onOpenPrivacy(): void }) {
  const t = STRINGS[lang];
  return (
    <section className="privacy-note">
      <p className="privacy-note__badge">🔒 {t.privacyBadge}</p>
      <p className="privacy-note__body">
        {lang === "es" && (
          <>
            Este juego <strong>no recopila ninguna información sobre ti</strong>. No hay cuentas,
            ni registro, ni correo, ni perfilado, ni venta de datos. Lo único que se guarda es lo
            imprescindible para jugar —tu idioma, la dificultad elegida y tus mejores partidas— y{" "}
            <strong>se queda en tu dispositivo</strong>.
          </>
        )}
        {lang === "en" && (
          <>
            This game <strong>collects no information about you</strong>. No accounts, no sign-up,
            no email, no profiling, no data selling. The only things stored are what the game needs
            to work — your language, your chosen difficulty and your best games — and{" "}
            <strong>they stay on your device</strong>.
          </>
        )}
        {lang === "fr" && (
          <>
            Ce jeu <strong>ne collecte aucune information sur vous</strong>. Ni compte, ni
            inscription, ni e-mail, ni profilage, ni revente de données. Seul l'indispensable est
            conservé —votre langue, la difficulté choisie et vos meilleures parties— et{" "}
            <strong>cela reste sur votre appareil</strong>.
          </>
        )}
      </p>
      <button type="button" className="privacy-note__link" onClick={onOpenPrivacy}>
        {t.privacyTitle} →
      </button>
    </section>
  );
}

// ---------- Contenido en español ----------

function RulesES() {
  return (
    <>
      <section>
        <h3>Objetivo</h3>
        <p>
          Ordenar las 104 cartas (dos barajas francesas) en 8 secuencias completas. Cada
          secuencia se construye sobre una de las posiciones I, II, III, IV o X y se
          retira automáticamente del tablero cuando se completa.
        </p>
      </section>

      <section>
        <h3>Disposición del tablero</h3>
        <BoardDiagram />
        <ul>
          <li>
            <strong>I, II, III, IV</strong>: fundaciones descendentes.
          </li>
          <li>
            <strong>X</strong>: fundación ascendente.
          </li>
          <li>
            <strong>A, B, C, D</strong>: pilas iniciales, 9 cartas cada una con la
            superior boca arriba.
          </li>
          <li>
            <strong>A1, B1, C1, D1</strong>: free cells (B1 y D1 horizontales).
          </li>
          <li>
            <strong>1, 2, 3, 4</strong>: pilas donde se vuelcan las cartas del montón
            durante la ronda.
          </li>
          <li>
            <strong>M</strong>: montón (las 64 cartas restantes boca abajo al empezar).
          </li>
        </ul>
      </section>

      <section>
        <h3>Cómo se completan las fundaciones</h3>
        <ul>
          <li>
            <strong>I, II, III, IV (descendente)</strong>: empiezan con un Rey (K) y
            siguen Q, J, 10, ..., 2, A. Mismo palo y color. Al colocar el As toda la pila
            se retira y la posición queda libre para otro Rey.
          </li>
          <li>
            <strong>X (ascendente)</strong>: empieza con un As (A) y sigue 2, 3, ..., Q,
            K. Mismo palo y color. Al colocar el Rey la pila se retira y queda libre
            para otro As.
          </li>
        </ul>
      </section>

      <section>
        <h3>Free cells A1, B1, C1, D1</h3>
        <ul>
          <li>
            Aceptan otra carta del <strong>mismo palo y color en orden
              ascendente</strong> (rango = top + 1). Sirven como buffers ascendentes.
          </li>
          <li>
            Cuando se vacían, la pila A/B/C/D correspondiente repone la free cell con
            su carta superior y voltea la siguiente carta tapada.
          </li>
          <li>
            Cuando se vacían las 4 free cells, y no hay cartas en las pilas A, B, C, D
            no se pueden seguir moviendo cartas a las free cells.
          </li>
        </ul>
      </section>

      <section>
        <h3>Reparto del montón por rondas</h3>
        <ul>
          <li>Ronda 1: 4 cartas por reparto sobre las pilas 1, 2, 3, 4.</li>
          <li>Ronda 2: 3 cartas sobre las pilas 1, 2, 3.</li>
          <li>Ronda 3: 2 cartas sobre las pilas 1, 2.</li>
          <li>Ronda 4 (final): 1 carta sobre la pila 1.</li>
        </ul>
        <p>
          Cuando el montón se agota se juntan las pilas (1 sobre 2, sobre 3, sobre 4),
          se voltean boca abajo SIN BARAJAR y se pasa a la siguiente ronda.
        </p>
        <p>
          Si al terminar la ronda 4 no se han ordenado todas las cartas, la partida
          termina perdida.
        </p>
      </section>

      <section>
        <h3>Encadenado a fundación</h3>
        <p>
          Al mover una carta desde A1, B1, C1, D1 o X a una fundación, todas las cartas
          que ya estaban en el origen y que siguen encajando en orden se promueven en el
          mismo movimiento.
        </p>
      </section>

      <section>
        <h3>Controles</h3>
        <ul>
          <li>
            <strong>Arrastrar</strong>: la sueltas sobre cualquier fundación o free cell
            válida.
          </li>
          <li>
            <strong>Tocar una carta</strong>: sube a una fundación si encaja en alguna.
            Nunca sube nada sola: sólo se mueve lo que tocas. Si la carta vale para más
            de una fundación y quieres elegir, arrástrala.
          </li>
          <li>
            <strong>Tap en el montón</strong>: reparte la siguiente tirada. Cuando está
            vacío y queda ronda, recoge las pilas y avanza.
          </li>
          <li>
            <strong>Botón ↶ Deshacer</strong> o tecla <kbd>U</kbd>: revierte el último
            movimiento.
          </li>
          <li>
            <strong>Espacio</strong>: atajo del reparto.
          </li>
          <li>
            <strong>Botón Nueva</strong>: empieza partida nueva con un mazo nuevo.
          </li>
        </ul>
      </section>
    </>
  );
}

// ---------- English version ----------

function RulesEN() {
  return (
    <>
      <section>
        <h3>Goal</h3>
        <p>
          Order all 104 cards (two French decks) into 8 complete sequences. Each
          sequence is built on one of positions I, II, III, IV or X and is automatically
          removed from the board once completed.
        </p>
      </section>

      <section>
        <h3>Board layout</h3>
        <BoardDiagram />
        <ul>
          <li>
            <strong>I, II, III, IV</strong>: descending foundations.
          </li>
          <li>
            <strong>X</strong>: ascending foundation.
          </li>
          <li>
            <strong>A, B, C, D</strong>: initial stacks, 9 cards each with the top one
            flipped face-up.
          </li>
          <li>
            <strong>A1, B1, C1, D1</strong>: free cells (B1 and D1 are horizontal).
          </li>
          <li>
            <strong>1, 2, 3, 4</strong>: deal piles where stock cards land during a
            round.
          </li>
          <li>
            <strong>M</strong>: stock (the remaining 64 cards, face-down at start).
          </li>
        </ul>
      </section>

      <section>
        <h3>Completing foundations</h3>
        <ul>
          <li>
            <strong>I, II, III, IV (descending)</strong>: start with a King (K) and run
            Q, J, 10, ..., 2, A — same suit and colour. When the Ace lands, the whole
            pile is removed and the position is free for another King.
          </li>
          <li>
            <strong>X (ascending)</strong>: starts with an Ace (A) and runs 2, 3, ...,
            Q, K — same suit and colour. When the King lands, the pile is removed and
            the position is free for another Ace.
          </li>
        </ul>
      </section>

      <section>
        <h3>Free cells A1, B1, C1, D1</h3>
        <ul>
          <li>
            They accept another card of the
            <strong> same suit and colour in ascending order</strong> (rank = top + 1).
            They act as ascending buffers.
          </li>
          <li>
            When empty, the matching A/B/C/D stack refills the free cell with its top
            card and flips the next face-down card.
          </li>
          <li>
            When all 4 free cells are empty, and there are no cards left in piles
            A, B, C, D, no further moves can be made to free cells.
          </li>
        </ul>
      </section>

      <section>
        <h3>Dealing the stock by rounds</h3>
        <ul>
          <li>Round 1: deals of 4 cards onto piles 1, 2, 3, 4.</li>
          <li>Round 2: deals of 3 cards onto piles 1, 2, 3.</li>
          <li>Round 3: deals of 2 cards onto piles 1, 2.</li>
          <li>Round 4 (final): deals of 1 card onto pile 1.</li>
        </ul>
        <p>
          When the stock runs out, the deal piles are gathered (1 onto 2, onto 3,
          onto 4), flipped face-down WITHOUT SHUFFLING, and the next round starts.
        </p>
        <p>
          If at the end of round 4 the cards are not all ordered, the game is lost.
        </p>
      </section>

      <section>
        <h3>Chained foundation moves</h3>
        <p>
          When you move a card from A1, B1, C1, D1 or X onto a foundation, every card
          already in the source that still fits the foundation order is promoted in
          the same move.
        </p>
      </section>

      <section>
        <h3>Controls</h3>
        <ul>
          <li>
            <strong>Drag</strong> a card: drop it on any legal foundation or free cell.
          </li>
          <li>
            <strong>Tap a card</strong>: it moves up to a foundation if it fits one.
            Nothing ever moves on its own — only what you tap. If the card fits more than
            one foundation and you want to choose, drag it instead.
          </li>
          <li>
            <strong>Tap on the stock</strong>: deal the next batch. When empty and a
            round remains, gathers the piles and advances.
          </li>
          <li>
            <strong>↶ Undo button</strong> or <kbd>U</kbd> key: revert the last move.
          </li>
          <li>
            <strong>Spacebar</strong>: shortcut for dealing.
          </li>
          <li>
            <strong>New button</strong>: start a fresh game with a new deck.
          </li>
        </ul>
      </section>
    </>
  );
}

// ---------- Contenido en francés ----------
// Terminología de cartomancie francesa: "couleur" = palo, "réussite" = solitario,
// "talon" = montón, "cases libres" = free cells.

function RulesFR() {
  return (
    <>
      <section>
        <h3>But du jeu</h3>
        <p>
          Ranger les 104 cartes (deux jeux français) en 8 séquences complètes. Chaque
          séquence se construit sur l'une des positions I, II, III, IV ou X et se
          retire automatiquement du tableau une fois terminée.
        </p>
      </section>

      <section>
        <h3>Disposition du tableau</h3>
        <BoardDiagram />
        <ul>
          <li>
            <strong>I, II, III, IV</strong> : fondations descendantes.
          </li>
          <li>
            <strong>X</strong> : fondation ascendante.
          </li>
          <li>
            <strong>A, B, C, D</strong> : piles initiales de 9 cartes, la première
            retournée face visible.
          </li>
          <li>
            <strong>A1, B1, C1, D1</strong> : cases libres (B1 et D1 sont horizontales).
          </li>
          <li>
            <strong>1, 2, 3, 4</strong> : piles de distribution où tombent les cartes du
            talon pendant le tour.
          </li>
          <li>
            <strong>M</strong> : talon (les 64 cartes restantes, faces cachées au début).
          </li>
        </ul>
      </section>

      <section>
        <h3>Compléter les fondations</h3>
        <ul>
          <li>
            <strong>I, II, III, IV (descendantes)</strong> : commencent par un Roi (K)
            puis D, V, 10, ..., 2, A — même couleur. Dès que l'As est posé, la pile
            entière est retirée et la position se libère pour un autre Roi.
          </li>
          <li>
            <strong>X (ascendante)</strong> : commence par un As (A) puis 2, 3, ..., D,
            R — même couleur. Dès que le Roi est posé, la pile est retirée et la
            position se libère pour un autre As.
          </li>
        </ul>
      </section>

      <section>
        <h3>Cases libres A1, B1, C1, D1</h3>
        <ul>
          <li>
            Elles acceptent une carte de la
            <strong> même couleur, en ordre ascendant</strong> (rang = sommet + 1).
            Elles servent de réserves ascendantes.
          </li>
          <li>
            Lorsqu'une case se vide, la pile A/B/C/D correspondante la regarnit avec sa
            carte du dessus et retourne la carte cachée suivante.
          </li>
          <li>
            Quand les 4 cases libres sont vides et qu'il ne reste plus de cartes dans
            les piles A, B, C et D, plus aucun déplacement vers les cases libres n'est
            possible.
          </li>
        </ul>
      </section>

      <section>
        <h3>Distribution du talon par tours</h3>
        <ul>
          <li>Tour 1 : donnes de 4 cartes sur les piles 1, 2, 3 et 4.</li>
          <li>Tour 2 : donnes de 3 cartes sur les piles 1, 2 et 3.</li>
          <li>Tour 3 : donnes de 2 cartes sur les piles 1 et 2.</li>
          <li>Tour 4 (dernier) : donnes d'une carte sur la pile 1.</li>
        </ul>
        <p>
          Lorsque le talon est épuisé, les piles de distribution sont ramassées (1 sur
          2, puis sur 3, puis sur 4), retournées faces cachées SANS ÊTRE MÉLANGÉES, et
          le tour suivant commence.
        </p>
        <p>
          Si à la fin du tour 4 les cartes ne sont pas toutes rangées, la partie est
          perdue.
        </p>
      </section>

      <section>
        <h3>Enchaînement vers une fondation</h3>
        <p>
          Lorsque vous déplacez une carte depuis A1, B1, C1, D1 ou X vers une fondation,
          toutes les cartes déjà présentes à l'origine qui respectent encore l'ordre de
          la fondation y montent dans le même mouvement.
        </p>
      </section>

      <section>
        <h3>Commandes</h3>
        <ul>
          <li>
            <strong>Glisser</strong> une carte : déposez-la sur une fondation ou une case
            libre valide.
          </li>
          <li>
            <strong>Toucher une carte</strong> : elle monte sur une fondation si elle y
            entre. Rien ne monte tout seul : seule la carte touchée bouge. Si elle convient
            à plusieurs fondations et que vous voulez choisir, faites-la glisser.
          </li>
          <li>
            <strong>Toucher le talon</strong> : distribue la donne suivante. S'il est
            vide et qu'il reste un tour, ramasse les piles et passe au tour suivant.
          </li>
          <li>
            <strong>Bouton ↶ Annuler</strong> ou touche <kbd>U</kbd> : revient sur le
            dernier coup.
          </li>
          <li>
            <strong>Barre d'espace</strong> : raccourci pour distribuer.
          </li>
          <li>
            <strong>Bouton Nouvelle</strong> : lance une partie avec un nouveau jeu.
          </li>
        </ul>
      </section>
    </>
  );
}
