// Test del build de portal: simula cómo sirve el juego un portal tipo
// CrazyGames — desde un subdirectorio de SU dominio, donde nuestro backend no
// existe (cualquier /api/... responde 404).
//
// Cubre:
//   T1.2  el ranking no enseña errores técnicos sin servidor
//   T1.3  partida sin errores de consola ni promesas rechazadas
//   T2.1  idiomas no españoles → inglés
//   T2.2  español → español
//   T2.3  la preferencia guardada manda sobre el navegador
//   T2.4  sin localStorage el juego arranca igual
//   T3.1  primera visita: se ven las reglas
//   T3.2  segunda visita: NO se ven
//   T3.4  tiempo hasta poder jugar en la segunda visita
//   T4.1  cero respuestas 4xx/5xx
//   T4.5  funciona servido desde subcarpeta
//   T5.1  cero peticiones a dominios de terceros
//   T5.2  cero cookies
//   T5.3  almacenamiento sólo funcional (claves solnap.*)
//
// Requiere `npm run build:portal` antes.

import { chromium, type Browser, type BrowserContext } from "playwright";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist-portal");
const PORT = 4185;
/** Subcarpeta a propósito: los portales sirven el juego colgando de una ruta. */
const BASE_PATH = "/juegos/napoleon/";
const URL = `http://127.0.0.1:${PORT}${BASE_PATH}`;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json"
};

let failed = 0;
const ok = (msg: string) => console.log(`  ok  ${msg}`);
const fail = (msg: string) => {
  console.log(`  FAIL ${msg}`);
  failed++;
};

