// ── BASE COMÚN ──────────────────────────────────────────────────────────────
// Preferencias del jugador en localStorage. Son datos **funcionales**: idioma,
// dificultad elegida, si ya vio las instrucciones. No salen del dispositivo y
// no identifican a nadie — principio rector nº 3 (cero recopilación de datos).

/** Lee una preferencia. Devuelve `null` si no existe o si no hay almacenamiento. */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Modo privado o almacenamiento bloqueado: se juega igual, sin recordar nada.
    return null;
  }
}

/** Guarda una preferencia. Silencioso si no se puede: nunca debe romper el juego. */
export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignorar
  }
}
