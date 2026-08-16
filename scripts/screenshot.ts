// Captura screenshots del juego en laptop y móvil para inspección visual.
// Las imágenes se guardan en `screenshots/` (ignorado por git).

import { chromium, type BrowserContext } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { startPreview, stopPreview } from "./preview-server.ts";
import { daily } from "../src/game/daily.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 4175;
const URL = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = path.join(ROOT, "screenshots");

interface VP {
  name: string;
  width: number;
  height: number;
  /** Cuántos clicks al montón antes de la captura. */
  deals: number;
  colorScheme?: "light" | "dark";
  /** Si true, NO descarta el modal de instrucciones (para capturarlo). */
  showInstructions?: boolean;
  /**
   * Idioma a seleccionar en el modal antes de capturar, por el `title` del
   * botón ("English", "Français"). Se usa el title y no el texto visible
   * porque el selector muestra bandera + endónimo y el orden puede cambiar.
   */
  lang?: string;
  /** Captura a los N ms tras cerrar instrucciones (para ver el reparto). */
  midDealMs?: number;
  /** Inyecta un estado ganado para fotografiar el confetti. */
  forceWin?: boolean;
  /**
   * Diálogo que hay que dejar abierto para la captura. Sin esto el script los
   * cierra todos para fotografiar el tablero, y las funciones que viven en un
   * diálogo —el reto diario, el calendario, el ranking— no salían en ninguna
   * captura por no existir manera de pedirlo.
   */
  dialog?: "daily" | "leaderboard";
  /**
   * Siembra datos de muestra para que la función se vea EN USO. Un calendario
   * con todos los días en blanco no enseña nada.
   *
   * ⚠️ Las capturas que lo usan llevan progreso inventado. Son legítimas para
   * enseñar cómo es la pantalla, pero no son una partida real: conviene saberlo
   * antes de mandarlas a la ficha de un portal.
   */
  demoData?: "daily" | "leaderboard";
}

/**
 * Progreso de muestra del reto diario: unos cuantos días hechos y otros
 * pendientes, que es como se ve el calendario de alguien que lo usa.
 */
async function sembrarRetoDiario(ctx: BrowserContext): Promise<void> {
  const dias = daily.playableKeys();
  const hoy = daily.todayKey();
  const resultados: Array<Record<string, unknown>> = [];
  dias.forEach((fecha, i) => {
    if (fecha === hoy) return; // hoy se deja pendiente: hay algo que hacer
    for (const variant of ["2", "4"] as const) {
      // Un patrón irregular, que es como queda un mes de verdad: días
      // completos, días a medias y algunos sin tocar.
      if ((i + (variant === "2" ? 0 : 2)) % 5 === 3) continue;
      resultados.push({
        date: fecha,
        variant,
        score: 180 + ((i * 37 + (variant === "2" ? 90 : 0)) % 240),
        won: (i + (variant === "2" ? 1 : 0)) % 3 === 0,
        ts: Date.now() - i * 86_400_000
      });
    }
  });
  const racha = { current: 4, best: 9, last: dias[dias.length - 2] ?? hoy };
  await ctx.addInitScript(
    ([res, r]) => {
      window.localStorage.setItem("solnap.daily.results", res as string);
      window.localStorage.setItem("solnap.daily.streak", r as string);
    },
    [JSON.stringify(resultados), JSON.stringify(racha)]
  );
}

/** Ranking de muestra, para que la tabla no salga vacía. */
async function sembrarRanking(ctx: BrowserContext): Promise<void> {
  const filas = [
    { name: "Marta", score: 610, suitMode: 4, date: "14/08/26", ts: 5 },
    { name: "Kike", score: 540, suitMode: 4, date: "15/08/26", ts: 4 },
    { name: "Nuria", score: 480, suitMode: 4, date: "12/08/26", ts: 3 },
    { name: "Iván", score: 350, suitMode: 4, date: "11/08/26", ts: 2 },
    { name: "Lola", score: 290, suitMode: 4, date: "10/08/26", ts: 1 }
  ];
  await ctx.addInitScript((f) => {
    window.localStorage.setItem("solnap.lb.won-4", f as string);
    window.localStorage.setItem("solnap.lb.split", "1");
  }, JSON.stringify(filas));
}

