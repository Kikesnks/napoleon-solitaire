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
  // Todavía sin semillas validadas: hasta que el solver (tarea B4) las genere,
  // todos los días usan la semilla derivada de la fecha.
  //
  // Ejemplo de cómo quedará una línea, para copiar:
  // "2026-09-01": { "2": 1755302400, "4": 2864434397 },
};
