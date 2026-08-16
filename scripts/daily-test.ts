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
