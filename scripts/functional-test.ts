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
    // Contexto sin localStorage previo: la primera visita debe mostrar las
    // instrucciones automáticamente.
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 768 }
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector(".board", { timeout: 5000 });

    // ---------- 0. Instrucciones aparecen en primer arranque ----------
    const hasInstructions = await page.$(".instructions");
    if (hasInstructions) {
      ok("primer arranque: pantalla de instrucciones visible");
    } else {
      fail("primer arranque: NO aparece la pantalla de instrucciones");
    }

    // Toggle de idioma EN
    await page.click('.instructions__lang-btn:has-text("EN")');
    await page.waitForTimeout(50);
    const titleEN = await page.textContent(".instructions__title");
    if (titleEN && titleEN.toLowerCase().includes("rules")) {
      ok(`toggle EN: título "${titleEN}"`);
    } else {
      fail(`toggle EN: título no cambió, sigue "${titleEN}"`);
    }
    // Volver a ES
    await page.click('.instructions__lang-btn:has-text("ES")');
    await page.waitForTimeout(50);

    // Pulsa "Empezar a jugar" para entrar al juego
    await page.click(".instructions__cta");
    await page.waitForTimeout(120);
    const stillVisible = await page.$(".instructions");
    if (!stillVisible) {
      ok("dismiss: tras pulsar 'Empezar a jugar' se cierra el modal");
    } else {
      fail("dismiss: el modal sigue visible tras pulsar 'Empezar a jugar'");
    }

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

    // ---------- 5b. Contadores SÓLO en A/A1/B/B1/C/C1/D/D1 y monton ----------
    const countsByPile = (await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(
        `
        var ids = ["I","II","III","IV","X","A","A1","B","B1","C","C1","D","D1","pile1","pile2","pile3","pile4","monton"];
        var out = {};
        for (var i=0;i<ids.length;i++) {
          var id = ids[i];
          var el = document.querySelector('[data-pile-id="'+id+'"] .pile__count');
          out[id] = el ? el.textContent : null;
        }
        return out;
        `
      ) as () => Record<string, string | null>
    )) as Record<string, string | null>;
    const WITH_COUNT = ["A", "A1", "B", "B1", "C", "C1", "D", "D1", "monton"];
    const WITHOUT = ["I", "II", "III", "IV", "X", "pile1", "pile2", "pile3", "pile4"];
    // A/B/C/D arrancan con 9 cartas → badge "9". A1/B1/C1/D1 con 1 carta →
    // como sigue mostrando con length>1, NO aparece badge para ellas todavía.
    // Monton con 60 (tras 1 deal) → badge "60".
    let countsOk = true;
    for (const id of WITH_COUNT) {
      const hasBadge = countsByPile[id] !== null;
      // Para A/B/C/D y monton SIEMPRE deben tener badge (length > 1).
      // Para A1/B1/C1/D1 con 1 carta NO tienen badge (length === 1).
      const expected = id.endsWith("1") ? false : true;
      if (hasBadge !== expected) {
        console.log(
          `  FAIL contador en ${id}: hasBadge=${hasBadge} expected=${expected} (text="${countsByPile[id]}")`
        );
        countsOk = false;
      }
    }
    for (const id of WITHOUT) {
      if (countsByPile[id] !== null) {
        console.log(`  FAIL ${id} muestra contador "${countsByPile[id]}" (no debe)`);
        countsOk = false;
      }
    }
    if (countsOk) {
      ok(`contadores SÓLO en A/B/C/D/monton (no en fundaciones ni pilas de reparto)`);
    } else {
      fail(`distribución de contadores incorrecta`);
    }

    // ---------- 6. Botón 📖 Reglas reabre la pantalla de instrucciones ----------
    await page.click('.hud__btn--icon');
    await page.waitForTimeout(100);
    const reopened = await page.$(".instructions");
    if (reopened) {
      ok("botón 📖: reabre la pantalla de instrucciones");
    } else {
      fail("botón 📖: NO reabre la pantalla de instrucciones");
    }
    // El CTA ahora dice "Cerrar" (no "Empezar a jugar") porque ya no es first-run
    const ctaText = (await page.textContent(".instructions__cta")) ?? "";
    if (ctaText.trim().toLowerCase() === "cerrar") {
      ok(`reapertura: el botón dice "${ctaText.trim()}" (no first-run)`);
    } else {
      fail(`reapertura: esperaba "Cerrar", el botón dice "${ctaText.trim()}"`);
    }
    await page.click(".instructions__cta");
    await page.waitForTimeout(80);

    // ---------- 7. Recargar la página NO vuelve a mostrar instrucciones ----------
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".board", { timeout: 5000 });
    await page.waitForTimeout(120);
    const afterReload = await page.$(".instructions");
    if (!afterReload) {
      ok("recarga: las instrucciones NO se vuelven a mostrar (persistencia OK)");
    } else {
      fail("recarga: las instrucciones reaparecen tras recargar (persistencia rota)");
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
