// Diccionario de cadenas de UI. La pantalla de instrucciones (con su selector
// de idioma) escribe en localStorage, y el resto del HUD/overlay leen de aquí.
// La regla del juego pura no toca i18n — vive sólo en la capa de presentación.

export type Lang = "es" | "en" | "fr";

/**
 * Cómo se presenta cada idioma en el selector: bandera **y** nombre en su
 * propia lengua. La bandera sola sería ambigua —representa países, no
 * idiomas— y dejaría fuera a media Latinoamérica y a la África francófona,
 * que son justo parte de nuestro público en los portales.
 */
export const LANG_LABELS: Record<Lang, { flag: string; name: string }> = {
  es: { flag: "🇪🇸", name: "Español" },
  en: { flag: "🇬🇧", name: "English" },
  fr: { flag: "🇫🇷", name: "Français" }
};

export const LANG_ORDER: Lang[] = ["es", "en", "fr"];

export interface UIStrings {
  // HUD
  time: string;
  score: string;
  round: string;
  moves: string;
  monton: string;
  /**
   * Abreviaturas de los cinco datos, sólo para el HUD en pantallas estrechas.
   * Con los nombres completos las cinco columnas no caben en un móvil de 360px
   * y los textos se montaban unos encima de otros.
   */
  timeShort: string;
  scoreShort: string;
  roundShort: string;
  movesShort: string;
  montonShort: string;
  undo: string;
  newGame: string;
  rules: string;
  // Pantalla de instrucciones
  rulesTitle: string;
  play: string;
  close: string;
  // Privacidad (principio rector nº 3: es un argumento de venta, va visible)
  privacyBadge: string;
  privacyTitle: string;
  /** Etiqueta corta para el botón del HUD: el título completo no cabe. */
  privacyShort: string;
  // Overlay fin de partida
  won: string;
  lost: string;
  wonMessage: string;
  lostMessage: string;
  playAgain: string;
  // Selector de palos
  chooseSuits: string;
  twoSuits: string;
  fourSuits: string;
  twoSuitsDesc: string;
  fourSuitsDesc: string;
  cancel: string;
  // Reto diario. Ojo: ningún texto promete que el reparto tenga solución —
  // hasta que el solver valide las semillas, puede no tenerla.
  freeGame: string;
  dailyTitle: string;
  dailyHint: string;
  dailyStreak: string;
  dailyBest: string;
  dailyPlayedToday: string;
  day: string;
  days: string;
  // Liga de Campeones
  leaderboard: string;
  lbTabWon: string;
  lbTabLost: string;
  lbWonTitle: string;
  lbLostTitle: string;
  lbEnterTitle: string;
  lbEnterPrompt: string;
  lbNamePlaceholder: string;
  lbSave: string;
  lbAccept: string;
  lbColPlayer: string;
  lbColScore: string;
  lbColDate: string;
  lbColSuits: string;
  lbEmpty: string;
  lbYourScore: string;
  lbLoading: string;
  lbError: string;
  lbSubmitting: string;
  lbRetry: string;
}

