import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./strings";

const STORAGE_KEY = "solnap.lang";
const FIRST_RUN_KEY = "solnap.seenInstructions";

function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "es" || stored === "en" || stored === "fr" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Idioma inicial: se sirve el idioma del navegador **si lo tenemos traducido**
 * (español, francés) y, si no, **inglés**. El público de un juego embebido en
 * un portal es mundial: mandar a español a un jugador japonés o alemán era
 * perderlo en el primer segundo. El inglés hace de salvavidas mientras no haya
 * más traducciones.
 */
function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const codes: string[] = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language || ""
  ].map((c) => c.toLowerCase());

  // Se respeta el ORDEN de preferencia del navegador: si alguien tiene
  // francés antes que español, recibe francés.
  for (const code of codes) {
    if (code.startsWith("es")) return "es";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("en")) return "en";
  }
  return "en";
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
