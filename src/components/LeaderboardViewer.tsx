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

type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; entries: LeaderboardEntry[] }
  | { kind: "err"; message: string };

export function LeaderboardViewer({ lang, onClose }: Props) {
  const [tab, setTab] = useState<LeaderboardCategory>("won");
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const t = STRINGS[lang];
  const isWon = tab === "won";

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchLeaderboard(tab)
      .then((entries) => {
        if (!cancelled) setState({ kind: "ok", entries });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({ kind: "err", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, reloadToken]);

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
          {state.kind === "err" && (
            <div style={{ textAlign: "center" }}>
              <p className="lb__empty">{t.lbError}</p>
              <p className="lb__empty" style={{ fontSize: 12, opacity: 0.7 }}>
                {state.message}
              </p>
              <button
                type="button"
                className="hud__btn"
                onClick={() => setReloadToken((n) => n + 1)}
              >
                {t.lbRetry}
              </button>
            </div>
          )}
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