export const STRINGS: Record<Lang, UIStrings> = {
  es: {
    time: "Tiempo",
    score: "Puntos",
    round: "Ronda",
    moves: "Mov.",
    monton: "Montón",
    timeShort: "Tpo",
    scoreShort: "Pts",
    roundShort: "Rnd",
    movesShort: "Mov",
    montonShort: "Mont",
    undo: "Deshacer",
    newGame: "Nueva",
    rules: "Reglas",
    rulesTitle: "Reglas del Solitario Napoleón",
    play: "Empezar a jugar",
    close: "Cerrar",
    privacyBadge: "Cero rastreo · Sin cuentas · Solo cartas",
    privacyTitle: "Política de privacidad",
    privacyShort: "Privacidad",
    won: "¡Has ganado!",
    lost: "Fin de la partida",
    wonMessage: "Solitario completado.",
    lostMessage: "Se acabaron los repartos del montón sin ordenar todas las cartas.",
    playAgain: "Jugar otra",
    chooseSuits: "¿Con cuántos palos?",
    twoSuits: "2 palos",
    fourSuits: "4 palos",
    freeGame: "Partida libre",
    dailyTitle: "Reto diario",
    dailyHint: "El mismo reparto para todo el mundo, hoy",
    dailyStreak: "Racha",
    dailyBest: "Mejor",
    dailyPlayedToday: "Ya jugado hoy",
    day: "día",
    days: "días",
    twoSuitsDesc: "Un palo rojo y uno negro (más fácil)",
    fourSuitsDesc: "Los cuatro palos — versión original",
    cancel: "Cancelar",
    leaderboard: "LIGA DE CAMPEONES",
    lbTabWon: "Ganadas",
    lbTabLost: "No ganadas",
    lbWonTitle: "LIGA DE CAMPEONES — Victorias",
    lbLostTitle: "LIGA DE CAMPEONES — Mejores partidas",
    lbEnterTitle: "¡Has entrado en la LIGA DE CAMPEONES!",
    lbEnterPrompt: "Introduce tu nombre para guardar tu puntuación",
    lbNamePlaceholder: "Tu nombre",
    lbSave: "Guardar",
    lbAccept: "Aceptar",
    lbColPlayer: "Jugador",
    lbColScore: "Puntos",
    lbColDate: "Fecha",
    lbColSuits: "Palos",
    lbEmpty: "Aún no hay partidas registradas",
    lbYourScore: "Tu puntuación",
    lbLoading: "Cargando ranking…",
    lbError: "No se ha podido conectar con el servidor",
    lbSubmitting: "Enviando puntuación…",
    lbRetry: "Reintentar"
  },
  en: {
    time: "Time",
    score: "Score",
    round: "Round",
    moves: "Moves",
    monton: "Stock",
    timeShort: "Time",
    // "PTS" y no "SCR": es la abreviatura de marcador de toda la vida en inglés
    // y se entiende sin pensar; "SCR" no la usa nadie y se lee como un error.
    scoreShort: "Pts",
    roundShort: "Rnd",
    movesShort: "Mov",
    montonShort: "Stock",
    undo: "Undo",
    newGame: "New",
    rules: "Rules",
    rulesTitle: "Napoleon Solitaire — Rules",
    play: "Start playing",
    close: "Close",
    privacyBadge: "No tracking · No accounts · Just cards",
    privacyTitle: "Privacy policy",
    privacyShort: "Privacy",
    won: "You won!",
    lost: "Game over",
    wonMessage: "Solitaire complete.",
    lostMessage: "The stock was exhausted before all cards could be ordered.",
    playAgain: "Play again",
    chooseSuits: "How many suits?",
    twoSuits: "2 suits",
    fourSuits: "4 suits",
    freeGame: "Free game",
    dailyTitle: "Daily challenge",
    dailyHint: "The same deal for everyone, today",
    dailyStreak: "Streak",
    dailyBest: "Best",
    dailyPlayedToday: "Already played today",
    day: "day",
    days: "days",
    twoSuitsDesc: "One red suit and one black (easier)",
    fourSuitsDesc: "All four suits — original version",
    cancel: "Cancel",
    leaderboard: "CHAMPIONS LEAGUE",
    lbTabWon: "Won",
    lbTabLost: "Not won",
    lbWonTitle: "CHAMPIONS LEAGUE — Victories",
    lbLostTitle: "CHAMPIONS LEAGUE — Best games",
    lbEnterTitle: "You've made the CHAMPIONS LEAGUE!",
    lbEnterPrompt: "Enter your name to save your score",
    lbNamePlaceholder: "Your name",
    lbSave: "Save",
    lbAccept: "Accept",
    lbColPlayer: "Player",
    lbColScore: "Score",
    lbColDate: "Date",
    lbColSuits: "Suits",
    lbEmpty: "No games recorded yet",
    lbYourScore: "Your score",
    lbLoading: "Loading leaderboard…",
    lbError: "Could not connect to the server",
    lbSubmitting: "Submitting score…",
    lbRetry: "Retry"
  },
  fr: {
    time: "Temps",
    score: "Points",
    round: "Tour",
    moves: "Coups",
    monton: "Talon",
    timeShort: "Tps",
    scoreShort: "Pts",
    roundShort: "Tour",
    movesShort: "Cps",
    montonShort: "Talon",
    undo: "Annuler",
    newGame: "Nouvelle",
    rules: "Règles",
    rulesTitle: "Réussite Napoléon — Règles",
    play: "Commencer à jouer",
    close: "Fermer",
    privacyBadge: "Aucun traçage · Aucun compte · Juste des cartes",
    privacyTitle: "Politique de confidentialité",
    privacyShort: "Confidentialité",
    won: "Vous avez gagné !",
    lost: "Partie terminée",
    wonMessage: "Réussite complétée.",
    lostMessage: "Le talon est épuisé sans avoir pu ranger toutes les cartes.",
    playAgain: "Rejouer",
    chooseSuits: "Avec combien de couleurs ?",
    twoSuits: "2 couleurs",
    fourSuits: "4 couleurs",
    freeGame: "Partie libre",
    dailyTitle: "Défi du jour",
    dailyHint: "La même donne pour tout le monde, aujourd'hui",
    dailyStreak: "Série",
    dailyBest: "Record",
    dailyPlayedToday: "Déjà joué aujourd'hui",
    day: "jour",
    days: "jours",
    twoSuitsDesc: "Une couleur rouge et une noire (plus facile)",
    fourSuitsDesc: "Les quatre couleurs — version originale",
    cancel: "Annuler",
    leaderboard: "LIGUE DES CHAMPIONS",
    lbTabWon: "Gagnées",
    lbTabLost: "Non gagnées",
    lbWonTitle: "LIGUE DES CHAMPIONS — Victoires",
    lbLostTitle: "LIGUE DES CHAMPIONS — Meilleures parties",
    lbEnterTitle: "Vous entrez dans la LIGUE DES CHAMPIONS !",
    lbEnterPrompt: "Saisissez votre nom pour enregistrer votre score",
    lbNamePlaceholder: "Votre nom",
    lbSave: "Enregistrer",
    lbAccept: "Valider",
    lbColPlayer: "Joueur",
    lbColScore: "Points",
    lbColDate: "Date",
    lbColSuits: "Couleurs",
    lbEmpty: "Aucune partie enregistrée pour le moment",
    lbYourScore: "Votre score",
    lbLoading: "Chargement du classement…",
    lbError: "Impossible de se connecter au serveur",
    lbSubmitting: "Envoi du score…",
    lbRetry: "Réessayer"
  }
};
