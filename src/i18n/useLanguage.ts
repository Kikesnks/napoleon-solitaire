import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./strings";

const STORAGE_KEY = "solnap.lang";
const FIRST_RUN_KEY = "solnap.seenInstructions";

function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "es" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "es";
  const code = (navigator.language || "").toLowerCase();
  return code.startsWith("en") ? "en" : "es";
}

/**
 * Idioma activo + setter. Persiste en localStorage para que la elección
 * sobreviva a recargas. Si no hay valor guardado, usa el idioma del
 * navegador (o "es" por defecto).
 */
export function useLanguage(): [Lang, (next: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang() ?? detectBrowserLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignorar (modo privado, etc.)
    }
  }, []);

  return [lang, setLang];
}

/**
 * Indica si el jugador NO ha visto aún las instrucciones — es decir, si es
 * el primer arranque (o si nunca cerró las instrucciones explícitamente).
 * `markSeen` se llama cuando el jugador pulsa "Empezar a jugar" / "Start playing".
 */
export function useFirstRun(): { firstRun: boolean; markSeen: () => void } {
  const [firstRun, setFirstRun] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(FIRST_RUN_KEY) !== "yes";
    } catch {
      return false;
    }
  });

  // Por si otro tab actualiza el flag mientras estamos abiertos.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === FIRST_RUN_KEY) {
        setFirstRun(e.newValue !== "yes");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markSeen = useCallback(() => {
    setFirstRun(false);
    try {
      window.localStorage.setItem(FIRST_RUN_KEY, "yes");
    } catch {
      // ignorar
    }
  }, []);

  return { firstRun, markSeen };
}
