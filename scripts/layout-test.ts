// Test de layout: arranca el preview de Vite, abre la app en chromium headless
// con varios viewports y verifica que el tablero quepa SIN scroll y que las
// 18 piezas (5 fundaciones + 4 stocks + 4 free cells + 4 deal piles + monton)
// estén dentro del viewport.

import { chromium } from "playwright";
import { startPreview, stopPreview } from "./preview-server.ts";

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;

interface Viewport {
  name: string;
  width: number;
  height: number;
  colorScheme?: "light" | "dark";
  locale?: string;
}

const VIEWPORTS: Viewport[] = [
  { name: "iPhone-SE-portrait", width: 375, height: 667 },
  { name: "Pixel-portrait", width: 412, height: 869 },
  // Los móviles estrechos que quedan: es donde los cinco datos del marcador se
  // montaban unos sobre otros. El francés vuelve a entrar porque sus nombres
  // ("Points", "Coups", "Talon") son los más largos de los tres idiomas.
  { name: "Android-360-portrait", width: 360, height: 740 },
  { name: "Android-360-FR", width: 360, height: 740, locale: "fr-FR" },
  { name: "Movil-320-portrait", width: 320, height: 568 },
  { name: "iPhone-landscape", width: 844, height: 390 },
  // Apaisado de móvil: aquí la altura es el recurso escaso y es donde el
  // tablero se salía por abajo, dejando las pilas de reparto 1-4 recortadas
  // (sin scroll, así que sencillamente no se veían). El francés entra a
  // propósito: sus botones son los más largos y engordan la cabecera, que es
  // justo lo que rompía la estimación de altura del CSS.
  { name: "Android-landscape-FR", width: 915, height: 412, locale: "fr-FR" },
  { name: "Landscape-corto", width: 740, height: 340 },
  { name: "iPad-portrait", width: 820, height: 1180 },
  { name: "Laptop-1366", width: 1366, height: 768 },
  { name: "Desktop-1920", width: 1920, height: 1080 },
  // Simula Android Chrome con preferencia oscura del sistema. Con
  // color-scheme: only light declarado en CSS+meta, las cartas deben
  // seguir mostrándose con fondo blanco y texto rojo/negro.
  { name: "Android-dark-pref", width: 412, height: 869, colorScheme: "dark" }
];

const PILE_IDS = [
  "I",
  "II",
  "III",
  "IV",
  "X",
  "monton",
  "A",
  "B",
  "C",
  "D",
  "A1",
  "B1",
  "C1",
  "D1",
  "pile1",
  "pile2",
  "pile3",
  "pile4"
];

