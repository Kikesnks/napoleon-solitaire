// Test funcional: arranca el preview de Vite, abre la app en chromium y
// reproduce el bug que reportó el usuario:
//  - Reparte 3 veces (clic en montón) → cartas boca arriba en pilas 1-4.
//  - Deshacer 3 veces.
//  - Verifica que la carta superior del montón está boca abajo.

import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const URL = "http://127.0.0.1:4174/";

async function startServer(): Promise<ChildProcess> {
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH ?? ""}` };
  const proc = spawn("npx.cmd", ["vite", "preview", "--host", "127.0.0.1", "--port", "4174"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true
  });
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      if (buffer.includes("4174")) {
        proc.stdout?.off("data", onData);
        setTimeout(() => resolve(proc), 500);
      }
    };
    proc.stdout?.on("data", onData);
    proc.on("error", reject);
    setTimeout(() => reject(new Error("server did not start")), 15000);
  });
}

async function main(): Promise<void> {
  console.log("Arrancando vite preview...");
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  const ok = (msg: string) => console.log(`  ok  ${msg}`);
  const fail = (msg: string) => {
    console.log(`  FAIL ${msg}`);
    failed++;
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector(".board", { timeout: 5000 });

    // ---------- 1. Estado inicial: top del montón boca abajo ----------
    const cardClassesAt = (id: string) =>
      // eslint-disable-next-line no-new-func
      new Function(
        "id",
        `
        var pile = document.querySelector('[data-pile-id="' + id + '"]');
        if (!pile) return null;
        var card = pile.querySelector('.card');
        if (!card) return null;
        return Array.from(card.classList);
        `
      ) as (id: string) => string[] | null;

    const montonClasses = (await page.evaluate(cardClassesAt(), "monton")) as string[] | null;
    if (montonClasses && montonClasses.includes("card--back")) {
      ok("inicial: top del montón es card--back (boca abajo)");
    } else {
      fail(`inicial: monton no es boca abajo, classes=${JSON.stringify(montonClasses)}`);
    }

    // ---------- 2. Tres deals ----------
    for (let i = 0; i < 3; i++) {
      await page.click('[data-pile-id="monton"]');
      await page.waitForTimeout(80);
    }

    const pile1ClassesAfter = (await page.evaluate(cardClassesAt(), "pile1")) as string[] | null;
    if (
      pile1ClassesAfter &&
      (pile1ClassesAfter.includes("card--red") || pile1ClassesAfter.includes("card--black"))
    ) {
      ok("tras 3 deals: pile1 muestra carta boca arriba");
    } else {
      fail(`tras 3 deals: pile1 classes=${JSON.stringify(pile1ClassesAfter)}`);
    }

    const montonAfterDeal = (await page.evaluate(cardClassesAt(), "monton")) as string[] | null;
    if (montonAfterDeal && montonAfterDeal.includes("card--back")) {
      ok("tras 3 deals: top del montón sigue boca abajo");
    } else {
      fail(`tras 3 deals: monton no es boca abajo, classes=${JSON.stringify(montonAfterDeal)}`);
    }

    // ---------- 3. Tres undos ----------
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Deshacer")');
      await page.waitForTimeout(80);
    }

    const montonAfterUndo = (await page.evaluate(cardClassesAt(), "monton")) as string[] | null;
    if (montonAfterUndo && montonAfterUndo.includes("card--back")) {
      ok("tras 3 undo: top del montón vuelve a estar boca abajo (BUG ARREGLADO)");
    } else {
      fail(
        `tras 3 undo: monton mostrando carta boca arriba — bug NO arreglado: classes=${JSON.stringify(montonAfterUndo)}`
      );
    }

    const pile1AfterUndo = (await page.evaluate(cardClassesAt(), "pile1")) as string[] | null;
    if (!pile1AfterUndo) {
      ok("tras 3 undo: pile1 vacía");
    } else {
      fail(`tras 3 undo: pile1 todavía tiene carta classes=${JSON.stringify(pile1AfterUndo)}`);
    }

    // ---------- 4. Verifica también via texto del HUD ----------
    const stats = await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(
        `
        var labels = document.querySelectorAll('.hud__stat-label');
        var values = document.querySelectorAll('.hud__stat-value');
        var out = {};
        for (var i = 0; i < labels.length; i++) {
          out[labels[i].textContent || ''] = values[i] ? values[i].textContent : null;
        }
        return out;
        `
      ) as () => Record<string, string>
    );
    if (stats["Montón"] === "64") {
      ok(`tras 3 undo: HUD reporta 64 cartas en el montón (correcto)`);
    } else {
      fail(`tras 3 undo: HUD montón=${stats["Montón"]} (debería ser 64)`);
    }

    // ---------- 5. En ronda 1 hay 4 slots de reparto ----------
    const dealCounts = (await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(
        `
        var deal = document.querySelector('.board__deal');
        if (!deal) return null;
        var ids = [];
        deal.querySelectorAll('[data-pile-id]').forEach(function(el) {
          var id = el.getAttribute('data-pile-id');
          if (id) ids.push(id);
        });
        return ids;
        `
      ) as () => string[] | null
    )) as string[] | null;
    if (dealCounts && dealCounts.length === 4) {
      ok(`ronda 1: ${dealCounts.length} slots activos (${dealCounts.join(", ")})`);
    } else {
      fail(`ronda 1: esperaba 4 slots, hay ${dealCounts?.length ?? 0} (${dealCounts?.join(",") ?? "null"})`);
    }
  } finally {
    await browser.close();
    server.kill();
  }

  if (failed === 0) {
    console.log(`\nOK — todos los chequeos funcionales pasaron`);
    process.exit(0);
  } else {
    console.log(`\nFAIL — ${failed} chequeo(s) funcional(es) fallaron`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
