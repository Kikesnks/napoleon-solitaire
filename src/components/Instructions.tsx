import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";

interface Props {
  lang: Lang;
  onLangChange(next: Lang): void;
  /** Cierra la pantalla. Cuando es la primera vez, además marca "visto". */
  onDismiss(): void;
  /** Si el jugador entra por primera vez, mostramos "Empezar a jugar" en el
   *  botón principal en vez de "Cerrar". */
  firstRun: boolean;
}

export function Instructions({ lang, onLangChange, onDismiss, firstRun }: Props) {
  const t = STRINGS[lang];
  return (
    <div className="instructions" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <div className="instructions__panel">
        <header className="instructions__header">
          <h2 id="rules-title" className="instructions__title">
            {t.rulesTitle}
          </h2>
          <div className="instructions__lang" role="group" aria-label="Language">
            <button
              type="button"
              className={`instructions__lang-btn ${lang === "es" ? "is-active" : ""}`}
              onClick={() => onLangChange("es")}
              aria-pressed={lang === "es"}
            >
              ES
            </button>
            <button
              type="button"
              className={`instructions__lang-btn ${lang === "en" ? "is-active" : ""}`}
              onClick={() => onLangChange("en")}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
          </div>
        </header>

        <div className="instructions__body">
          {lang === "es" ? <RulesES /> : <RulesEN />}
        </div>

        <footer className="instructions__footer">
          <button
            type="button"
            className="hud__btn hud__btn--primary instructions__cta"
            onClick={onDismiss}
          >
            {firstRun ? t.play : t.close}
          </button>
        </footer>
      </div>
    </div>
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
        <h3>Disposición inicial</h3>
        <ul>
          <li>
            <strong>4 pilas A, B, C, D</strong>: 9 cartas boca abajo cada una con la carta
            superior boca arriba.
          </li>
          <li>
            <strong>4 free cells A1, B1, C1, D1</strong>: una carta boca arriba (sacada
            de la cima de A, B, C, D respectivamente).
          </li>
          <li>
            <strong>Fundaciones I, II, III, IV y X</strong>: vacías al empezar.
          </li>
          <li>
            <strong>Montón</strong>: las 64 cartas restantes, boca abajo.
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
          <li>Si están vacías aceptan cualquier carta boca arriba.</li>
          <li>
            Si tienen cartas, aceptan otra del <strong>mismo palo y color en orden
            ascendente</strong> (rango = top + 1). Sirven como buffers ascendentes.
          </li>
          <li>
            Cuando se vacían, la pila A/B/C/D correspondiente repone la free cell con
            su carta superior y voltea la siguiente carta tapada.
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
            <strong>Tap o clic</strong> en una carta: la auto-promueve a la mejor
            fundación posible.
          </li>
          <li>
            <strong>Arrastrar</strong>: la sueltas sobre cualquier fundación o free cell
            válida; el destino legal se ilumina en dorado.
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
        <h3>Initial setup</h3>
        <ul>
          <li>
            <strong>Four stacks A, B, C, D</strong>: 9 face-down cards each with the
            top card flipped face-up.
          </li>
          <li>
            <strong>Four free cells A1, B1, C1, D1</strong>: one face-up card (taken
            from the top of A, B, C, D respectively).
          </li>
          <li>
            <strong>Foundations I, II, III, IV and X</strong>: empty at start.
          </li>
          <li>
            <strong>Stock</strong>: the remaining 64 cards, face-down.
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
          <li>If empty they accept any face-up card.</li>
          <li>
            If they contain cards, they accept another card of the
            <strong> same suit and colour in ascending order</strong> (rank = top + 1).
            They act as ascending buffers.
          </li>
          <li>
            When empty, the matching A/B/C/D stack refills the free cell with its top
            card and flips the next face-down card.
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
            <strong>Tap or click</strong> a card: auto-promote it to the best matching
            foundation.
          </li>
          <li>
            <strong>Drag</strong> a card: drop it on any legal foundation or free cell;
            valid drop targets light up in gold.
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
