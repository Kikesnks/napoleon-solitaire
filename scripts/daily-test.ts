// Reto diario: semillas por fecha, racha y resultados. Puro, sin navegador.
//
// El almacenamiento se inyecta, así que aquí se pueden simular días seguidos,
// saltos de días y un `localStorage` que revienta, sin tocar el navegador.
//
// Uso: npm run test:daily

import { createDaily, type DailyStorage } from "../src/core/daily/index.ts";
import { DAILY_SEEDS } from "../src/game/daily-seeds.ts";

let failed = 0;
function check(label: string, cond: boolean, detalle?: string): void {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    console.log(`  FAIL ${label}${detalle ? ` → ${detalle}` : ""}`);
    failed++;
  }
}
function section(title: string): void {
  console.log(`\n--- ${title}`);
}

/** Almacenamiento en memoria, como el del navegador pero controlable. */
function memoria(): DailyStorage {
  const datos = new Map<string, string>();
  return {
    get: (k) => datos.get(k) ?? null,
    set: (k, v) => void datos.set(k, v)
  };
}

/** Almacenamiento que revienta siempre, como el modo privado estricto. */
const roto: DailyStorage = {
  get() {
    throw new Error("almacenamiento bloqueado");
  },
  set() {
    throw new Error("almacenamiento bloqueado");
  }
};

const dia = (iso: string) => new Date(`${iso}T12:00:00`);

// ============================================================
section("B3.1 · el mismo día da siempre el mismo reparto");

const d = createDaily({ storagePrefix: "test.daily", storage: memoria() });

check("la fecha se calcula en horario local", d.todayKey(dia("2026-08-16")) === "2026-08-16");
check(
  "misma fecha y variante → misma semilla",
  d.seedFor("2026-08-16", "4") === d.seedFor("2026-08-16", "4")
);
check(
  "otra fecha → otra semilla",
  d.seedFor("2026-08-16", "4") !== d.seedFor("2026-08-17", "4")
);
check("la semilla es un entero positivo", Number.isInteger(d.seedFor("2026-08-16", "4")) && d.seedFor("2026-08-16", "4") > 0);

section("B3.2 · 2 y 4 palos son dos retos distintos");
check(
  "el mismo día, cada variante tiene su reparto",
  d.seedFor("2026-08-16", "2") !== d.seedFor("2026-08-16", "4")
);

