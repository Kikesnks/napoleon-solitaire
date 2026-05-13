import { useEffect, useRef, useState } from "react";
import type { LeaderboardCategory } from "../game/leaderboard";
import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";

interface Props {
  lang: Lang;
  category: LeaderboardCategory;
  score: number;
  onSave(name: string): void;
}

export function NameEntryDialog({ lang, category, score, onSave }: Props) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = STRINGS[lang];
  const isWon = category === "won";

  useEffect(() => {
    // Pequeño delay para que el foco no interfiera con animaciones de entrada.
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="overlay lb-entry" role="dialog" aria-modal="true" aria-labelledby="lb-entry-title">
      <div className={`overlay__panel lb-entry__panel ${isWon ? "lb-entry__panel--won" : ""}`}>
        <div className="lb-entry__icon">{isWon ? "🏆" : "⭐"}</div>
        <h2 id="lb-entry-title" className="lb-entry__title">
          {t.lbEnterTitle}
        </h2>
        <p className="lb-entry__score-line">
          {t.lbYourScore}: <strong className="lb-entry__score-value">{score}</strong>
        </p>
        <p className="lb-entry__prompt">{t.lbEnterPrompt}</p>
        <input
          ref={inputRef}
          type="text"
          className="lb-entry__input"
          placeholder={t.lbNamePlaceholder}
          value={name}
          maxLength={28}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button
          type="button"
          className="hud__btn hud__btn--primary lb-entry__btn"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {t.lbSave}
        </button>
      </div>
    </div>
  );
}
