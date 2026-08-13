// Empaqueta `dist-portal/` en el .zip que se sube a los portales y verifica
// de paso los límites técnicos de CrazyGames (el portal más exigente de los
// tres): ≤ 1500 archivos, descarga inicial ≤ 20 MB para optar a portada en
// móvil, y ningún sourcemap colado.
//
// Uso: npm run build:portal && npm run pack:portal

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist-portal");
const OUT_DIR = path.join(ROOT, "paquetes");

/** Límite para entrar en la portada móvil de CrazyGames. */
const LIMITE_INICIAL_MB = 20;
const LIMITE_ARCHIVOS = 1500;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function main(): void {
  let ficheros: string[];
  try {
    ficheros = walk(DIST);
  } catch {
    console.error("No existe dist-portal/. Ejecuta antes: npm run build:portal");
    process.exit(1);
  }

  const bytes = ficheros.reduce((n, f) => n + statSync(f).size, 0);
  const mb = bytes / (1024 * 1024);
  const mapas = ficheros.filter((f) => f.endsWith(".map"));

  console.log(`Archivos: ${ficheros.length} (límite ${LIMITE_ARCHIVOS})`);
  console.log(`Tamaño:   ${(bytes / 1024).toFixed(1)} KB (límite ${LIMITE_INICIAL_MB} MB)`);

  let problemas = 0;
  if (ficheros.length > LIMITE_ARCHIVOS) {
    console.error(`  FAIL demasiados archivos`);
    problemas++;
  }
  if (mb > LIMITE_INICIAL_MB) {
    console.error(`  FAIL el paquete supera los ${LIMITE_INICIAL_MB} MB`);
    problemas++;
  }
  if (mapas.length > 0) {
    console.error(`  FAIL sourcemaps en el build de portal: ${mapas.join(", ")}`);
    problemas++;
  }
  if (!ficheros.some((f) => f.endsWith("index.html"))) {
    console.error("  FAIL falta index.html en la raíz del paquete");
    problemas++;
  }
  if (problemas > 0) process.exit(1);

  mkdirSync(OUT_DIR, { recursive: true });
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const zip = path.join(OUT_DIR, `solitario-napoleon-portal-${fecha}.zip`);
  rmSync(zip, { force: true });

  // Compress-Archive de PowerShell: sin dependencias añadidas al proyecto.
  // El comodín \* mete el CONTENIDO de dist-portal, no la carpeta: los portales
  // esperan encontrar index.html en la raíz del zip.
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${DIST}\\*' -DestinationPath '${zip}' -Force`
    ],
    { stdio: "inherit" }
  );

  const zipKb = statSync(zip).size / 1024;
  console.log(`\nOK — paquete listo: ${path.relative(ROOT, zip)} (${zipKb.toFixed(1)} KB)`);
  console.log("Sube este .zip en el formulario del portal.");
}

main();
