// ── TABLA DE SEMILLAS DEL RETO DIARIO ───────────────────────────────────────
//
// Es un ARCHIVO DE DATOS a propósito: se edita a mano y se sube a GitHub sin
// tocar una línea de código. Y es el contrato con el solver: cuando exista,
// escribirá aquí las semillas ya comprobadas, sin que la interfaz cambie.
//
// FORMATO — una línea por día:
//
//   "2026-08-17": { "2": 123456789, "4": 987654321 },
//
//   · La clave es la fecha en horario local del jugador, `AAAA-MM-DD`.
//   · "2" y "4" son los palos de la partida: son dos retos distintos.
//   · La semilla es un entero positivo. El mismo número da siempre el mismo
//     reparto, porque el motor es determinista.
//   · Se puede poner solo una de las dos variantes; la otra se deriva sola.
//
// QUÉ PASA CON LOS DÍAS QUE NO ESTÉN AQUÍ: nada malo. La semilla se calcula a
// partir de la propia fecha, así que el reto **nunca falta** aunque la tabla
// esté vacía. Rellenar la tabla sirve para elegir buenos repartos, no para que
// el reto exista.
//
// CÓMO SE RELLENA — no a mano, con el solver:
//
//   npm run seeds:month -- --mes=2026-09 --escribir
//
// Busca para cada día y dificultad una semilla de la que sepa sacar una partida
// ganada, la reproduce contra el motor real y solo entonces la escribe aquí. Si
// algún día se resiste, se reintenta con más esfuerzo:
//
//   npm run seeds:month -- --mes=2026-09 --escribir --intentos=16 --candidatas=60
//
// Las partidas ganadas quedan en `scripts/.solutions/`, fuera del repositorio,
// porque son literalmente la solución del reto.
//
// ⚠️ IMPORTANTE: mientras el solver no valide una semilla, **no se le promete
// al jugador que el reto tenga solución**, ni aquí ni en ningún texto de la
// interfaz. Un reparto imposible es posible.
//
// ⚠️ REGLA QUE NO SE ROMPE: **solo se añaden fechas de HOY EN ADELANTE.**
// Cambiar la semilla de un día que ya pasó le cambia el reparto a quien ya lo
// jugó: su resultado guardado dejaría de corresponder con la partida que ve, y
// si algún día se pueden repetir retos pasados, el reparto no sería el mismo
// que jugó. Un día publicado es un día congelado.

/** Variantes: los dos modos de dificultad, como texto. */
export type DailyVariant = "2" | "4";

export const DAILY_SEEDS: Readonly<Record<string, Readonly<Partial<Record<DailyVariant, number>>>>> = {
  "2026-08-17": { "2": 62441847, "4": 28886629 },
  "2026-08-18": { "2": 1333109934, "4": 1366665188 },
  "2026-08-19": { "2": 2920077433, "4": 2953632683 },
  "2026-08-20": { "2": 630927593, "4": 664482833 },
  "2026-08-21": { "2": 3297350686, "4": 3330905930 },
  "2026-08-22": { "2": 4272076067, "4": 77774491 },
  "2026-08-23": { "2": 2417946592, "4": 2518612319 },
  "2026-08-24": { "2": 4177464789, "4": 4076799092 },
  "2026-08-25": { "2": 442962058, "4": 342296345 },
  "2026-08-26": { "2": 1376110735, "4": 1342555503 },
  "2026-08-27": { "2": 3816948556, "4": 3783393331 },
  "2026-08-28": { "2": 1281499457, "4": 1315054699 },
  "2026-08-29": { "2": 3452615446, "4": 3486170686 },
  "2026-08-30": { "2": 2560158973, "4": 2526603738 },
  "2026-08-31": { "2": 160897855, "4": 127342626 },
};
