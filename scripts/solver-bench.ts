// Mide el solver: ¿qué porcentaje de repartos consigue ganar, con qué esfuerzo
// y con qué ajustes? Es lo que decide si el reto diario puede garantizarse.
//
// Uso: npx tsx scripts/solver-bench.ts [2|4] [nSemillas] [presupuesto] [intentos]

import { resolver, verificar } from "./solver.ts";
import type { SuitMode } from "../src/game/types.ts";

const modo = (Number(process.argv[2] ?? 4) === 2 ? 2 : 4) as SuitMode;
const nSemillas = Number(process.argv[3] ?? 20);
const presupuesto = Number(process.argv[4] ?? 150_000);
const intentos = Number(process.argv[5] ?? 1);

console.log(
  `${modo} palos · ${nSemillas} semillas · ${presupuesto} nodos · hasta ${intentos} intento(s) por semilla\n`
);

let ganadas = 0;
let msTotal = 0;
let intentosGanadores = 0;
let sumaRestantes = 0;
const longitudes: number[] = [];

for (let s = 1; s <= nSemillas; s++) {
  const semilla = s * 7919;
  const t0 = Date.now();
  let hecho = false;
  let mejor = 104;

  for (let intento = 0; intento < intentos && !hecho; intento++) {
    const r = resolver(semilla, modo, { presupuesto, intento });
    mejor = Math.min(mejor, r.mejorH);
    if (r.solucion && verificar(semilla, modo, r.solucion)) {
      ganadas++;
      hecho = true;
      intentosGanadores += intento + 1;
      longitudes.push(r.solucion.length);
    }
  }

  const ms = Date.now() - t0;
  msTotal += ms;
  if (!hecho) sumaRestantes += mejor;
  process.stdout.write(
    `  semilla ${String(semilla).padStart(7)}: ${hecho ? "GANADA " : `fallo (${String(mejor).padStart(3)} sin colocar)`} · ${String(ms).padStart(6)} ms\n`
  );
}

const pct = ((ganadas / nSemillas) * 100).toFixed(0);
console.log(`\n  ganadas: ${ganadas}/${nSemillas} (${pct} %)`);
console.log(`  tiempo medio por semilla: ${(msTotal / nSemillas).toFixed(0)} ms`);
if (ganadas > 0) {
  console.log(`  intentos medios hasta ganar: ${(intentosGanadores / ganadas).toFixed(1)}`);
  console.log(
    `  longitud media de la partida ganada: ${(longitudes.reduce((a, b) => a + b, 0) / longitudes.length).toFixed(0)} acciones`
  );
}
if (ganadas < nSemillas) {
  console.log(
    `  al fallar quedaron de media ${(sumaRestantes / (nSemillas - ganadas)).toFixed(1)} cartas sin colocar`
  );
}
