import { useEffect, useState } from "react";
import {
  fetchLeaderboard,
  type LeaderboardCategory,
  type LeaderboardEntry
} from "../game/leaderboard";
import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";
import { LbTable } from "./LeaderboardDialog";

interface Props {
  lang: Lang;
  onClose(): void;
}

// Sin estado de error a propósito: `fetchLeaderboard` cae al ranking local
// cuando no hay servidor (portales, sin conexión), así que un mensaje técnico
// en pantalla sólo significaría que algo se nos ha escapado.
type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; entries: LeaderboardEntry[] };

export function LeaderboardViewer({ lang, onClose }: Props) {
  const [tab, setTab] = useState<LeaderboardCategory>("won");
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const t = STRINGS[lang];
  const isWon = tab === "won";

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchLeaderboard(tab)
      .then((entries) => {
        if (!cancelled) setState({ kind: "ok", entries });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "ok", entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

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
          {state.kind === "loading" && <p className="lb__empty">{t.lbLoading}</p>}
          {state.kind === "ok" && (
            <LbTable entries={state.entries} highlightTs={-1} lang={lang} />
          )}
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
