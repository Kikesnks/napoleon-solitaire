// Captura screenshots del juego en laptop y móvil para inspección visual.
// Las imágenes se guardan en `screenshots/` (ignorado por git).

import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { startPreview, stopPreview } from "./preview-server.ts";

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
  { name: "laptop-mid-deal", width: 1366, height: 768, deals: 0, midDealMs: 550 }
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
