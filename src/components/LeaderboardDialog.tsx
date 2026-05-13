import type { LeaderboardCategory, LeaderboardEntry } from "../game/leaderboard";
import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";

const MEDALS = ["🥇", "🥈", "🥉"];

interface TableProps {
  entries: LeaderboardEntry[];
  highlightTs: number;
  lang: Lang;
}

export function LbTable({ entries, highlightTs, lang }: TableProps) {
  const t = STRINGS[lang];
  if (entries.length === 0) {
    return <p className="lb__empty">{t.lbEmpty}</p>;
  }
  return (
    <table className="lb__table">
      <thead>
        <tr>
          <th>#</th>
          <th>{t.lbColPlayer}</th>
          <th className="lb__col-r">{t.lbColScore}</th>
          <th className="lb__col-r">{t.lbColDate}</th>
          <th className="lb__col-r">{t.lbColSuits}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={e.ts} className={e.ts === highlightTs ? "lb__row--new" : ""}>
            <td className="lb__rank">{i < 3 ? MEDALS[i] : i + 1}</td>
            <td className="lb__name">{e.name}</td>
            <td className="lb__col-r lb__score-cell">{e.score}</td>
            <td className="lb__col-r lb__date">{e.date}</td>
            <td className="lb__col-r lb__suits">{e.suitMode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Props {
  lang: Lang;
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  /** ts de la entrada recién añadida para resaltarla; -1 en modo solo lectura. */
  highlightTs: number;
  onAccept(): void;
}

export function LeaderboardDialog({ lang, category, entries, highlightTs, onAccept }: Props) {
  const t = STRINGS[lang];
  const isWon = category === "won";

  return (
    <div className="overlay lb-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-dialog-title">
      <div className={`overlay__panel lb-dialog__panel ${isWon ? "lb-dialog__panel--won" : ""}`}>
        <h2 id="lb-dialog-title" className="lb-dialog__title">
          {isWon ? t.lbWonTitle : t.lbLostTitle}
        </h2>
        <div className="lb-dialog__body">
          <LbTable entries={entries} highlightTs={highlightTs} lang={lang} />
        </div>
        <button
          type="button"
          className="hud__btn hud__btn--primary lb-dialog__accept"
          onClick={onAccept}
        >
          {t.lbAccept}
        </button>
      </div>
    </div>
  );
}
