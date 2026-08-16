// Genera las semillas validadas del reto diario de un mes.
//
// Para cada día y dificultad busca una semilla de la que el solver sepa sacar
// una partida ganada, la VERIFICA reproduciéndola contra el motor real y solo
// entonces la escribe en `src/game/daily-seeds.ts`.
//
// Dos reglas que el script hace cumplir por su cuenta:
//   · No se toca ningún día que alguien haya podido jugar. Un día publicado es
//     un día congelado: cambiarle la semilla le cambiaría el reparto a quien ya
//     lo jugó, y su resultado guardado dejaría de corresponder con la partida.
//   · No se escribe una semilla sin partida ganada verificada. Sin excepciones.
//
// Uso:
//   npx tsx scripts/generate-seeds.ts --mes=2026-09 --escribir
//   npx tsx scripts/generate-seeds.ts            (mes en curso, sin escribir)
//
// Opciones: --intentos=8 --presupuesto=150000 --candidatas=40 --escribir
//
// --estreno=AAAA-MM-DD — SOLO PARA EL PRIMER MES. Declara el día en que el reto
// diario llegó a producción. Los días ANTERIORES a esa fecha no se le sirvieron
// nunca a nadie —la función no existía todavía—, así que no hay ningún resultado
// guardado que estropear y sí se pueden generar. Los días desde el estreno en
// adelante siguen congelados igual que siempre. Sin esta opción, todo el pasado
// es intocable, que es el comportamiento correcto en cualquier mes normal.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolver, verificar } from "./solver.ts";
import { deriveSeed } from "../src/core/daily/index.ts";
import { DAILY_SEEDS } from "../src/game/daily-seeds.ts";
import type { LoggedAction, SuitMode } from "../src/game/types.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const TABLA = path.join(ROOT, "src", "game", "daily-seeds.ts");
const SOLUCIONES = path.join(ROOT, "scripts", ".solutions");

// ---------------------------------------------------------------- argumentos

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? "true");
}

const hoy = new Date();
const mes = args.get("mes") ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
const intentos = Number(args.get("intentos") ?? 8);
const presupuesto = Number(args.get("presupuesto") ?? 150_000);
const maxCandidatas = Number(args.get("candidatas") ?? 40);
const escribir = args.has("escribir");

// ---------------------------------------------------------------- fechas