async function main(): Promise<void> {
  console.log("Arrancando vite preview...");
  const server = await startPreview({ port: PORT });

  const browser = await chromium.launch({ headless: true });
  let failed = 0;

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: vp.colorScheme ?? "light",
        locale: vp.locale ?? "es-ES"
      });
      const page = await context.newPage();
      await page.goto(URL, { waitUntil: "networkidle" });
      // Espera a que React monte
      await page.waitForSelector(".board", { timeout: 5000 });

      // En primer arranque (localStorage limpio por contexto nuevo) las
      // instrucciones tapan el tablero. Las descartamos antes de medir.
      const hadInstructions = await page.$(".instructions__cta");
      if (hadInstructions) {
        await page.click(".instructions__cta");
        await page.waitForTimeout(80);
      }

      // Y detrás viene el selector de palos (v1.2), que también tapa el
      // tablero. Sin resolverlo, las medidas se tomaban sobre el diálogo.
      const suit = await page.$(".suit-select");
      if (suit) {
        const options = await page.$$(".suit-select__option");
        await options[1].click(); // 4 palos (baraja completa)
        await page.waitForTimeout(1500); // deja terminar el reparto animado
      }

      // Para el viewport de dark mode, hacemos un deal para que aparezca al
      // menos una carta boca arriba y podamos comprobar el contraste.
      if (vp.colorScheme === "dark") {
        await page.click('[data-pile-id="monton"]');
        await page.waitForTimeout(80);
      }

      // Pasamos el evaluador como string para que tsx no inyecte helpers como
      // __name que no existen en el browser context.
      const measurements = (await page.evaluate(
        // eslint-disable-next-line no-new-func
        new Function(
          "pileIds",
          `
          var rect = function(el) {
            if (!el) return null;
            var r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          };
          var board = document.querySelector('.board');
          var main = document.querySelector('.app__main');

          // Marcador: ¿caben los cinco datos? Se mide con el peor cronómetro
          // realista ("888:88", una partida de más de 12 horas) porque en el
          // test el reloj marca 00:0X y no destaparía el problema. El valor se
          // pisa a mano un instante; React lo repinta en el siguiente render.
          var stats = [];
          var statEls = document.querySelectorAll('.hud__stat');
          var reloj = statEls.length ? statEls[0].querySelector('.hud__stat-value') : null;
          var relojOriginal = reloj ? reloj.textContent : null;
          if (reloj) reloj.textContent = '888:88';
          for (var s = 0; s < statEls.length; s++) {
            var el = statEls[s];
            var etiqueta = el.querySelector('.hud__stat-label');
            var valor = el.querySelector('.hud__stat-value');
            stats.push({
              texto: (etiqueta ? (etiqueta.innerText || '').trim() : ''),
              valor: (valor ? (valor.textContent || '').trim() : ''),
              clientWidth: el.clientWidth,
              // scrollWidth incluye lo que se sale de la caja: si es mayor que
              // clientWidth, el contenido no cabe (y antes de recortarlo se
              // pintaba encima del dato de al lado).
              scrollWidth: el.scrollWidth,
              right: el.getBoundingClientRect().right
            });
          }
          if (reloj && relojOriginal !== null) reloj.textContent = relojOriginal;

          var hudRect = rect(document.querySelector('.hud'));

          var piles = {};
          for (var i = 0; i < pileIds.length; i++) {
            var id = pileIds[i];
            // Medimos el slot (la zona donde realmente se dibuja la carta).
            // El contenedor .pile puede estirarse al alto del grid cell.
            var pileEl = document.querySelector('[data-pile-id="' + id + '"]');
            var slot = pileEl ? pileEl.querySelector('.pile__slot') : null;
            piles[id] = rect(slot);
          }
          return {
            viewport: { w: window.innerWidth, h: window.innerHeight },
            documentScroll: {
              scrollHeight: document.documentElement.scrollHeight,
              scrollWidth: document.documentElement.scrollWidth
            },
            mainScroll: main ? { scrollHeight: main.scrollHeight, scrollWidth: main.scrollWidth } : null,
            board: rect(board),
            main: rect(main),
            hud: hudRect,
            stats: stats,
            piles: piles
          };
          `
        ) as (pileIds: string[]) => unknown,
        PILE_IDS
      )) as {
        viewport: { w: number; h: number };
        documentScroll: { scrollHeight: number; scrollWidth: number };
        mainScroll: { scrollHeight: number; scrollWidth: number } | null;
        board: { x: number; y: number; w: number; h: number } | null;
        main: { x: number; y: number; w: number; h: number } | null;
        hud: { x: number; y: number; w: number; h: number } | null;
        stats: Array<{
          texto: string;
          valor: string;
          clientWidth: number;
          scrollWidth: number;
          right: number;
        }>;
        piles: Record<string, { x: number; y: number; w: number; h: number } | null>;
      };

      const { viewport, documentScroll, mainScroll, board, main, hud, stats, piles } =
        measurements;
      let vpFailed = false;

      // 0a) El marcador del HUD debe CABER, no sólo no desbordar la pantalla.
      //     Cinco datos en un móvil estrecho se pisaban entre ellos.
      if (stats.length !== 5) {
        console.log(`  [${vp.name}] FAIL esperaba 5 datos en el HUD, hay ${stats.length}`);
        vpFailed = true;
      }
      for (const st of stats) {
        if (st.scrollWidth > st.clientWidth + 1) {
          console.log(
            `  [${vp.name}] FAIL el dato "${st.texto}" no cabe: necesita ${st.scrollWidth}px y tiene ${st.clientWidth}px`
          );
          vpFailed = true;
        }
      }
      const ultimo = stats[stats.length - 1];
      if (hud && ultimo && ultimo.right > hud.x + hud.w + 1) {
        console.log(
          `  [${vp.name}] FAIL el marcador se sale del HUD (borde ${ultimo.right.toFixed(0)} > ${(hud.x + hud.w).toFixed(0)})`
        );
        vpFailed = true;
      }

      // 0) El tablero debe caber DENTRO de su contenedor. `.app__main` recorta
      //    con overflow:hidden y sin scroll, así que lo que se salga no es que
      //    quede feo: desaparece. Se comprueba aparte del viewport porque es el
      //    borde que de verdad recorta.
      if (board && main) {
        const desborde = Math.max(0, board.y + board.h - (main.y + main.h));
        if (desborde > 1) {
          console.log(
            `  [${vp.name}] FAIL el tablero se sale ${desborde.toFixed(0)}px por debajo de .app__main (se recorta sin scroll)`
          );
          vpFailed = true;
        }
      }

      // 1) No debe haber scroll vertical
      if (documentScroll.scrollHeight > viewport.h + 1) {
        console.log(
          `  [${vp.name}] FAIL scroll vertical: scrollH=${documentScroll.scrollHeight} vp.h=${viewport.h}`
        );
        vpFailed = true;
      }
      if (mainScroll && mainScroll.scrollHeight > viewport.h + 1) {
        console.log(`  [${vp.name}] FAIL .app__main tiene contenido fuera`);
        vpFailed = true;
      }

      // 2) Tablero dentro del viewport
      if (!board) {
        console.log(`  [${vp.name}] FAIL no encuentro .board`);
        vpFailed = true;
      } else {
        if (board.x < -1 || board.y < -1) {
          console.log(`  [${vp.name}] FAIL board fuera por la esquina (x=${board.x}, y=${board.y})`);
          vpFailed = true;
        }
        if (board.x + board.w > viewport.w + 1) {
          console.log(
            `  [${vp.name}] FAIL board ancho: right=${board.x + board.w} vp.w=${viewport.w}`
          );
          vpFailed = true;
        }
        if (board.y + board.h > viewport.h + 1) {
          console.log(
            `  [${vp.name}] FAIL board alto: bottom=${board.y + board.h} vp.h=${viewport.h}`
          );
          vpFailed = true;
        }
      }

      // 3) Cada pila visible y dentro del viewport
      for (const id of PILE_IDS) {
        const r = piles[id];
        if (!r || r.w === 0 || r.h === 0) {
          console.log(`  [${vp.name}] FAIL pila ${id} no encontrada o tamaño 0`);
          vpFailed = true;
          continue;
        }
        if (r.x + r.w > viewport.w + 1 || r.y + r.h > viewport.h + 1 || r.x < -1 || r.y < -1) {
          console.log(
            `  [${vp.name}] FAIL pila ${id} fuera del viewport (x=${r.x.toFixed(0)} y=${r.y.toFixed(0)} w=${r.w.toFixed(0)} h=${r.h.toFixed(0)})`
          );
          vpFailed = true;
        }
      }

      // 4) Las pilas de reparto deben estar centradas EN LA COLUMNA DE X.
      const xSlot = piles["X"];
      const p1 = piles["pile1"];
      const p4 = piles["pile4"];
      if (xSlot && p1 && p4) {
        const xCenter = xSlot.x + xSlot.w / 2;
        const dealCenter = (p1.x + p4.x + p4.w) / 2;
        const offset = Math.abs(xCenter - dealCenter);
        if (offset > 2) {
          console.log(
            `  [${vp.name}] FAIL pilas de reparto desalineadas con X: xCenter=${xCenter.toFixed(1)} dealCenter=${dealCenter.toFixed(1)} offset=${offset.toFixed(1)}px`
          );
          vpFailed = true;
        }
      }

      // 5) Mismo tamaño de carta: una vertical y una horizontal deben tener el
      //    mismo área visual (anchura × altura con dimensiones intercambiadas).
      const vertical = piles["I"];
      const horizontal = piles["B1"];
      if (vertical && horizontal) {
        const vArea = vertical.w * vertical.h;
        const hArea = horizontal.w * horizontal.h;
        const ratio = Math.abs(vArea - hArea) / vArea;
        // Tolerancia 10% (los slots tienen algún padding/border y el grid puede
        // ajustar fracciones de píxel).
        if (ratio > 0.1) {
          console.log(
            `  [${vp.name}] FAIL áreas distintas: I=${vArea.toFixed(0)}px² B1=${hArea.toFixed(0)}px² ratio=${ratio.toFixed(3)}`
          );
          vpFailed = true;
        }
        // Las dimensiones cruzadas también deben coincidir (horizontal.w ≈ vertical.h).
        const wDiff = Math.abs(horizontal.w - vertical.h) / vertical.h;
        const hDiff = Math.abs(horizontal.h - vertical.w) / vertical.w;
        if (wDiff > 0.15 || hDiff > 0.15) {
          console.log(
            `  [${vp.name}] FAIL dims no coinciden: I=${vertical.w.toFixed(0)}×${vertical.h.toFixed(0)} B1=${horizontal.w.toFixed(0)}×${horizontal.h.toFixed(0)}`
          );
          vpFailed = true;
        }
      }

      // 6) En dark mode preference, las cartas deben seguir teniendo fondo
      //    blanco y texto rojo/negro vivos.
      if (vp.colorScheme === "dark") {
        const cardColors = (await page.evaluate(
          // eslint-disable-next-line no-new-func
          new Function(
            `
            // Usamos el top de pile1 (acabamos de hacer un deal) que tendrá
            // .card--red o .card--black y debería estar boca arriba.
            var card = document.querySelector('[data-pile-id="pile1"] .card');
            if (!card) return null;
            var cs = getComputedStyle(card);
            return {
              bg: cs.backgroundColor,
              color: cs.color,
              hasRed: card.classList.contains('card--red'),
              hasBlack: card.classList.contains('card--black')
            };
            `
          ) as () => { bg: string; color: string; hasRed: boolean; hasBlack: boolean } | null
        )) as { bg: string; color: string; hasRed: boolean; hasBlack: boolean } | null;

        if (!cardColors) {
          console.log(`  [${vp.name}] FAIL no encuentro carta para chequeo de color`);
          vpFailed = true;
        } else {
          // El fondo debe ser blanco (rgb(255,255,255)).
          if (!cardColors.bg.includes("255, 255, 255")) {
            console.log(
              `  [${vp.name}] FAIL Android Auto-Dark invertió el fondo de la carta: bg=${cardColors.bg}`
            );
            vpFailed = true;
          }
          // El texto debe estar en rojo o negro vivo, no invertido a blanco/gris.
          const colorOk =
            (cardColors.hasRed && /^rgb\(2\d\d,\s*\d{1,2},\s*\d{1,2}\)/.test(cardColors.color)) ||
            (cardColors.hasBlack && /^rgb\((\d|1\d|2\d|3\d),\s*/.test(cardColors.color));
          if (!colorOk) {
            console.log(
              `  [${vp.name}] FAIL color de texto invertido: color=${cardColors.color} hasRed=${cardColors.hasRed} hasBlack=${cardColors.hasBlack}`
            );
            vpFailed = true;
          }
        }
      }

      if (!vpFailed) {
        console.log(
          `  [${vp.name}] ok  vp=${viewport.w}x${viewport.h} board=${board?.w.toFixed(0)}x${board?.h.toFixed(0)}`
        );
      } else {
        failed++;
      }

      await context.close();
    }
  } finally {
    await browser.close();
    stopPreview(server);
  }

  if (failed === 0) {
    console.log(`\nOK — todos los viewports pasaron`);
    process.exit(0);
  } else {
    console.log(`\nFAIL — ${failed} viewport(s) fallaron`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
