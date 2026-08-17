// Test funcional: arranca el preview de Vite, abre la app en chromium y
// reproduce el bug que reportó el usuario:
//  - Reparte 3 veces (clic en montón) → cartas boca arriba en pilas 1-4.
//  - Deshacer 3 veces.
//  - Verifica que la carta superior del montón está boca abajo.

import { chromium, type ElementHandle } from "playwright";
import { startPreview, stopPreview } from "./preview-server.ts";
// El mismo mecanismo del reto diario que usa la aplicación: así el test puede
// calcular la semilla que DEBERÍA haberse jugado, en vez de confiar en ella.
import { daily } from "../src/game/daily.ts";

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
    // También en el primer arranque: por decisión del propietario, TODOS los
    // diálogos dejan salir. Detrás hay una partida repartida y jugable —el
    // motor reparte antes de pintar nada—, y quien cancele juega con la
    // dificultad por defecto con "Nueva" a un clic.
    if (await page.$(".suit-select__cancel")) {
      ok("B6.13 el selector del primer arranque también deja salir");
    } else {
      fail("B6.13 el selector del primer arranque no tiene botón de salida");
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

    // ---------- 8. Reto diario (B3) ----------
    // El mecanismo se prueba aparte en `test:daily`. Lo que se comprueba aquí
    // es la conexión con la interfaz, que es lo que un test puro no ve: que el
    // botón arranca EXACTAMENTE la partida del día y que la racha se guarda.
    await page.click('button[aria-label="Nueva"]');
    await page.waitForSelector(".suit-select__daily", { timeout: 5000 });
    ok("el diálogo de nueva partida ofrece el reto diario");

    const promesas = (await page.textContent(".suit-select__daily")) ?? "";
    if (/soluci|solvable|solution/i.test(promesas)) {
      fail(`el reto promete solución: "${promesas.trim()}"`);
    } else {
      ok("B3.6 el reto no promete que tenga solución");
    }

    const botonesDaily = await page.$$(".suit-select__daily-btn");
    await botonesDaily[1].click(); // 4 palos
    await page.waitForTimeout(200);

    // La semilla que el juego ha guardado tiene que ser la del día, calculada
    // aquí con el mismo mecanismo que usa la aplicación.
    const guardado = await page.evaluate(() => ({
      partida: window.localStorage.getItem("solnap.game"),
      racha: window.localStorage.getItem("solnap.daily.streak")
    }));
    const esperada = daily.seedFor(daily.todayKey(), "4");
    const seedJugada = guardado.partida ? (JSON.parse(guardado.partida) as { seed: number }).seed : null;
    if (seedJugada === esperada) {
      ok(`la partida arrancada es el reto de hoy (semilla ${esperada})`);
    } else {
      fail(`el reto diario arrancó con la semilla ${seedJugada}, esperaba ${esperada}`);
    }

    const racha = guardado.racha ? (JSON.parse(guardado.racha) as { current: number; last: string }) : null;
    if (racha && racha.current === 1 && racha.last === daily.todayKey()) {
      ok("la racha se guarda al empezar el reto (1 día)");
    } else {
      fail(`racha mal guardada: ${guardado.racha}`);
    }

    await page.click('button[aria-label="Nueva"]');
    await page.waitForSelector(".suit-select__daily-streak", { timeout: 5000 });
    const textoRacha = (await page.textContent(".suit-select__daily-streak")) ?? "";
    if (textoRacha.includes("1") && /racha/i.test(textoRacha)) {
      ok(`la racha se muestra al jugador: "${textoRacha.trim()}"`);
    } else {
      fail(`la racha no se muestra: "${textoRacha.trim()}"`);
    }

    // ---------- 9. Calendario de retos del mes (B6) ----------
    // Lo que se comprueba aquí es justo lo que un test puro no ve: que la
    // interfaz ofrece exactamente los días que el motor considera jugables, y
    // que al elegir un día pasado se juega ESE reparto y no otro.
    const diasJugables = daily.playableKeys();
    const hoyClave = daily.todayKey();

    const celdas = await page.$$(".daily-cal__day");
    if (celdas.length === diasJugables.length) {
      ok(`B6.1 el calendario ofrece ${celdas.length} días (del 1 a hoy)`);
    } else {
      fail(`el calendario ofrece ${celdas.length} días y el motor dice ${diasJugables.length}`);
    }

    // La comprobación que de verdad importa: NINGÚN día futuro, mirando los
    // números pintados y no la cuenta. Una celda de más se vería aquí.
    const numeros = await page.$$eval(".daily-cal__day .daily-cal__num", (ns) =>
      ns.map((n) => Number(n.textContent))
    );
    const diaDeHoy = Number(hoyClave.slice(8, 10));
    const futuros = numeros.filter((n) => n > diaDeHoy || n < 1);
    if (futuros.length === 0 && numeros.length > 0) {
      ok(`B6.2 ningún día futuro en el calendario (máximo el ${diaDeHoy})`);
    } else {
      fail(`el calendario ofrece días imposibles: ${futuros.join(", ")}`);
    }

    // La colección va en su propia línea y SEPARADA POR DIFICULTAD. El total de
    // cada una son los días del mes —28, 29, 30 o 31—, nunca más: un contador
    // que enseñaba "32 retos" es imposible y se ve a la primera.
    const hoyDate = new Date();
    const diasDelMes = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + 1, 0).getDate();
    const textoColeccion = (await page.textContent(".suit-select__daily-collection")) ?? "";
    const cuentas = [...textoColeccion.matchAll(/(\d+)\s*\/\s*(\d+)/g)];

    if (cuentas.length === 2) {
      ok(`B6.3 la colección se muestra por dificultad: "${textoColeccion.replace(/\s+/g, " ").trim()}"`);
    } else {
      fail(`B6.3 esperaba 2 cuentas y hay ${cuentas.length}: "${textoColeccion.trim()}"`);
    }

    const totalesMal = cuentas.filter((c) => Number(c[2]) !== diasDelMes);
    if (cuentas.length > 0 && totalesMal.length === 0) {
      ok(`B6.6 cada total es el del mes (${diasDelMes} días)`);
    } else {
      fail(`B6.6 hay totales que no son ${diasDelMes}: ${totalesMal.map((c) => c[0]).join(", ")}`);
    }

    // La comprobación que habría cazado el "32": el número tiene un techo real.
    const imposibles = cuentas.filter(
      (c) => Number(c[2]) < 28 || Number(c[2]) > 31 || Number(c[1]) > Number(c[2])
    );
    if (imposibles.length === 0) {
      ok("B6.9 ninguna cuenta enseña un número imposible");
    } else {
      fail(`B6.9 cuentas imposibles: ${imposibles.map((c) => c[0]).join(", ")}`);
    }

    // Y que la racha no se haya llevado por delante la colección al separarlas.
    if (/racha|streak|série/i.test(textoRacha)) {
      ok("B6.10 la racha sigue en su propia línea");
    } else {
      fail(`B6.10 la racha ha desaparecido: "${textoRacha.trim()}"`);
    }

    // Un día pasado: se elige en el calendario y luego la dificultad. Si el mes
    // acaba de empezar y hoy es día 1, no hay pasado que probar.
    if (diasJugables.length > 1) {
      const fechaPasada = diasJugables[0];
      await celdas[0].click();
      await page.waitForTimeout(100);
      const botonesDia = await page.$$(".suit-select__daily-btn");
      await botonesDia[0].click(); // 2 palos
      await page.waitForTimeout(200);

      const trasPasado = await page.evaluate(() => ({
        partida: window.localStorage.getItem("solnap.game"),
        racha: window.localStorage.getItem("solnap.daily.streak")
      }));
      const esperadaPasada = daily.seedFor(fechaPasada, "2");
      const seedPasada = trasPasado.partida
        ? (JSON.parse(trasPasado.partida) as { seed: number }).seed
        : null;
      if (seedPasada === esperadaPasada) {
        ok(`B6.4 el reto del ${fechaPasada} arranca con su propio reparto`);
      } else {
        fail(`el reto pasado arrancó con la semilla ${seedPasada}, esperaba ${esperadaPasada}`);
      }

      // El punto fino del "método Duolingo": jugar un reto atrasado cuenta como
      // haber venido HOY. Si la racha se marcara en la fecha del reto, quien se
      // hiciera el mes entero de una sentada se fabricaría una racha de 30 días.
      const rachaPasada = trasPasado.racha
        ? (JSON.parse(trasPasado.racha) as { current: number; last: string })
        : null;
      if (rachaPasada && rachaPasada.last === hoyClave && rachaPasada.current === 1) {
        ok("B6.5 jugar un reto atrasado marca la racha en HOY, y sigue siendo de 1 día");
      } else {
        fail(`la racha se marcó mal tras un reto atrasado: ${trasPasado.racha}`);
      }
    } else {
      ok("B6.4-B6.5 sin días pasados que probar (hoy es día 1 del mes)");
    }

    // ---------- 10. Todos los botones responden al puntero y al teclado ----------
    // Este fallo se ha reportado DOS veces —primero en los botones del reto,
    // después en el de Cancelar— porque el amarillo se fue añadiendo elemento a
    // elemento y el botón base se quedó sin él. Ahora la regla vive en
    // `.hud__btn` y esto lo vigila: se recorren TODOS los botones del diálogo,
    // no uno de muestra, que es como se coló el segundo.
    const AMARILLO = "rgb(255, 209, 102)";
    await page.click('button[aria-label="Nueva"]');
    await page.waitForSelector(".suit-select__cancel", { timeout: 5000 });

    const botonesDialogo = await page.$$(
      ".suit-select__panel button:not(.daily-cal__day)"
    );
    const apagados: string[] = [];
    for (const boton of botonesDialogo) {
      await boton.hover();
      // El borde tarda 0,15 s en llegar al amarillo. Leyendo antes se recoge un
      // color intermedio y la prueba falla por su culpa, no por la del código.
      await page.waitForTimeout(300);
      const borde = await boton.evaluate((el) => getComputedStyle(el).borderTopColor);
      // El primario ya es amarillo entero: se le mira el relleno, no el borde.
      const relleno = await boton.evaluate((el) => getComputedStyle(el).backgroundColor);
      const encendido = borde === AMARILLO || relleno === AMARILLO || relleno === "rgb(255, 224, 154)";
      if (!encendido) {
        apagados.push(((await boton.textContent()) ?? "?").trim().slice(0, 20));
      }
    }
    if (apagados.length === 0) {
      ok(`B6.7 los ${botonesDialogo.length} botones del diálogo se encienden al pasar el puntero`);
    } else {
      fail(`B6.7 no se encienden al pasar el puntero: ${apagados.join(" · ")}`);
    }

    // `:focus-visible` solo se activa si el foco llegó por teclado, así que hay
    // que llegar tabulando de verdad: enfocar por programa no vale.
    await page.mouse.move(0, 0);
    await page.focus(".suit-select__cancel");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    const bordeFoco = await page.$eval(
      ".suit-select__cancel",
      (el) => getComputedStyle(el).borderTopColor
    );
    if (bordeFoco === AMARILLO) {
      ok("B6.8 y también al recibir el foco con el teclado");
    } else {
      fail(`B6.8 con el foco el borde es ${bordeFoco}, esperaba ${AMARILLO}`);
    }

    // ---------- 11. Del selector siempre se puede salir si hay algo detrás ----
    // Reportado en producción el 17/08/2026: tras "Jugar otra" el selector no
    // tenía Cancelar NI respondía a Escape. Con el calendario del reto dentro,
    // el jugador que solo quería mirar su avance se quedaba sin forma de volver
    // a su resultado. Botón y tecla venían de dos condiciones iguales escritas
    // por separado, y la del fin de partida se quedó fuera de las dos.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Que nadie clasifique: con el top local lleno, el diálogo del nombre no se
    // cruza en el camino y se llega limpio al cartel de fin de partida.
    await page.evaluate(() => {
      const tope = Array.from({ length: 10 }, (_, i) => ({
        name: "TOPE",
        score: 100000 - i,
        suitMode: 4,
        date: "2026-01-01",
        ts: 1 + i
      }));
      for (const tabla of ["won-2", "won-4", "lost-2", "lost-4"]) {
        window.localStorage.setItem(`solnap.lb.${tabla}`, JSON.stringify(tope));
      }
    });

    // Perder de la forma más corta que permiten las reglas: repartir sin mover
    // hasta agotar el montón en las cuatro rondas.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let repartos = 0;
    while (repartos < 300 && (await page.$(".overlay__panel--lose, .overlay__panel--win")) === null) {
      await page.keyboard.press("Space");
      repartos++;
      await page.waitForTimeout(5);
    }

    const finDePartida = await page.$(".overlay__panel--lose, .overlay__panel--win");
    if (finDePartida === null) {
      fail(`B6.11 la partida no terminó tras ${repartos} repartos sin mover`);
    } else {
      const seguirJugando = ".overlay__panel--lose .hud__btn--primary, .overlay__panel--win .hud__btn--primary";

      await page.click(seguirJugando);
      await page.waitForSelector(".suit-select", { timeout: 5000 });
      if (await page.$(".suit-select__cancel")) {
        ok(`B6.11 el selector del fin de partida tiene botón para volver (perdida en ${repartos} repartos)`);
      } else {
        fail("B6.11 el selector del fin de partida sigue sin botón para volver");
      }

      // Escape tiene que hacer exactamente lo mismo que el botón: si vuelven a
      // ser dos caminos distintos, uno de los dos volverá a quedarse atrás.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const cerradoConEsc = (await page.$(".suit-select")) === null;
      const resultadoIntacto =
        (await page.$(".overlay__panel--lose, .overlay__panel--win")) !== null;
      if (cerradoConEsc && resultadoIntacto) {
        ok("B6.12 Escape cierra el selector y devuelve el resultado de la partida");
      } else {
        fail(
          `B6.12 Escape: selector cerrado=${cerradoConEsc}, resultado detrás=${resultadoIntacto}`
        );
      }

      // Y el botón, lo mismo: cancelar no puede costar la puntuación.
      //
      // Si el paso anterior dejó el diálogo abierto no se sigue adelante: sin
      // salida, cualquier clic posterior choca contra el propio diálogo y la
      // prueba muere de timeout en vez de decir qué falla.
      const cancelar = cerradoConEsc
        ? await (async () => {
            await page.click(seguirJugando);
            return page
              .waitForSelector(".suit-select__cancel", { timeout: 3000 })
              .catch(() => null);
          })()
        : null;

      if (cancelar === null) {
        fail("B6.14 no hay botón de salida que probar en el selector del fin de partida");
      } else {
        const puntosAntes = await page.textContent(".overlay__stats dd");
        await cancelar.click();
        await page.waitForTimeout(250);
        const puntosDespues = await page.textContent(".overlay__stats dd");
        if ((await page.$(".suit-select")) === null && puntosAntes === puntosDespues) {
          ok(`B6.14 el botón devuelve el mismo resultado (${puntosDespues?.trim()} puntos)`);
        } else {
          fail(`B6.14 tras cancelar: puntos ${puntosAntes?.trim()} → ${puntosDespues?.trim()}`);
        }
      }
    }

    // ---------- 12. TODOS los diálogos: salida y resalte en TODOS sus botones --
    // Encargo del propietario tras el fallo del selector: botón de salir y
    // Escape en todos los cuadros de diálogo, y que todo control se encienda
    // con el puntero y con el foco de teclado.
    //
    // El resalte no se comprueba contra un color fijo. Hay dos paletas —el
    // amarillo de acento sobre los paneles oscuros y el verde de la marca sobre
    // el papel claro de las reglas y el ranking, donde el amarillo no se ve— y
    // fijar un color obligaría a mantener la lista a mano. Lo que se exige es
    // la regla de verdad: **algo tiene que cambiar**, y el foco no puede
    // resolverse con el contorno por defecto del navegador (`outline: auto`),
    // que es exactamente lo que el propietario vio como "blanco negrita".
    interface Aspecto {
      borde: string;
      fondo: string;
      texto: string;
      contorno: string;
    }
    const aspectoDe = (el: ElementHandle<SVGElement | HTMLElement>) =>
      el.evaluate((n): Aspecto => {
        const s = getComputedStyle(n);
        return {
          borde: s.borderTopColor,
          fondo: s.backgroundColor,
          texto: s.color,
          contorno: `${s.outlineStyle} ${s.outlineColor} ${s.outlineWidth}`
        };
      });
    const cambia = (a: Aspecto, b: Aspecto) =>
      a.borde !== b.borde || a.fondo !== b.fondo || a.texto !== b.texto;

    /**
     * Recorre todos los botones de un diálogo. `:focus-visible` solo se activa
     * si el foco llegó por teclado, así que hay que tabular de verdad: enfocar
     * por programa no vale (el navegador lo trata como foco de ratón).
     */
    async function recorrerBotones(raiz: string, nombre: string): Promise<void> {
      // La raíz puede ser una lista ("ganada o perdida"): hay que repartir el
      // sufijo por cada alternativa. Concatenado a pelo, `a, b button` busca
      // el propio `a` —que no es un botón— y la prueba mide el panel entero.
      const selector = raiz
        .split(",")
        .map((s) => `${s.trim()} button:not(:disabled)`)
        .join(", ");
      const botones = await page.$$(selector);
      if (botones.length === 0) {
        fail(`B9 "${nombre}": no se encontró ningún botón que probar`);
        return;
      }
      const sinPuntero: string[] = [];
      const sinFoco: string[] = [];
      for (const boton of botones) {
        const etiqueta = ((await boton.textContent()) ?? "?").replace(/\s+/g, " ").trim().slice(0, 18);

        const reposo = await aspectoDe(boton);
        await boton.hover();
        // El cambio tarda 0,15 s. Leyendo antes se recoge un color intermedio y
        // la prueba falla por su culpa, no por la del código.
        await page.waitForTimeout(300);
        const conPuntero = await aspectoDe(boton);
        if (!cambia(reposo, conPuntero)) {
          sinPuntero.push(`${etiqueta} [borde ${reposo.borde}, fondo ${reposo.fondo}]`);
        }

        await page.mouse.move(0, 0);
        await page.waitForTimeout(250);
        await boton.evaluate((el) => (el as HTMLElement).focus());
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        const loTiene = await boton.evaluate((el) => document.activeElement === el);
        if (!loTiene) {
          // Es el primero de la página: al retroceder se sale del documento.
          await boton.evaluate((el) => (el as HTMLElement).focus());
          await page.keyboard.press("Tab");
          await page.keyboard.press("Shift+Tab");
        }
        await page.waitForTimeout(300);
        const conFoco = await aspectoDe(boton);
        if (!cambia(reposo, conFoco) || conFoco.contorno.startsWith("auto")) {
          sinFoco.push(`${etiqueta}${conFoco.contorno.startsWith("auto") ? " (contorno del navegador)" : ""}`);
        }
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      }

      if (sinPuntero.length === 0) {
        ok(`B9 "${nombre}": los ${botones.length} botones se encienden con el puntero`);
      } else {
        fail(`B9 "${nombre}": no se encienden con el puntero: ${sinPuntero.join(" · ")}`);
      }
      if (sinFoco.length === 0) {
        ok(`B9 "${nombre}": y también con el foco del teclado`);
      } else {
        fail(`B9 "${nombre}": no se encienden con el foco: ${sinFoco.join(" · ")}`);
      }
    }

    /** Comprueba que Escape cierra un diálogo abierto. */
    async function escapeCierra(raiz: string, nombre: string): Promise<boolean> {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const cerrado = (await page.$(raiz)) === null;
      if (cerrado) {
        ok(`B9 "${nombre}": Escape lo cierra`);
      } else {
        fail(`B9 "${nombre}": Escape no lo cierra`);
      }
      return cerrado;
    }

    // --- 12a. Fin de partida (visible ahora mismo tras el bloque 11) ---
    await recorrerBotones(".overlay__panel--lose, .overlay__panel--win", "fin de partida");
    if (await escapeCierra(".overlay__panel--lose, .overlay__panel--win", "fin de partida")) {
      // Cerrarlo enseña el tablero; el resultado ya está registrado y "Nueva"
      // sigue en el HUD, así que el jugador no se queda sin nada que hacer.
      if (await page.$('button[aria-label="Nueva"]')) {
        ok("B9 al apartar el cartel del fin de partida sigue habiendo 'Nueva' en el HUD");
      } else {
        fail("B9 apartar el cartel del fin de partida deja al jugador sin salida");
      }
    }

    // --- 12b. Selector de dificultad ---
    await page.click('button[aria-label="Nueva"]');
    await page.waitForSelector(".suit-select", { timeout: 5000 });
    await recorrerBotones(".suit-select__panel", "selector de dificultad");
    await escapeCierra(".suit-select", "selector de dificultad");

    // --- 12c. Instrucciones y política de privacidad ---
    await page.click('button[aria-label="Reglas"]');
    await page.waitForSelector(".instructions", { timeout: 5000 });
    await page.click(".instructions__privacy-link");
    await page.waitForSelector(".privacy", { timeout: 5000 });
    await recorrerBotones(".privacy__panel", "política de privacidad");
    await escapeCierra(".privacy", "política de privacidad");
    await recorrerBotones(".instructions__panel", "instrucciones");
    await escapeCierra(".instructions", "instrucciones");

    // --- 12d. Visor del ranking ---
    await page.click('button[aria-label="LIGA DE CAMPEONES"]');
    await page.waitForSelector(".lb-viewer", { timeout: 5000 });
    await page.waitForTimeout(400); // que termine de cargar la tabla
    await recorrerBotones(".lb-viewer__panel", "visor del ranking (ganadas)");
    // Y con la otra pestaña: la cabecera cambia de oscura a clara y con ella
    // toda la paleta, así que el botón activo de cada combinación necesita su
    // propia regla. Recorrer solo el estado inicial dejaba la mitad sin mirar.
    await page.click(".lb-viewer__tab:not(.is-active)");
    await page.waitForTimeout(300);
    await page.click(".lb-viewer__suit:not(.is-active)");
    await page.waitForTimeout(400);
    await recorrerBotones(".lb-viewer__panel", "visor del ranking (no ganadas)");
    await escapeCierra(".lb-viewer", "visor del ranking");

    // --- 12e. El cartel del nombre: participar es VOLUNTARIO ---
    // Con el ranking vacío, la siguiente partida clasifica y aparece el cartel.
    // Hasta hoy no tenía salida: ni botón, ni Escape, ni forma de seguir sin
    // dar un nombre. Contradecía la condición con la que se aprobó.
    await page.evaluate(() => {
      for (const tabla of ["won-2", "won-4", "lost-2", "lost-4"]) {
        window.localStorage.removeItem(`solnap.lb.${tabla}`);
      }
    });
    await page.click('button[aria-label="Nueva"]');
    await page.waitForSelector(".suit-select__option", { timeout: 5000 });
    await (await page.$$(".suit-select__option"))[1].click();
    await page.waitForTimeout(1600); // reparto animado

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let repartos2 = 0;
    while (repartos2 < 300 && (await page.$(".lb-entry")) === null) {
      await page.keyboard.press("Space");
      repartos2++;
      await page.waitForTimeout(5);
    }

    if ((await page.$(".lb-entry")) === null) {
      fail(`B9 el cartel del nombre no apareció tras ${repartos2} repartos con el ranking vacío`);
    } else {
      // Con el campo vacío, "Guardar" está deshabilitado y el recorrido lo
      // saltaría: se escribe antes para que los dos botones se miren de verdad.
      await page.fill(".lb-entry__input", "PRUEBA");
      await recorrerBotones(".lb-entry__panel", "nombre para el ranking");
      if (await escapeCierra(".lb-entry", "nombre para el ranking")) {
        const guardado = await page.evaluate(() =>
          window.localStorage.getItem("solnap.lb.lost-4")
        );
        if (guardado === null) {
          ok("B9 salir del cartel del nombre NO envía nada: participar es voluntario");
        } else {
          fail(`B9 salir del cartel del nombre guardó una puntuación: ${guardado}`);
        }
      }
    }

    // --- 12f. La tabla que aparece tras enviar ---
    // Se llega dando un nombre de verdad; sin servidor, el envío cae al ranking
    // local y la tabla se pinta igual.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let repartos3 = 0;
    while (repartos3 < 300 && (await page.$(".overlay__panel--lose, .overlay__panel--win")) === null) {
      await page.keyboard.press("Space");
      repartos3++;
      await page.waitForTimeout(5);
    }
    await page.click(".overlay__panel--lose .hud__btn--primary, .overlay__panel--win .hud__btn--primary");
    await page.waitForSelector(".suit-select__option", { timeout: 5000 });
    await (await page.$$(".suit-select__option"))[1].click();
    await page.waitForTimeout(1600);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let repartos4 = 0;
    while (repartos4 < 300 && (await page.$(".lb-entry")) === null) {
      await page.keyboard.press("Space");
      repartos4++;
      await page.waitForTimeout(5);
    }
    const hayCartel = await page.$(".lb-entry__input");
    if (hayCartel === null) {
      fail("B9 no se pudo llegar a la tabla del ranking: el cartel del nombre no salió");
    } else {
      await page.fill(".lb-entry__input", "PRUEBA");
      await page.click(".lb-entry__btn");
      const tabla = await page.waitForSelector(".lb-dialog", { timeout: 5000 }).catch(() => null);
      if (tabla === null) {
        fail("B9 tras guardar el nombre no apareció la tabla del ranking");
      } else {
        await recorrerBotones(".lb-dialog__panel", "tabla del ranking");
        await escapeCierra(".lb-dialog", "tabla del ranking");
      }
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
