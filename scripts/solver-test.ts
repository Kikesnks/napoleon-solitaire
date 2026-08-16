// El solver y, sobre todo, LA GARANTÍA del reto diario.
//
// Lo que de verdad importa aquí no es que el solver sea listo, es que no mienta:
// cada semilla publicada en la tabla tiene que poder ganarse. Este test lo
// comprueba reproduciendo las partidas guardadas contra el motor real.
//
// Uso: npm run test:solver

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { resolver, verificar } from "./solver.ts";
import { DAILY_SEEDS } from "../src/game/daily-seeds.ts";
import { createInitialState } from "../src/game/state.ts";
import { reduceAction } from "../src/game/rules.ts";
import type { LoggedAction, SuitMode } from "../src/game/types.ts";

const SOLUCIONES = path.resolve(import.meta.dirname, ".solutions");

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

// ============================================================
section("el solver encuentra partidas ganadas y no se las inventa");

// Semilla conocida: 2 palos, se resuelve en el intento determinista y en pocos
// nodos. Si algún día deja de resolverse, es que el motor ha cambiado.
const r = resolver(1, 2, { presupuesto: 50_000 });
check("encuentra una victoria para la semilla 1 (2 palos)", r.solucion !== null);

if (r.solucion) {
  check("el motor real confirma la victoria", verificar(1, 2, r.solucion));
  check("la partida tiene una longitud razonable", r.solucion.length > 100 && r.solucion.length < 400,
    `${r.solucion.length} acciones`);

  // Una partida truncada NO puede dar victoria: si esto pasara, `verificar`
  // estaría diciendo que sí a cualquier cosa y la garantía no valdría nada.
  const truncada = r.solucion.slice(0, r.solucion.length - 5);
  check("una partida incompleta NO se da por ganada", !verificar(1, 2, truncada));
}

check(
  "es determinista: dos ejecuciones iguales dan el mismo resultado",
  JSON.stringify(resolver(1, 2, { presupuesto: 50_000 }).solucion) === JSON.stringify(r.solucion)
);

const imposible = resolver(1, 2, { presupuesto: 30 });
check("con presupuesto ridículo se rinde sin romper", imposible.solucion === null && imposible.nodos <= 30);

// ============================================================
section("garantía: cada semilla publicada tiene una partida ganada");

const fechas = Object.keys(DAILY_SEEDS);
if (fechas.length === 0) {
  console.log("  (la tabla está vacía: no hay nada que garantizar todavía)");
} else {
  const ficheros = existsSync(SOLUCIONES)
    ? readdirSync(SOLUCIONES).filter((f) => f.endsWith(".json"))
    : [];

  if (ficheros.length === 0) {
    console.log(
      "  (no hay partidas guardadas en scripts/.solutions — quedan fuera del repo para no\n" +
        "   publicar la solución, así que en una copia recién clonada esto no se comprueba)"
    );
  } else {
    const guardadas: Record<string, { semilla: number; acciones: LoggedAction[] }> = {};
    for (const f of ficheros) {
      Object.assign(guardadas, JSON.parse(readFileSync(path.join(SOLUCIONES, f), "utf8")));
    }

    let comprobadas = 0;
    let sinPrueba = 0;
    let rotas = 0;

    for (const fecha of fechas) {
      for (const variante of ["2", "4"] as const) {
        const semilla = DAILY_SEEDS[fecha]?.[variante];
        if (semilla === undefined) continue;

        const prueba = guardadas[`${fecha}|${variante}`];
        if (!prueba) {
          sinPrueba++;
          continue;
        }
        if (prueba.semilla !== semilla) {
          console.log(
            `  FAIL ${fecha} ${variante}p: la prueba es de otra semilla (tabla ${semilla}, prueba ${prueba.semilla})`
          );
          rotas++;
          continue;
        }

        const modo = (variante === "2" ? 2 : 4) as SuitMode;
        let estado = createInitialState({ seed: semilla, suitMode: modo });
        for (const a of prueba.acciones) estado = reduceAction(estado, a);
        if (estado.status !== "won") {
          console.log(`  FAIL ${fecha} ${variante}p: la partida guardada acaba en "${estado.status}"`);
          rotas++;
          continue;
        }
        comprobadas++;
      }
    }

    check(
      `las ${comprobadas} semillas con prueba se ganan reproduciendo su partida`,
      rotas === 0 && comprobadas > 0,
      rotas > 0 ? `${rotas} rota(s)` : "ninguna semilla tenía prueba"
    );
    if (sinPrueba > 0) {
      console.log(`  (${sinPrueba} semilla(s) publicadas sin partida guardada en este equipo)`);
    }
  }
}

// ============================================================
console.log(
  failed === 0
    ? "\nOK — el solver no miente y las semillas publicadas se pueden ganar"
    : `\n${failed} comprobación(es) del solver han fallado`
);
process.exit(failed === 0 ? 0 : 1);
