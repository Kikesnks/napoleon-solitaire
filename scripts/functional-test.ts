// Test funcional: arranca el preview de Vite, abre la app en chromium y
// reproduce el bug que reportó el usuario:
//  - Reparte 3 veces (clic en montón) → cartas boca arriba en pilas 1-4.
//  - Deshacer 3 veces.
//  - Verifica que la carta superior del montón está boca abajo.

import { chromium } from "playwright";
import { startPreview, stopPreview } from "./preview-server.ts";

const PORT = 4174;
const URL = `http://127.0.0.1:${PORT}/`;

async function main(): Promise<void> {
  console.log("Arrancando vite preview...");
  const server = await startPreview({ port: PORT });
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
    // El selector ahora es bandera + nombre del idioma; localizamos por title,
    // que no depende del texto visible ni del orden.
    await page.click('.instructions__lang-btn[title="English"]');
    await page.waitForTimeout(50);
    const titleEN = await page.textContent(".instructions__title");
    if (titleEN && titleEN.toLowerCase().includes("rules")) {
      ok(`toggle EN: título "${titleEN}"`);
    } else {
      fail(`toggle EN: título no cambió, sigue "${titleEN}"`);
    }
    // Volver a ES
    await page.click('.instructions__lang-btn[title="Español"]');
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

    // ---------- 0a. Selector de palos (aparece tras cerrar las reglas) ----------
    // Se añadió en v1.2 y este test no lo contemplaba: el diálogo tapaba el
    // tablero y todos los clics posteriores fallaban.
    await page.waitForSelector(".suit-select", { timeout: 5000 });
    const suitOptions = await page.$$(".suit-select__option");
    if (suitOptions.length === 2) {
      ok("primer arranque: selector de palos con 2 opciones");
    } else {
      fail(`selector de palos: esperaba 2 opciones, hay ${suitOptions.length}`);
    }
    await suitOptions[1].click(); // 4 palos (baraja completa)
    await page.waitForTimeout(120);

    // ---------- 0b. Animación de reparto inicial ----------
    // Tras cerrar las instrucciones, .board--dealing debe estar presente
    // durante ~1.4s y luego desaparecer.
    const hasDealing = await page.$(".board.board--dealing");
    if (hasDealing) {
      ok("post-dismiss: .board--dealing aplicada al iniciar la partida");
    } else {
      fail("post-dismiss: .board--dealing NO se aplica");
    }
    // Esperamos un poco MENOS que la duración para confirmar que sigue activa,
    // luego un poco MÁS para confirmar que se quita.
    await page.waitForTimeout(700);
    const stillDealing = await page.$(".board.board--dealing");
    if (stillDealing) {
      ok("mid-anim: .board--dealing sigue activa a los 700ms");
    } else {
      fail("mid-anim: .board--dealing se quitó demasiado pronto");
    }
    await page.waitForTimeout(900);
    const dealingGone = await page.$(".board.board--dealing");
    if (!dealingGone) {
      ok("post-anim: .board--dealing eliminada tras la duración (~1.4s)");
    } else {
      fail("post-anim: .board--dealing sigue tras 1.6s (debería estar fuera)");
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
        // Ojo: cada rótulo lleva ahora DOS textos (nombre completo y
        // abreviatura, uno oculto por CSS según el ancho). Leer el
        // .hud__stat-label entero daría "MontónMont".
        var labels = document.querySelectorAll('.hud__stat-label--long');
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

    // ---------- 6. Botón Reglas reabre la pantalla de instrucciones ----------
    // Ojo: `.hud__btn--icon` es ahora el botón 🏆 del leaderboard, añadido
    // después de escribirse este test. El de reglas se localiza por su
    // aria-label, que no depende del orden de los botones.
    await page.click('button[aria-label="Reglas"]');
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

    // ---------- 6b. El diagrama del tablero está bien alineado ----------
    // La columna central del diagrama es más ancha que las demás (ahí van las
    // cartas tumbadas). X llevaba ancho fijo y se quedaba pegada al borde
    // izquierdo de su celda, descuadrada respecto a B/B1 y D/D1, que sí se
    // centran. En el tablero de verdad no pasa, así que el dibujo mentía.
    const centros = (await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(
        `
        var centro = function(pos) {
          var el = document.querySelector('.diagram [data-pos="' + pos + '"]');
          if (!el) return null;
          var r = el.getBoundingClientRect();
          return r.x + r.width / 2;
        };
        return { X: centro('X'), B: centro('B'), D: centro('D'), I: centro('I') };
        `
      ) as () => Record<string, number | null>
    )) as Record<string, number | null>;

    if (centros.X != null && centros.B != null && centros.D != null) {
      const desvB = Math.abs(centros.X - centros.B);
      const desvD = Math.abs(centros.X - centros.D);
      if (desvB <= 1 && desvD <= 1) {
        ok("diagrama de las reglas: X centrada con B/B1 y D/D1");
      } else {
        fail(
          `diagrama: X descentrada respecto a la columna central (B ${desvB.toFixed(1)}px, D ${desvD.toFixed(1)}px)`
        );
      }
    } else {
      fail("diagrama: no encuentro los slots X/B/D para medir la alineación");
    }

    // ---------- 6c. El enlace a la política se lee ----------
    // Hereda estilos de la barra oscura del juego; sobre el pie claro de las
    // reglas se quedaba en un amarillo invisible.
    const contraste = (await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(
        `
        var el = document.querySelector('.instructions__privacy-link');
        if (!el) return null;
        var cs = getComputedStyle(el);
        var lum = function(c) {
          var m = c.match(/\\d+/g);
          if (!m) return null;
          // Luminancia relativa aproximada (suficiente para distinguir un
          // texto oscuro de uno claro sobre fondo claro).
          return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        };
        return { texto: lum(cs.color), fondo: lum(cs.backgroundColor) };
        `
      ) as () => { texto: number | null; fondo: number | null } | null
    )) as { texto: number | null; fondo: number | null } | null;

    if (contraste && contraste.texto != null && contraste.fondo != null) {
      const salto = Math.abs(contraste.fondo - contraste.texto);
      if (contraste.texto < 0.4 && salto > 0.4) {
        ok(
          `enlace de privacidad legible: texto oscuro (lum ${contraste.texto.toFixed(2)}) sobre fondo claro (lum ${contraste.fondo.toFixed(2)})`
        );
      } else {
        fail(
          `enlace de privacidad con poco contraste: texto ${contraste.texto.toFixed(2)} vs fondo ${contraste.fondo.toFixed(2)}`
        );
      }
    } else {
      fail("enlace de privacidad: no puedo medir el contraste");
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
    stopPreview(server);
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
