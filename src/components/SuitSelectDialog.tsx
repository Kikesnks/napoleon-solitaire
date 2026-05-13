import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import type { SuitMode } from "../game";
import { SuitIcon } from "./SuitIcon";

interface Props {
  lang: Lang;
  /** Si false, no se muestra el botón Cancelar (primer arranque o partida acabada). */
  canCancel: boolean;
  onSelect(mode: SuitMode): void;
  onCancel(): void;
}

export function SuitSelectDialog({ lang, canCancel, onSelect, onCancel }: Props) {
  const t = STRINGS[lang];
  return (
    <div
      className="overlay suit-select"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suit-select-title"
    >
      <div className="overlay__panel suit-select__panel">
        <h2 id="suit-select-title" className="overlay__title">
          {t.chooseSuits}
        </h2>

        <div className="suit-select__options">
          <button
            type="button"
            className="suit-select__option"
            onClick={() => onSelect(2)}
          >
            <div className="suit-select__icons">
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="hearts" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="spades" />
              </span>
            </div>
            <span className="suit-select__name">{t.twoSuits}</span>
            <span className="suit-select__desc">{t.twoSuitsDesc}</span>
          </button>

          <button
            type="button"
            className="suit-select__option"
            onClick={() => onSelect(4)}
          >
            <div className="suit-select__icons">
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="hearts" />
              </span>
              <span className="suit-select__icon suit-select__icon--red">
                <SuitIcon suit="diamonds" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="spades" />
              </span>
              <span className="suit-select__icon suit-select__icon--black">
                <SuitIcon suit="clubs" />
              </span>
            </div>
            <span className="suit-select__name">{t.fourSuits}</span>
            <span className="suit-select__desc">{t.fourSuitsDesc}</span>
          </button>
        </div>

        {canCancel && (
          <button type="button" className="hud__btn suit-select__cancel" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