function diasDelMes(mesIso: string): string[] {
  const [y, m] = mesIso.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= total; d++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/** Hoy en horario local, en el mismo formato que usa el juego. */
const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
  hoy.getDate()
).padStart(2, "0")}`;

/** Día de estreno del reto diario, si se declara. Ver la cabecera del archivo. */
const estreno = args.get("estreno") ?? null;
if (estreno !== null && !/^\d{4}-\d{2}-\d{2}$/.test(estreno)) {
  console.error(`--estreno tiene que ser una fecha AAAA-MM-DD (he recibido "${estreno}")`);
  process.exit(1);
}

/**
 * ¿Es un día que alguien ya pudo jugar? Esos no se tocan jamás.
 *
 * El futuro nunca lo es. El pasado lo es siempre... salvo que se declare un día
 * de estreno, y entonces los días anteriores a él tampoco: el reto diario no
 * existía, nadie los vio y no hay nada que romper.
 */
function congelado(fecha: string): boolean {
  if (fecha > claveHoy) return false;
  if (estreno === null) return true;
  return fecha >= estreno;
}

// ---------------------------------------------------------------- búsqueda

interface Hallazgo {
  fecha: string;
  variante: "2" | "4";
  semilla: number;
  acciones: LoggedAction[];
  candidatasProbadas: number;
  ms: number;
}

/**
 * Busca una semilla ganable para un día y una dificultad. Empieza por la
 * semilla natural del día —si esa ya vale, el jugador acaba teniendo el mismo
 * reparto que habría tenido sin tabla— y va probando las siguientes.
 */
function buscarSemilla(fecha: string, variante: "2" | "4"): Hallazgo | null {
  const modo = (variante === "2" ? 2 : 4) as SuitMode;
  const base = deriveSeed(fecha, variante);
  const t0 = Date.now();

  for (let i = 0; i < maxCandidatas; i++) {
    const semilla = (base + i) >>> 0;
    for (let intento = 0; intento < intentos; intento++) {
      const r = resolver(semilla, modo, { presupuesto, intento });
      if (!r.solucion) continue;
      // La garantía: si el motor real no la da por ganada, no vale.
      if (!verificar(semilla, modo, r.solucion)) {
        console.log(`    ⚠ semilla ${semilla}: el motor NO confirma la victoria. Descartada.`);
        break;
      }
      return {
        fecha,
        variante,
        semilla,
        acciones: r.solucion,
        candidatasProbadas: i + 1,
        ms: Date.now() - t0
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------- escritura

type Tabla = Record<string, Partial<Record<"2" | "4", number>>>;

function escribirTabla(tabla: Tabla): void {
  const original = readFileSync(TABLA, "utf8");
  const marca = "export const DAILY_SEEDS";
  const corte = original.indexOf(marca);
  if (corte < 0) throw new Error("No encuentro la declaración DAILY_SEEDS en la tabla");

  const fechas = Object.keys(tabla).sort();
  const lineas = fechas.map((f) => {
    const e = tabla[f];
    const partes = (["2", "4"] as const)
      .filter((v) => e[v] !== undefined)
      .map((v) => `"${v}": ${e[v]}`);
    return `  "${f}": { ${partes.join(", ")} },`;
  });

  const cuerpo =
    `export const DAILY_SEEDS: Readonly<Record<string, Readonly<Partial<Record<DailyVariant, number>>>>> = {\n` +
    (lineas.length > 0
      ? lineas.join("\n") + "\n"
      : "  // Sin semillas todavía: cada día deriva la suya de la fecha.\n") +
    `};\n`;

  writeFileSync(TABLA, original.slice(0, corte) + cuerpo, "utf8");
}

/** Vuelca tabla y partidas ganadas al disco. Idempotente. */
function guardar(
  tabla: Tabla,
  soluciones: Record<string, { semilla: number; acciones: LoggedAction[] }>
): void {
  escribirTabla(tabla);
  mkdirSync(SOLUCIONES, { recursive: true });
  const destino = path.join(SOLUCIONES, `${mes}.json`);
  let previas: Record<string, unknown> = {};
  try {
    previas = JSON.parse(readFileSync(destino, "utf8")) as Record<string, unknown>;
  } catch {
    // primera vez
  }
  writeFileSync(destino, JSON.stringify({ ...previas, ...soluciones }, null, 1), "utf8");
}

// ---------------------------------------------------------------- principal

const dias = diasDelMes(mes);
const tabla: Tabla = JSON.parse(JSON.stringify(DAILY_SEEDS)) as Tabla;
const soluciones: Record<string, { semilla: number; acciones: LoggedAction[] }> = {};

console.log(
  `Mes ${mes} · ${dias.length} días · ${intentos} intentos × ${presupuesto} nodos · ` +
    `hasta ${maxCandidatas} semillas candidatas por reto`
);
if (estreno !== null) {
  console.log(
    `Estreno declarado el ${estreno}: los días anteriores nunca se sirvieron y sí se generan.\n` +
      `Del ${estreno} en adelante, congelados como siempre.`
  );
}
console.log("");

let generadas = 0;
let saltadas = 0;
let fallidas = 0;
const t0 = Date.now();

for (const fecha of dias) {
  // Regla de oro: un día que alguien ya pudo jugar es un día congelado.
  if (congelado(fecha)) {
    saltadas++;
    continue;
  }
  for (const variante of ["2", "4"] as const) {
    if (tabla[fecha]?.[variante] !== undefined) {
      saltadas++;
      continue;
    }
    const hallazgo = buscarSemilla(fecha, variante);
    if (!hallazgo) {
      console.log(`  ${fecha} ${variante} palos: ✗ sin semilla ganable en ${maxCandidatas} candidatas`);
      fallidas++;
      continue;
    }
    tabla[fecha] = { ...tabla[fecha], [variante]: hallazgo.semilla };
    soluciones[`${fecha}|${variante}`] = {
      semilla: hallazgo.semilla,
      acciones: hallazgo.acciones
    };
    generadas++;
    // Se guarda tras cada hallazgo, no al final: generar un mes entero lleva
    // media hora y un fallo a mitad no puede tirar el trabajo hecho.
    if (escribir) guardar(tabla, soluciones);
    console.log(
      `  ${fecha} ${variante} palos: ✓ semilla ${String(hallazgo.semilla).padStart(10)} · ` +
        `${hallazgo.acciones.length} acciones · ${hallazgo.candidatasProbadas} candidata(s) · ` +
        `${(hallazgo.ms / 1000).toFixed(1)} s`
    );
  }
}

const minutos = ((Date.now() - t0) / 60000).toFixed(1);
console.log(
  `\nGeneradas ${generadas} · ya existentes o congeladas ${saltadas} · sin encontrar ${fallidas} · ${minutos} min`
);

if (!escribir) {
  console.log("\n(simulación: nada escrito. Añade --escribir para guardar)");
} else if (generadas > 0) {
  console.log(`Tabla actualizada: src/game/daily-seeds.ts`);
  console.log(`Partidas ganadas guardadas como prueba: scripts/.solutions/${mes}.json (fuera del repo)`);
}
