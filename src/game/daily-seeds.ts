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
//
// La única excepción, y ya está gastada: los días **anteriores al estreno** del
// reto diario. El reto se estrenó el 16/08/2026, así que del 1 al 15 de agosto
// no se le sirvió nada a nadie y se generaron después con `--estreno=2026-08-16`.
// Por eso **agosto de 2026 tiene 30 de sus 31 días validados**: el único que se
// queda con semilla derivada es el 16, que sí se jugó.
//
// QUÉ DÍAS SE PUEDEN JUGAR NO SE DECIDE AQUÍ. Esta tabla va semanas por delante
// del calendario a propósito. Quien manda es `playableKeys()` de `core/daily`:
// del día 1 del mes al día de hoy, y **nunca un día futuro**. Que la semilla del
// día 25 exista no abre el día 25 cuando estamos a 16.

/** Variantes: los dos modos de dificultad, como texto. */
export type DailyVariant = "2" | "4";

export const DAILY_SEEDS: Readonly<Record<string, Readonly<Partial<Record<DailyVariant, number>>>>> = {
  "2026-08-01": { "2": 384235672, "4": 484901386 },
  "2026-08-02": { "2": 744751905, "4": 778307151 },
  "2026-08-03": { "2": 2915867894, "4": 2949423135 },
  "2026-08-04": { "2": 1531511751, "4": 1497956535 },
  "2026-08-05": { "2": 3972349572, "4": 3938794334 },
  "2026-08-06": { "2": 2185330573, "4": 2084664879 },
  "2026-08-07": { "2": 19902563, "4": 4214204150 },
  "2026-08-08": { "2": 1587793283, "4": 1688459000 },
  "2026-08-09": { "2": 3987054400, "4": 4087720115 },
  "2026-08-10": { "2": 1446797990, "4": 1480353230 },
  "2026-08-11": { "2": 3570649297, "4": 3604204539 },
  "2026-08-12": { "2": 1104277704, "4": 1204943425 },
  "2026-08-13": { "2": 2958407179, "4": 3059072915 },
  "2026-08-14": { "2": 739944594, "4": 639278892 },
  "2026-08-15": { "2": 2863795901, "4": 2763130188 },
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
