// Captura screenshots del juego en laptop y móvil para inspección visual.
// Las imágenes se guardan en `screenshots/` (ignorado por git).

import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const URL = "http://127.0.0.1:4175/";
const OUT_DIR = path.join(ROOT, "screenshots");

async function startServer(): Promise<ChildProcess> {
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH ?? ""}` };
  const proc = spawn("npx.cmd", ["vite", "preview", "--host", "127.0.0.1", "--port", "4175"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true
  });
  return new Promise((resolve, reject) => {
    let buffer = "";
    proc.stdout?.on("data", (c) => {
      buffer += c.toString();
      if (buffer.includes("4175")) setTimeout(() => resolve(proc), 500);
    });
    setTimeout(() => reject(new Error("server timeout")), 15000);
  });
}

interface VP {
  name: string;
  width: number;
  height: number;
  /** Cuántos clicks al montón antes de la captura. */
  deals: number;
  colorScheme?: "light" | "dark";
  /** Si true, NO descarta el modal de instrucciones (para capturarlo). */
  showInstructions?: boolean;
  /** Si tras cerrar instrucciones queremos cambiar a EN antes. */
  langEN?: boolean;
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
    langEN: true
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
  { name: "laptop-round-2-3-slots", width: 1366, height: 768, deals: 17 }
];

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const server = await startServer();
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
      if (vp.langEN) {
        await page.click('.instructions__lang-btn:has-text("EN")');
        await page.waitForTimeout(60);
      }
      if (!vp.showInstructions) {
        const cta = await page.$(".instructions__cta");
        if (cta) {
          await cta.click();
          await page.waitForTimeout(80);
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
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
