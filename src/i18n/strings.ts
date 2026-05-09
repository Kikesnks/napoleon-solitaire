// Diccionario de cadenas de UI en español e inglés. La pantalla de
// instrucciones (con su toggle ES/EN) escribe en localStorage, y el resto
// del HUD/overlay leen de aquí. La regla del juego pura no toca i18n —
// vive sólo en la capa de presentación.

export type Lang = "es" | "en";

export interface UIStrings {
  // HUD
  time: string;
  score: string;
  round: string;
  moves: string;
  monton: string;
  undo: string;
  newGame: string;
  rules: string;
  // Pantalla de instrucciones
  rulesTitle: string;
  play: string;
  close: string;
  // Overlay fin de partida
  won: string;
  lost: string;
  wonMessage: string;
  lostMessage: string;
  playAgain: string;
}

export const STRINGS: Record<Lang, UIStrings> = {
  es: {
    time: "Tiempo",
    score: "Puntos",
    round: "Ronda",
    moves: "Mov.",
    monton: "Montón",
    undo: "Deshacer",
    newGame: "Nueva",
    rules: "Reglas",
    rulesTitle: "Reglas del Solitario Napoleón",
    play: "Empezar a jugar",
    close: "Cerrar",
    won: "¡Has ganado!",
    lost: "Fin de la partida",
    wonMessage: "Solitario completado.",
    lostMessage: "Se acabaron los repartos del montón sin ordenar todas las cartas.",
    playAgain: "Jugar otra"
  },
  en: {
    time: "Time",
    score: "Score",
    round: "Round",
    moves: "Moves",
    monton: "Stock",
    undo: "Undo",
    newGame: "New",
    rules: "Rules",
    rulesTitle: "Napoleon Solitaire — Rules",
    play: "Start playing",
    close: "Close",
    won: "You won!",
    lost: "Game over",
    wonMessage: "Solitaire complete.",
    lostMessage: "The stock was exhausted before all cards could be ordered.",
    playAgain: "Play again"
  }
};