const SHOTS: VP[] = [
  // Pantalla de instrucciones en primer arranque (ES y EN)
  { name: "instructions-es-laptop", width: 1366, height: 768, deals: 0, showInstructions: true },
  {
    name: "instructions-en-laptop",
    width: 1366,
    height: 768,
    deals: 0,
    showInstructions: true,
    lang: "English"
  },
  // El francés se daba por capturado pero nadie lo generaba: el archivo no
  // llegaba a existir.
  {
    name: "instructions-fr-laptop",
    width: 1366,
    height: 768,
    deals: 0,
    showInstructions: true,
    lang: "Français"
  },
  { name: "instructions-es-mobile", width: 375, height: 667, deals: 0, showInstructions: true },
  // Tablero ya en juego
  { name: "laptop-1366x768-initial", width: 1366, height: 768, deals: 0 },
  { name: "laptop-1366x768-after-1-deal", width: 1366, height: 768, deals: 1 },
  { name: "mobile-portrait-375x667-initial", width: 375, height: 667, deals: 0 },
  { name: "mobile-portrait-375x667-after-1-deal", width: 375, height: 667, deals: 1 },
  {
    name: "android-dark-pref-412x869",
    width: 412,
    height: 869,
    deals: 1,
    colorScheme: "dark"
  },
  { name: "laptop-round-2-3-slots", width: 1366, height: 768, deals: 17 },
  // Móviles estrechos: prueba de que el marcador cabe entero. Es la captura que
  // conviene mirar antes de subir nada, porque es donde se rompía.
  { name: "mobile-360x740-after-2-deals", width: 360, height: 740, deals: 2 },
  { name: "mobile-landscape-844x390", width: 844, height: 390, deals: 2 },
  // Reparto inicial a mitad de animación.
  { name: "laptop-mid-deal", width: 1366, height: 768, deals: 0, midDealMs: 550 },
  // El reto diario y su calendario del mes: es el argumento de venta del juego
  // y no salía en ninguna captura.
  {
    name: "daily-calendar-mobile",
    width: 375,
    height: 667,
    deals: 0,
    dialog: "daily",
    demoData: "daily"
  },
  {
    name: "daily-calendar-laptop",
    width: 1366,
    height: 768,
    deals: 0,
    dialog: "daily",
    demoData: "daily"
  },
  {
    name: "daily-calendar-en-mobile",
    width: 375,
    height: 667,
    deals: 0,
    lang: "English",
    dialog: "daily",
    demoData: "daily"
  },
  // El francés se captura igual que los otros dos: la ficha de portales lleva
  // los textos en tres idiomas, y mandar a un portal francés una imagen en
  // inglés teniendo la traducción hecha sería tirar el trabajo.
  {
    name: "daily-calendar-fr-mobile",
    width: 375,
    height: 667,
    deals: 0,
    lang: "Français",
    dialog: "daily",
    demoData: "daily"
  },
  // El ranking, ya separado por dificultad.
  {
    name: "leaderboard-mobile",
    width: 375,
    height: 667,
    deals: 0,
    dialog: "leaderboard",
    demoData: "leaderboard"
  }
];

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const server = await startPreview({ port: PORT });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of SHOTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: vp.colorScheme ?? "light"
      });
      // Los datos de muestra se siembran ANTES de cargar: la aplicación los lee
      // al arrancar y no vuelve a mirarlos.
      if (vp.demoData === "daily") await sembrarRetoDiario(ctx);
      if (vp.demoData === "leaderboard") await sembrarRanking(ctx);
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.waitForSelector(".board");
      if (vp.lang) {
        await page.click(`.instructions__lang-btn[title="${vp.lang}"]`);
        await page.waitForTimeout(60);
      }
      if (!vp.showInstructions) {
        const cta = await page.$(".instructions__cta");
        if (cta) {
          await cta.click();
          // Tras las reglas viene el selector de palos (v1.2). Sin resolverlo,
          // el diálogo tapa el tablero y todas las capturas salían mal.
          const suit = await page.waitForSelector(".suit-select", { timeout: 3000 }).catch(() => null);
          if (suit) {
            const options = await page.$$(".suit-select__option");
            await options[1].click(); // 4 palos (baraja completa)
          }
          // Para capturar mid-deal esperamos exactamente lo que pida vp;
          // si no, esperamos lo suficiente para que la animación termine.
          await page.waitForTimeout(vp.midDealMs ?? 1500);
        }
      }
      for (let i = 0; i < vp.deals; i++) {
        await page.click('[data-pile-id="monton"]');
        await page.waitForTimeout(60);
      }

      // El diálogo se abre al final, sobre el tablero ya repartido: así la
      // captura enseña la función sin que el fondo esté vacío.
      if (vp.dialog === "daily") {
        // Los tres idiomas, escritos enteros: `^="New"` no casa con "Nouvelle"
        // y la captura francesa se quedaba sin hacer.
        await page.click(
          'button[aria-label="Nueva"], button[aria-label="New"], button[aria-label="Nouvelle"]'
        );
        await page.waitForSelector(".suit-select__daily", { timeout: 5000 });
        await page.waitForTimeout(250);
      }
      if (vp.dialog === "leaderboard") {
        await page.click(
          'button[aria-label="LIGA DE CAMPEONES"], button[aria-label="CHAMPIONS LEAGUE"], ' +
            'button[aria-label="LIGUE DES CHAMPIONS"]'
        );
        await page.waitForSelector(".lb-viewer", { timeout: 5000 });
        await page.waitForTimeout(400);
      }

      const file = path.join(OUT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`  ${vp.name} -> ${path.relative(ROOT, file)}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    stopPreview(server);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