section("la tabla de semillas manda sobre la derivación");
const conTabla = createDaily({
  storagePrefix: "test.daily",
  storage: memoria(),
  seeds: { "2026-09-01": { "4": 123456 } }
});
check("si la fecha está en la tabla, se usa su semilla", conTabla.seedFor("2026-09-01", "4") === 123456);
check("y se sabe que viene de la tabla", conTabla.isFromTable("2026-09-01", "4"));
check(
  "la variante que falta se deriva igual que siempre",
  conTabla.seedFor("2026-09-01", "2") === d.seedFor("2026-09-01", "2") &&
    !conTabla.isFromTable("2026-09-01", "2")
);
// La tabla del juego crece cada mes con las semillas que valida el solver, así
// que aquí no se comprueba cuántas hay —eso caducaría— sino que las que haya
// estén bien formadas y que los días sin entrada sigan funcionando solos.
const fechasPublicadas = Object.keys(DAILY_SEEDS);
check(
  "las semillas publicadas son enteros positivos",
  fechasPublicadas.every((f) =>
    (["2", "4"] as const).every((v) => {
      const s = DAILY_SEEDS[f]?.[v];
      return s === undefined || (Number.isInteger(s) && s > 0);
    })
  )
);
check(
  "las fechas publicadas tienen formato AAAA-MM-DD",
  fechasPublicadas.every((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
);

const conTablaReal = createDaily({
  storagePrefix: "test.daily",
  storage: memoria(),
  seeds: DAILY_SEEDS
});
if (fechasPublicadas.length > 0) {
  const f = fechasPublicadas[0];
  const v = DAILY_SEEDS[f]?.["2"] !== undefined ? "2" : "4";
  check(`un día publicado usa su semilla validada (${f}, ${v} palos)`,
    conTablaReal.seedFor(f, v) === DAILY_SEEDS[f]?.[v] && conTablaReal.isFromTable(f, v));
}
check(
  "un día sin entrada sigue teniendo reto (semilla derivada)",
  !conTablaReal.isFromTable("1999-01-01", "4") && conTablaReal.seedFor("1999-01-01", "4") > 0
);

// ============================================================
section("qué días se pueden jugar: del 1 del mes a hoy, y ni uno más");

const cal = createDaily({ storagePrefix: "test.daily", storage: memoria(), seeds: DAILY_SEEDS });
const dias16 = cal.playableKeys(dia("2026-08-16"));

check("el día 16 se ofrecen 16 días", dias16.length === 16);
check("empieza el día 1 del mes", dias16[0] === "2026-08-01");
check("y acaba hoy", dias16[dias16.length - 1] === "2026-08-16");
check("no se cuela ningún día futuro", dias16.every((f) => f <= "2026-08-16"));
check("ni ningún día del mes anterior", dias16.every((f) => f >= "2026-08-01"));

// La tabla de semillas va meses por delante del calendario a propósito: tener
// la semilla del día 25 no puede abrir el día 25 cuando estamos a 16. La tabla
// de esta comprobación es de mentira para que no dependa de cuánto tenga la
// real, que crece cada mes.
const conFuturo = createDaily({
  storagePrefix: "test.daily",
  storage: memoria(),
  seeds: { "2026-08-25": { "2": 111, "4": 222 }, "2027-01-01": { "2": 333 } }
});
check(
  "tener la semilla de un día futuro no abre ese día",
  !conFuturo.playableKeys(dia("2026-08-16")).includes("2026-08-25") &&
    !conFuturo.isPlayable("2026-08-25", dia("2026-08-16")) &&
    !conFuturo.isPlayable("2027-01-01", dia("2026-08-16"))
);
check(
  "y cuando llega el día, se abre",
  conFuturo.isPlayable("2026-08-25", dia("2026-08-25"))
);

check("el día 1 del mes solo se ofrece ese día", cal.playableKeys(dia("2026-08-01")).length === 1);
check("el último día del mes se ofrecen los 31", cal.playableKeys(dia("2026-08-31")).length === 31);
check(
  "al cambiar de mes se empieza de cero",
  cal.playableKeys(dia("2026-09-01")).length === 1 &&
    cal.playableKeys(dia("2026-09-01"))[0] === "2026-09-01"
);

section("isPlayable dice lo mismo, día a día");
check("hoy se puede jugar", cal.isPlayable("2026-08-16", dia("2026-08-16")));
check("ayer también", cal.isPlayable("2026-08-15", dia("2026-08-16")));
check("el día 1 del mes también", cal.isPlayable("2026-08-01", dia("2026-08-16")));
check("mañana NO", !cal.isPlayable("2026-08-17", dia("2026-08-16")));
check("fin de mes NO", !cal.isPlayable("2026-08-31", dia("2026-08-16")));
check("el mes pasado NO", !cal.isPlayable("2026-07-31", dia("2026-08-16")));
check("el año que viene NO", !cal.isPlayable("2027-08-10", dia("2026-08-16")));
check("una fecha con formato raro NO", !cal.isPlayable("2026-8-1", dia("2026-08-16")));
check("una cadena cualquiera NO", !cal.isPlayable("mañana", dia("2026-08-16")));
check(
  "las dos vías coinciden siempre",
  cal.playableKeys(dia("2026-08-16")).every((f) => cal.isPlayable(f, dia("2026-08-16")))
);

// ============================================================
section("B3.3 · la racha cuenta y se corta bien");

const r = createDaily({ storagePrefix: "test.daily", storage: memoria() });
check("racha inicial a cero", r.streak(dia("2026-08-16")).current === 0);
check("y sin jugar hoy", !r.streak(dia("2026-08-16")).playedToday);

r.markPlayed("2026-08-16");
check("primer día: racha 1", r.streak(dia("2026-08-16")).current === 1);
check("marca jugado hoy", r.streak(dia("2026-08-16")).playedToday);

r.markPlayed("2026-08-16");
check("repetir el reto el mismo día no suma", r.streak(dia("2026-08-16")).current === 1);

r.markPlayed("2026-08-17");
r.markPlayed("2026-08-18");
check("tres días seguidos: racha 3", r.streak(dia("2026-08-18")).current === 3);

check(
  "al día siguiente la racha sigue viva (aún se puede continuar)",
  r.streak(dia("2026-08-19")).current === 3
);
check(
  "pero si se salta un día entero, se enseña rota",
  r.streak(dia("2026-08-20")).current === 0
);

r.markPlayed("2026-08-20");
check("volver a jugar reinicia a 1", r.streak(dia("2026-08-20")).current === 1);
check("y la mejor racha se conserva", r.streak(dia("2026-08-20")).best === 3);

section("la racha no se rompe en los saltos de mes ni de año");
const s = createDaily({ storagePrefix: "test.daily", storage: memoria() });
s.markPlayed("2026-08-31");
s.markPlayed("2026-09-01");
check("31 de agosto → 1 de septiembre: racha 2", s.streak(dia("2026-09-01")).current === 2);
s.markPlayed("2026-12-31");
s.markPlayed("2027-01-01");
check("31 de diciembre → 1 de enero: racha 2", s.streak(dia("2027-01-01")).current === 2);

// ============================================================
section("resultados del día");

const res = createDaily({ storagePrefix: "test.daily", storage: memoria() });
res.recordResult({ date: "2026-08-16", variant: "4", score: 120, won: false });
res.recordResult({ date: "2026-08-16", variant: "2", score: 300, won: true });
check("un resultado por variante", res.resultsOf("2026-08-16").length === 2);

res.recordResult({ date: "2026-08-16", variant: "4", score: 400, won: false });
check(
  "se conserva el mejor intento",
  res.resultsOf("2026-08-16").find((x) => x.variant === "4")?.score === 400
);

res.recordResult({ date: "2026-08-16", variant: "2", score: 10, won: false });
const ganada = res.resultsOf("2026-08-16").find((x) => x.variant === "2");
check("una victoria no se pierde por jugar peor después", ganada?.won === true);
check("y la puntuación buena tampoco", ganada?.score === 300);
check("los días se guardan por separado", res.resultsOf("2026-08-15").length === 0);

// ============================================================
section("B6 · la colección del mes se cuenta aparte de la racha");

const col = createDaily({
  storagePrefix: "test.daily",
  storage: memoria(),
  variants: ["2", "4"]
});
const hoy16 = dia("2026-08-16");

check("a 16 de agosto hay 32 retos disponibles", col.collection(hoy16).total === 32);
check("y ninguno hecho", col.collection(hoy16).done === 0);

col.recordResult({ date: "2026-08-16", variant: "2", score: 100, won: false });
check("un reto hecho cuenta 1", col.collection(hoy16).done === 1);

col.recordResult({ date: "2026-08-16", variant: "4", score: 100, won: false });
check("las dos dificultades del mismo día cuentan 2", col.collection(hoy16).done === 2);

col.recordResult({ date: "2026-08-16", variant: "2", score: 500, won: true });
check("repetir un reto no lo cuenta dos veces", col.collection(hoy16).done === 2);

// Este es el caso que describió el propietario: alguien entra el día 16 y se
// hace el mes entero de una sentada. Colección llena, racha de 1 día.
for (let d = 1; d <= 15; d++) {
  const fecha = `2026-08-${String(d).padStart(2, "0")}`;
  col.recordResult({ date: fecha, variant: "2", score: 200, won: false });
  col.recordResult({ date: fecha, variant: "4", score: 200, won: false });
}
col.markPlayed("2026-08-16");
check("el mes entero de una sentada: 32 de 32", col.collection(hoy16).done === 32);
check("...pero la racha sigue siendo de 1 día", col.streak(hoy16).current === 1);

check(
  "un reto de un día futuro no cuenta en la colección",
  (() => {
    col.recordResult({ date: "2026-08-25", variant: "2", score: 999, won: true });
    return col.collection(hoy16).done === 32;
  })()
);
check(
  "ni uno del mes pasado",
  (() => {
    col.recordResult({ date: "2026-07-30", variant: "2", score: 999, won: true });
    return col.collection(hoy16).done === 32;
  })()
);
check(
  "sin declarar variantes no se cuenta nada",
  createDaily({ storagePrefix: "test.daily", storage: memoria() }).collection(hoy16).total === 0
);

// ============================================================
section("B6 · el registro de acciones se guarda para poder acreditarlo");

const rep = createDaily({ storagePrefix: "test.daily", storage: memoria(), variants: ["2", "4"] });
const jugada1 = [{ type: "deal" }, { type: "move", from: "P1", to: "F1" }];
const jugada2 = [{ type: "deal" }, { type: "deal" }, { type: "move", from: "P2", to: "F2" }];

rep.recordResult({ date: "2026-08-10", variant: "2", score: 100, won: false, seed: 42, actions: jugada1 });
const g1 = rep.replayOf("2026-08-10", "2");
check("se guarda la partida completa", g1?.actions.length === 2 && g1?.seed === 42);
check("con su fecha y su dificultad", g1?.date === "2026-08-10" && g1?.variant === "2");

rep.recordResult({ date: "2026-08-10", variant: "2", score: 50, won: false, seed: 42, actions: jugada2 });
check(
  "un intento peor NO sustituye la partida guardada",
  rep.replayOf("2026-08-10", "2")?.actions.length === 2
);

rep.recordResult({ date: "2026-08-10", variant: "2", score: 300, won: true, seed: 42, actions: jugada2 });
const g2 = rep.replayOf("2026-08-10", "2");
check("un intento mejor sí la sustituye", g2?.actions.length === 3);
check(
  "y la partida guardada es la que produjo la puntuación guardada",
  rep.resultsOf("2026-08-10").find((r) => r.variant === "2")?.score === 300
);

// El caso peligroso: se mejora la puntuación pero no llegan las acciones. Si
// se dejara la partida anterior, acreditaría 300 puntos con una partida de 100.
rep.recordResult({ date: "2026-08-10", variant: "2", score: 900, won: true });
check(
  "si mejora sin acciones, la prueba vieja se BORRA en vez de mentir",
  rep.replayOf("2026-08-10", "2") === null
);

check("un reto sin partida guardada devuelve null", rep.replayOf("2026-08-11", "4") === null);
check(
  "las dificultades no se pisan entre sí",
  (() => {
    rep.recordResult({ date: "2026-08-12", variant: "2", score: 10, won: false, seed: 1, actions: jugada1 });
    rep.recordResult({ date: "2026-08-12", variant: "4", score: 10, won: false, seed: 2, actions: jugada2 });
    return rep.replayOf("2026-08-12", "2")?.seed === 1 && rep.replayOf("2026-08-12", "4")?.seed === 2;
  })()
);

section("las partidas guardadas no crecen sin fin");
check(
  "al cambiar de mes se sueltan las del mes anterior",
  (() => {
    rep.recordResult({ date: "2026-09-01", variant: "2", score: 10, won: false, seed: 7, actions: jugada1 });
    return rep.replayOf("2026-09-01", "2")?.seed === 7 && rep.replayOf("2026-08-12", "2") === null;
  })()
);
check(
  "pero los resultados del mes anterior se conservan",
  rep.resultsOf("2026-08-12").length === 2
);

// ============================================================
section("B3.4 · sin almacenamiento el juego sigue funcionando");

const sinDisco = createDaily({ storagePrefix: "test.daily", storage: roto });
let reventó = false;
try {
  sinDisco.seedFor("2026-08-16", "4");
  sinDisco.streak(dia("2026-08-16"));
  sinDisco.markPlayed("2026-08-16");
  sinDisco.recordResult({ date: "2026-08-16", variant: "4", score: 1, won: false });
  sinDisco.resultsOf("2026-08-16");
} catch {
  reventó = true;
}
check("ninguna operación lanza", !reventó);
check("el reto de hoy se puede jugar igual", sinDisco.seedFor("2026-08-16", "4") > 0);
check("simplemente no se recuerda la racha", sinDisco.streak(dia("2026-08-16")).current === 0);

section("datos corruptos en el almacenamiento");
const sucio: DailyStorage = { get: () => "{esto no es json", set: () => {} };
const conBasura = createDaily({ storagePrefix: "test.daily", storage: sucio });
check("una racha corrupta no rompe nada", conBasura.streak(dia("2026-08-16")).current === 0);
check("unos resultados corruptos tampoco", conBasura.resultsOf("2026-08-16").length === 0);

// ============================================================
console.log(
  failed === 0
    ? "\nOK — el reto diario es determinista y la racha se comporta"
    : `\n${failed} comprobación(es) del reto diario han fallado`
);
process.exit(failed === 0 ? 0 : 1);
