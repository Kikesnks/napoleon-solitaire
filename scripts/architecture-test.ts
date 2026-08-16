// Vigila la frontera entre la base común y el juego concreto, que es el
// principio que hace que el siguiente solitario sea barato: si `core/` o
// `platform/` acaban sabiendo qué es un Napoleón, el molde deja de servir.
//
// Comprueba dos cosas:
//   1. Que nadie importa en la dirección prohibida (análisis de los imports).
//   2. Que los adaptadores de plataforma declaran lo que deben (en ejecución).
//
// Uso: npm run test:architecture

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createPlatform, detectPlatformId } from "../src/platform/index.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

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

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const CODIGO = /\.tsx?$/;
const IMPORTS = /(?:import|export)[^"']*from\s*["']([^"']+)["']/g;

/** Todos los destinos importados por los archivos de una carpeta de `src/`. */
function importsDe(carpeta: string): { archivo: string; destino: string }[] {
  const base = path.join(SRC, carpeta);
  if (!statSync(base, { throwIfNoEntry: false })) return [];
  return walk(base)
    .filter((f) => CODIGO.test(f))
    .flatMap((f) => {
      const texto = readFileSync(f, "utf8");
      return [...texto.matchAll(IMPORTS)].map((m) => ({
        archivo: path.relative(SRC, f).replace(/\\/g, "/"),
        destino: m[1]
      }));
    });
}

/** ¿El import apunta a alguna de estas carpetas de `src/`? */
function apuntaA(destino: string, carpetas: string[]): boolean {
  const normal = destino.replace(/\\/g, "/");
  return carpetas.some((c) => normal.includes(`/${c}/`) || normal.startsWith(`${c}/`));
}

// ============================================================
section("la base común no conoce el juego");

for (const comun of ["core", "platform"]) {
  const invasores = importsDe(comun).filter((i) => apuntaA(i.destino, ["game", "components", "hooks"]));
  check(
    `src/${comun}/ no importa del juego ni de la interfaz`,
    invasores.length === 0,
    invasores.map((i) => `${i.archivo} → ${i.destino}`).join(", ")
  );
}

section("el juego no sabe dónde está corriendo");

const desdeGame = importsDe("game");
check(
  "src/game/ no importa de src/platform/",
  !desdeGame.some((i) => apuntaA(i.destino, ["platform"])),
  desdeGame.filter((i) => apuntaA(i.destino, ["platform"])).map((i) => i.archivo).join(", ")
);
check(
  "src/game/ no importa React ni la interfaz",
  !desdeGame.some((i) => i.destino === "react" || apuntaA(i.destino, ["components", "hooks"])),
  desdeGame.filter((i) => i.destino === "react").map((i) => i.archivo).join(", ")
);
check(
  "src/game/ no lee el destino del build (lo aporta la plataforma)",
  !walk(path.join(SRC, "game"))
    .filter((f) => CODIGO.test(f))
    .some((f) => readFileSync(f, "utf8").includes("VITE_TARGET"))
);

// ============================================================
section("adaptadores de plataforma");

const web = createPlatform("web");
check("web: id correcto", web.id === "web");
check("web: ranking contra nuestro backend", web.leaderboard.remoteBaseUrl === "/api/leaderboard");
check("web: puede llamar al backend propio", web.capabilities.externalApi);
check("web: ranking global", web.capabilities.globalLeaderboard);

const portal = createPlatform("portal");
check("portal: id correcto", portal.id === "portal");
check("portal: ni una petición a nuestro backend", portal.leaderboard.remoteBaseUrl === null);
check("portal: sin API externa", !portal.capabilities.externalApi);
check("portal: ranking local", !portal.capabilities.globalLeaderboard);

for (const id of ["crazygames", "gamedistribution", "y8"] as const) {
  const p = createPlatform(id);
  check(`${id}: por ahora se comporta como portal genérico`, p.leaderboard.remoteBaseUrl === null);
}

check(
  "ningún adaptador promete anuncios que no existen todavía",
  [web, portal].every((p) => !p.capabilities.rewardedAds && !p.capabilities.interstitialAds)
);

section("detección");
check(
  "fuera del empaquetador (sin VITE_TARGET) la plataforma es web",
  detectPlatformId() === "web"
);

// ============================================================
console.log(
  failed === 0
    ? "\nOK — la frontera entre base común y juego se respeta"
    : `\n${failed} comprobación(es) de arquitectura han fallado`
);
process.exit(failed === 0 ? 0 : 1);