function startServer(): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = (req.url ?? "/").split("?")[0];

    // El portal NO tiene nuestro backend: todo /api responde 404 con HTML,
    // que es justo lo que rompía el cliente antiguo del ranking.
    if (url.includes("/api/")) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<!doctype html><title>404</title>Not found");
      return;
    }

    if (!url.startsWith(BASE_PATH)) {
      res.writeHead(404).end("nope");
      return;
    }

    const rel = url.slice(BASE_PATH.length) || "index.html";
    try {
      const body = await readFile(path.join(DIST, rel));
      res.writeHead(200, { "Content-Type": MIME[path.extname(rel)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

interface Watchers {
  hosts: Set<string>;
  bad: string[];
  errors: string[];
}

/** Engancha los vigilantes de red y consola a un contexto. */
function watch(ctx: BrowserContext): Watchers {
  const w: Watchers = { hosts: new Set(), bad: [], errors: [] };
  ctx.on("request", (r) => w.hosts.add(new global.URL(r.url()).host));
  ctx.on("response", (r) => {
    if (r.status() >= 400) w.bad.push(`${r.status()} ${r.url()}`);
  });
  return w;
}

function watchPage(page: import("playwright").Page, w: Watchers): void {
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => w.errors.push(`pageerror: ${e.message}`));
}

/** Abre el juego en un contexto nuevo y llega hasta el tablero. */
async function playToBoard(ctx: BrowserContext) {
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".board", { timeout: 8000 });
  return page;
}

async function langOf(browser: Browser, locale: string, seedLang?: string): Promise<string> {
  const ctx = await browser.newContext({ locale, viewport: { width: 1280, height: 800 } });
  if (seedLang) {
    await ctx.addInitScript((v: string) => {
      window.localStorage.setItem("solnap.lang", v);
    }, seedLang);
  }
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".instructions__title", { timeout: 8000 });
  const title = (await page.textContent(".instructions__title")) ?? "";
  await ctx.close();
  return title;
}

async function main(): Promise<void> {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  console.log(`Sirviendo dist-portal en ${URL} (con /api → 404)\n`);

  try {
    // ── Recorrido principal, contexto limpio ────────────────────────────────
    const ctx = await browser.newContext({
      locale: "es-ES",
      viewport: { width: 1280, height: 800 }
    });
    const w = watch(ctx);
    const page = await playToBoard(ctx);
    watchPage(page, w);

    ok("T4.5 el juego carga servido desde subcarpeta (/juegos/napoleon/)");

    // T3.1 · primera visita: reglas
    if (await page.$(".instructions")) ok("T3.1 primera visita: se ven las reglas");
    else fail("T3.1 primera visita: NO aparecen las reglas");

    // T2.2 · español
    const title = (await page.textContent(".instructions__title")) ?? "";
    if (title.includes("Reglas")) ok(`T2.2 es-ES → español ("${title}")`);
    else fail(`T2.2 es-ES no está en español: "${title}"`);

    await page.click(".instructions__cta");
    await page.waitForSelector(".suit-select", { timeout: 5000 });
    (await page.$$(".suit-select__option"))[1].click();
    await page.waitForTimeout(1600); // deja terminar la animación de reparto

    // Unas cuantas jugadas: repartir y deshacer.
    for (let i = 0; i < 3; i++) {
      await page.click('[data-pile-id="monton"]');
      await page.waitForTimeout(80);
    }
    await page.click('button[aria-label="Deshacer"]');
    await page.waitForTimeout(120);

    // T1.2 · el ranking sin servidor no enseña errores técnicos
    await page.click('button[aria-label="LIGA DE CAMPEONES"]');
    await page.waitForSelector(".lb-viewer", { timeout: 5000 });
    await page.waitForTimeout(300);
    const lbText = (await page.textContent(".lb-viewer")) ?? "";
    const leaks = ["No se ha podido conectar", "Could not connect", "HTTP 404", "Failed to fetch"];
    const leaked = leaks.filter((s) => lbText.includes(s));
    if (leaked.length === 0) ok("T1.2 el ranking no muestra ningún mensaje de error técnico");
    else fail(`T1.2 el ranking filtra errores al jugador: ${JSON.stringify(leaked)}`);
    await page.click(".lb-viewer button.hud__btn--primary");
    await page.waitForTimeout(150);

    // T5.7 · la política de privacidad se abre DESDE EL MENÚ PRINCIPAL,
    // sin tener que entrar en las reglas (exigencia RGPD y además es nuestro
    // argumento de venta: esconderla sería contraproducente).
    await page.click('button[aria-label="Política de privacidad"]');
    const policy = await page.waitForSelector(".privacy__panel", { timeout: 5000 }).catch(() => null);
    if (policy) {
      const texto = (await page.textContent(".privacy__body")) ?? "";
      if (texto.includes("no recopila") && texto.includes("portal")) {
        ok("T5.7 la política se abre desde el juego y avisa sobre los portales");
      } else {
        fail(`T5.7 el texto de la política no es el esperado (${texto.length} caracteres)`);
      }
    } else {
      fail("T5.7 el botón de privacidad no abre la política");
    }
    await page.click(".privacy__footer button");
    await page.waitForTimeout(120);

    // T5.8 · el candado del HUD lleva texto. Un icono suelto no dice para qué
    // sirve, y si la política pasa desapercibida deja de cumplir su función
    // (ni el RGPD ni el argumento de venta).
    const etiqueta = (
      await page.textContent('button[aria-label="Política de privacidad"] .hud__btn-text')
    )?.trim();
    if (etiqueta && etiqueta.length > 0) {
      ok(`T5.8 el botón de privacidad del HUD se lee: "🔒 ${etiqueta}"`);
    } else {
      fail("T5.8 el botón de privacidad del HUD no muestra texto, sólo el candado");
    }

    // T3.8 · Escape cierra la política y NADA MÁS. Se abre encima de las
    // reglas, así que si Escape cerrase la de debajo la política quedaría
    // colgada en pantalla y sólo se podría salir con su botón.
    await page.click('button[aria-label="Reglas"]');
    await page.waitForSelector(".instructions", { timeout: 5000 });
    await page.click(".instructions__privacy-link");
    await page.waitForSelector(".privacy__panel", { timeout: 5000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const politicaCerrada = !(await page.$(".privacy__panel"));
    const reglasSiguen = !!(await page.$(".instructions"));
    if (politicaCerrada && reglasSiguen) {
      ok("T3.8 Escape cierra la política y deja las reglas abiertas debajo");
    } else {
      fail(
        `T3.8 Escape no se comporta: política cerrada=${politicaCerrada}, reglas siguen=${reglasSiguen}`
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    if (!(await page.$(".instructions"))) {
      ok("T3.8 el segundo Escape cierra ya las reglas");
    } else {
      fail("T3.8 el segundo Escape no cierra las reglas");
    }

    // T3.6 · consultar las reglas a mitad de partida NO reinicia nada
    const antes = await page.textContent('[data-pile-id="monton"] .pile__count');
    await page.click('button[aria-label="Reglas"]');
    await page.waitForSelector(".instructions", { timeout: 5000 });
    await page.click(".instructions__cta");
    await page.waitForTimeout(300);
    const despues = await page.textContent('[data-pile-id="monton"] .pile__count');
    const reanimado = await page.$(".board.board--dealing");
    if (antes === despues && !reanimado) {
      ok(`T3.6 abrir y cerrar las reglas no toca la partida (montón ${antes})`);
    } else {
      fail(`T3.6 la partida cambió al cerrar las reglas: montón ${antes} → ${despues}, reanimado=${!!reanimado}`);
    }

    // T3.9 · promoción por toque, y SÓLO por toque.
    //
    // Buscamos un As o un Rey destapado: con las fundaciones vacías, el As sólo
    // encaja en X y el Rey sólo en I/II/III/IV, así que el destino es único y el
    // resultado es comprobable sin depender de la semilla. Repartimos hasta dar
    // con uno (hay 8 de cada en la baraja doble).
    const buscarPromovible = () =>
      page.evaluate(
        // eslint-disable-next-line no-new-func
        new Function(`
        var ids = ["A1","B1","C1","D1","A","B","C","D","pile1","pile2","pile3","pile4"];
        for (var i = 0; i < ids.length; i++) {
          var el = document.querySelector('[data-pile-id="' + ids[i] + '"] .pile__card .card');
          if (!el) continue;
          var l = el.getAttribute('aria-label') || '';
          if ((l.charAt(0) === 'A' || l.charAt(0) === 'K') && l.charAt(1) === ' ') {
            return { id: ids[i], label: l };
          }
        }
        return null;
        `) as () => { id: string; label: string } | null
      ) as Promise<{ id: string; label: string } | null>;

    const fundacionesOcupadas = () =>
      page.evaluate(
        // eslint-disable-next-line no-new-func
        new Function(`
        var ids = ["I","II","III","IV","X"], n = 0;
        for (var i = 0; i < ids.length; i++) {
          if (document.querySelector('[data-pile-id="' + ids[i] + '"] .pile__card .card')) n++;
        }
        return n;
        `) as () => number
      ) as Promise<number>;

    let candidato = await buscarPromovible();
    for (let i = 0; i < 12 && !candidato; i++) {
      await page.click('[data-pile-id="monton"]');
      await page.waitForTimeout(60);
      candidato = await buscarPromovible();
    }

    if (!candidato) {
      fail("T3.9 no apareció ningún As ni Rey destapado tras 12 repartos");
    } else {
      const selector = `[data-pile-id="${candidato.id}"] .pile__card .card`;
      const ocupadasAntes = await fundacionesOcupadas();

      // Primero un ARRASTRE FALLIDO: la carta sale de su sitio y se suelta sobre
      // el HUD, que no es destino de nada. No debe promover. Es la regresión que
      // justifica medir la distancia en vez de escuchar `click`: el navegador
      // dispara `click` sobre la carta de origen también al final de un arrastre.
      const caja = await (await page.$(selector))!.boundingBox();
      if (caja) {
        await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
        await page.mouse.down();
        await page.mouse.move(caja.x + caja.width / 2, caja.y - 60, { steps: 5 });
        await page.mouse.move(20, 6, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(150);
      }
      const trasArrastre = await fundacionesOcupadas();
      if (trasArrastre === ocupadasAntes) {
        ok("T3.9 un arrastre que no llega a destino NO promueve la carta");
      } else {
        fail(
          `T3.9 el arrastre fallido promovió igualmente: fundaciones ${ocupadasAntes} → ${trasArrastre}`
        );
      }

      // Y ahora el toque limpio, que sí debe subirla.
      await page.click(selector);
      await page.waitForTimeout(200);
      const trasToque = await fundacionesOcupadas();
      if (trasToque === ocupadasAntes + 1) {
        ok(`T3.9 tocar "${candidato.label}" en ${candidato.id} la sube a una fundación`);
      } else {
        fail(
          `T3.9 tocar "${candidato.label}" en ${candidato.id} no promovió: fundaciones ${ocupadasAntes} → ${trasToque}`
        );
      }
    }

    // T5.2 · cookies
    const cookies = await ctx.cookies();
    if (cookies.length === 0) ok("T5.2 cero cookies");
    else fail(`T5.2 hay ${cookies.length} cookie(s): ${cookies.map((c) => c.name).join(", ")}`);

    // T5.3 · almacenamiento sólo funcional
    const keys = (await page.evaluate(() => Object.keys(window.localStorage))) as string[];
    const intrusas = keys.filter((k) => !k.startsWith("solnap."));
    if (intrusas.length === 0) ok(`T5.3 localStorage sólo con claves propias: ${keys.join(", ")}`);
    else fail(`T5.3 claves ajenas en localStorage: ${JSON.stringify(intrusas)}`);

    // T3.2, T3.4 y T3.7 · segunda visita
    const montonAntesDeRecargar = await page.textContent('[data-pile-id="monton"] .pile__count');
    const t0 = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".board", { timeout: 8000 });
    const ready = Date.now() - t0;

    const montonTrasRecargar = await page.textContent('[data-pile-id="monton"] .pile__count');
    if (montonAntesDeRecargar === montonTrasRecargar) {
      ok(`T3.7 la partida sobrevive a recargar (montón ${montonTrasRecargar})`);
    } else {
      fail(`T3.7 recargar perdió la partida: montón ${montonAntesDeRecargar} → ${montonTrasRecargar}`);
    }
    if (!(await page.$(".instructions"))) ok("T3.2 segunda visita: las reglas NO reaparecen");
    else fail("T3.2 segunda visita: las reglas vuelven a salir");
    if (!(await page.$(".suit-select"))) ok("T3.2 segunda visita: tampoco pide elegir palos");
    else fail("T3.2 segunda visita: vuelve a pedir elegir palos");
    if (ready < 2000) ok(`T3.4 tablero listo en ${ready} ms (< 2000)`);
    else fail(`T3.4 tablero listo en ${ready} ms (demasiado)`);

    // T4.1 / T5.1 / T1.3 · red y consola limpias
    if (w.bad.length === 0) ok("T4.1 ninguna respuesta 4xx/5xx");
    else fail(`T4.1 respuestas con error: ${JSON.stringify(w.bad)}`);

    const terceros = [...w.hosts].filter((h) => !h.startsWith("127.0.0.1"));
    if (terceros.length === 0) ok(`T5.1 cero peticiones a terceros (sólo ${[...w.hosts].join(", ")})`);
    else fail(`T5.1 peticiones a dominios ajenos: ${JSON.stringify(terceros)}`);

    if (w.errors.length === 0) ok("T1.3 sin errores de consola ni promesas rechazadas");
    else fail(`T1.3 errores detectados: ${JSON.stringify(w.errors)}`);

    await ctx.close();

    // ── T2.1 · idiomas no españoles → inglés ────────────────────────────────
    for (const locale of ["ja-JP", "de-DE", "pt-BR", "zh-TW", "ko-KR"]) {
      const t = await langOf(browser, locale);
      if (t.includes("Rules")) ok(`T2.1 ${locale} → inglés`);
      else fail(`T2.1 ${locale} no cayó en inglés: "${t}"`);
    }
    const arTitle = await langOf(browser, "es-AR");
    if (arTitle.includes("Reglas")) ok("T2.2 es-AR → español");
    else fail(`T2.2 es-AR no está en español: "${arTitle}"`);

    // ── T2.5 · francés ───────────────────────────────────────────
    for (const locale of ["fr-FR", "fr-CA", "fr-SN"]) {
      const t = await langOf(browser, locale);
      if (t.includes("Règles")) ok(`T2.5 ${locale} → francés`);
      else fail(`T2.5 ${locale} no cayó en francés: "${t}"`);
    }

    // ── T2.3 · la preferencia guardada manda ────────────────────────────────
    const forced = await langOf(browser, "ja-JP", "es");
    if (forced.includes("Reglas")) ok("T2.3 preferencia guardada (es) gana al navegador japonés");
    else fail(`T2.3 no se respetó la preferencia guardada: "${forced}"`);

    // ── T2.4 · sin localStorage ─────────────────────────────────────────────
    const blindCtx = await browser.newContext({ locale: "ja-JP" });
    const bw = watch(blindCtx);
    await blindCtx.addInitScript(() => {
      // Simula el modo privado más restrictivo: acceder lanza.
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("storage blocked");
        }
      });
    });
    const blindPage = await blindCtx.newPage();
    watchPage(blindPage, bw);
    await blindPage.goto(URL, { waitUntil: "domcontentloaded" });
    const boardOk = await blindPage.$(".board");
    if (boardOk) ok("T2.4 sin localStorage el juego arranca igual");
    else fail("T2.4 sin localStorage el juego no llega al tablero");
    if (bw.errors.length === 0) ok("T2.4 sin localStorage tampoco hay errores de consola");
    else fail(`T2.4 errores sin localStorage: ${JSON.stringify(bw.errors)}`);
    await blindCtx.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failed === 0) {
    console.log("\nOK — el build de portal pasa todos los chequeos");
    process.exit(0);
  }
  console.log(`\nFAIL — ${failed} chequeo(s) del build de portal fallaron`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
