import { useState } from "react";
import { getLeaderboard, type LeaderboardCategory } from "../game/leaderboard";
import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { LbTable } from "./LeaderboardDialog";

interface Props {
  lang: Lang;
  onClose(): void;
}

export function LeaderboardViewer({ lang, onClose }: Props) {
  const [tab, setTab] = useState<LeaderboardCategory>("won");
  const t = STRINGS[lang];
  const isWon = tab === "won";
  const entries = getLeaderboard(tab);

  return (
    <div className="overlay lb-viewer" role="dialog" aria-modal="true" aria-labelledby="lb-viewer-title">
      <div className={`lb-viewer__panel ${isWon ? "lb-viewer__panel--won" : ""}`}>
        <header className={`lb-viewer__header ${isWon ? "lb-viewer__header--won" : ""}`}>
          <h2 id="lb-viewer-title" className="lb-viewer__title">
            {t.leaderboard}
          </h2>
          <div className="lb-viewer__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isWon}
              className={`lb-viewer__tab ${isWon ? "is-active" : ""}`}
              onClick={() => setTab("won")}
            >
              🏆 {t.lbTabWon}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isWon}
              className={`lb-viewer__tab ${!isWon ? "is-active" : ""}`}
              onClick={() => setTab("lost")}
            >
              {t.lbTabLost}
            </button>
          </div>
        </header>

        <div className={`lb-viewer__body ${isWon ? "lb-viewer__body--won" : ""}`}>
          <LbTable entries={entries} highlightTs={-1} lang={lang} />
        </div>

        <footer className={`lb-viewer__footer ${isWon ? "lb-viewer__footer--won" : ""}`}>
          <button type="button" className="hud__btn hud__btn--primary" onClick={onClose}>
            {t.close}
          </button>
        </footer>
      </div>
    </div>
  );
}
