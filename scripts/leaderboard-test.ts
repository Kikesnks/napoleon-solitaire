// Test del mecanismo de ranking (src/core/leaderboard) sin navegador.
//
// Cubre las dos garantías de la fachada:
//  - T1.1 Con el backend caído, ninguna operación lanza.
//  - T1.4 El respaldo local guarda, ordena y persiste entre "sesiones".
//
// No necesita servidor: el "remoto" apunta a un puerto muerto.

import { createLeaderboard } from "../src/core/leaderboard/index.js";
import type { EntryBase, PayloadBase } from "../src/core/leaderboard/types.js";
import { boardId, parseBoardId } from "../src/game/leaderboard-types.js";

interface Entry extends EntryBase {
  suitMode: 2 | 4;
}
interface Payload extends PayloadBase {
  suitMode: 2 | 4;
}

let failed = 0;
const ok = (msg: string) => console.log(`  ok  ${msg}`);
const fail = (msg: string) => {
  console.log(`  FAIL ${msg}`);
  failed++;
};

/** localStorage de mentira: el mismo que usaría el navegador, en memoria. */
function installFakeStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  };
  return store;
}

function makeBoard(remoteBaseUrl: string | null) {
  return createLeaderboard<Entry, Payload>({
    remoteBaseUrl,
    max: 3,
    local: {
      storageKey: "test.lb",
      max: 3,
      toEntry: (p) => ({
        name: p.name,
        score: p.score,
        suitMode: p.suitMode,
        date: "2026-08-13",
        ts: Date.now()
      })
    }
  });
}

const payload = (name: string, score: number): Payload => ({
  name,
  category: "won",
  score,
  suitMode: 4
});

async function main(): Promise<void> {
  const store = installFakeStorage();

  // ── T1.1 · Backend caído: nada lanza ──────────────────────────────────────
  // Puerto 9 (discard): la conexión falla siempre y rápido.
  const broken = makeBoard("http://127.0.0.1:9/api/leaderboard");

  try {
    const entries = await broken.list("won");
    ok(`T1.1 list() con backend caído devuelve ${entries.length} entradas sin lanzar`);
  } catch (e) {
    fail(`T1.1 list() lanzó: ${String(e)}`);
  }

  try {
    const q = await broken.qualifies("won", 500);
    if (typeof q === "boolean") ok(`T1.1 qualifies() devuelve ${q} sin lanzar`);
    else fail(`T1.1 qualifies() devolvió ${String(q)}`);
  } catch (e) {
    fail(`T1.1 qualifies() lanzó: ${String(e)}`);
  }

  try {
    const entries = await broken.submit(payload("Kike", 300));
    if (entries.length === 1 && entries[0].name === "Kike") {
      ok("T1.1 submit() con backend caído guarda en local y devuelve el top");
    } else {
      fail(`T1.1 submit() devolvió ${JSON.stringify(entries)}`);
    }
  } catch (e) {
    fail(`T1.1 submit() lanzó: ${String(e)}`);
  }

  if (broken.getScope() === "local") {
    ok("T1.1 el ámbito pasa a 'local' tras fallar el remoto");
  } else {
    fail(`T1.1 ámbito=${broken.getScope()} (esperaba 'local')`);
  }

  // ── T1.4 · Respaldo local: orden, tope y persistencia ─────────────────────
  const local = makeBoard(null);
  await local.submit(payload("Ana", 100));
  await local.submit(payload("Luis", 900));
  await local.submit(payload("Eva", 500));
  const top = await local.submit(payload("Zoe", 50)); // 5ª entrada, max = 3

  // Puntuaciones en juego: Kike 300, Ana 100, Luis 900, Eva 500, Zoe 50.
  // Con max=3 el top debe quedar en Luis > Eva > Kike.
  const names = top.map((e) => e.name);
  if (names.join(",") === "Luis,Eva,Kike") {
    ok(`T1.4 ordena por puntuación y recorta al tope: ${names.join(" > ")}`);
  } else {
    fail(`T1.4 top inesperado: ${JSON.stringify(names)}`);
  }

  // Simula recargar la página: instancia nueva, mismo almacenamiento.
  const reopened = makeBoard(null);
  const persisted = await reopened.list("won");
  if (persisted.length === 3 && persisted[0].name === "Luis") {
    ok("T1.4 las entradas sobreviven a recargar (persistencia en localStorage)");
  } else {
    fail(`T1.4 tras "recargar" hay ${JSON.stringify(persisted.map((e) => e.name))}`);
  }

  if (store.size === 1 && [...store.keys()][0] === "test.lb.won") {
    ok(`T1.4 usa una sola clave por categoría ("${[...store.keys()][0]}")`);
  } else {
    fail(`T1.4 claves inesperadas: ${JSON.stringify([...store.keys()])}`);
  }

  // ── B8 · Cuatro tablas: ganadas/perdidas × 2/4 palos ──────────────────────
  // Con 2 palos se puntúa bastante más alto, así que mezclarlas premiaba la
  // dificultad baja. La separación tiene que llegar hasta el almacenamiento:
  // filtrar un top ya recortado dejaría vacía la tabla de 4 palos en cuanto
  // los primeros puestos se llenaran de partidas de 2.
  const conDificultad = makeBoard(null);
  const enTabla = (cat: "won" | "lost", suits: 2 | 4, name: string, score: number): Payload => ({
    name,
    category: boardId(cat, suits),
    score,
    suitMode: suits
  });

  // Tres partidas de 2 palos con puntuaciones altísimas: llenan su tabla entera
  // (max = 3). Si las tablas estuvieran mezcladas, se comerían el top y la de
  // 4 palos quedaría vacía.
  await conDificultad.submit(enTabla("won", 2, "Dos-A", 9000));
  await conDificultad.submit(enTabla("won", 2, "Dos-B", 8000));
  await conDificultad.submit(enTabla("won", 2, "Dos-C", 7000));
  await conDificultad.submit(enTabla("won", 4, "Cuatro-A", 100));

  const tablaCuatro = await conDificultad.list(boardId("won", 4));
  if (tablaCuatro.length === 1 && tablaCuatro[0].name === "Cuatro-A") {
    ok("B8.1 una partida de 4 palos aparece en su tabla aunque 2 palos puntúe más");
  } else {
    fail(`B8.1 la tabla de 4 palos tiene ${JSON.stringify(tablaCuatro.map((e) => e.name))}`);
  }

  const tablaDos = await conDificultad.list(boardId("won", 2));
  if (tablaDos.length === 3 && !tablaDos.some((e) => e.name === "Cuatro-A")) {
    ok("B8.2 la tabla de 2 palos no se mezcla con la de 4");
  } else {
    fail(`B8.2 la tabla de 2 palos tiene ${JSON.stringify(tablaDos.map((e) => e.name))}`);
  }

  // Clasificar también se decide dentro de la tabla: 150 puntos no entran entre
  // 9000/8000/7000, pero sí en la de 4 palos, donde el tope es 100.
  const clasificaEn4 = await conDificultad.qualifies(boardId("won", 4), 150);
  const clasificaEn2 = await conDificultad.qualifies(boardId("won", 2), 150);
  if (clasificaEn4 && !clasificaEn2) {
    ok("B8.3 clasificar se mide contra la tabla propia, no contra la mezcla");
  } else {
    fail(`B8.3 clasifica en 4 palos=${clasificaEn4}, en 2 palos=${clasificaEn2}`);
  }

  const perdidas = await conDificultad.list(boardId("lost", 4));
  if (perdidas.length === 0) {
    ok("B8.4 ganadas y perdidas siguen sin mezclarse");
  } else {
    fail(`B8.4 la tabla de perdidas tiene ${perdidas.length} entradas`);
  }

  // ── B8 · El identificador de tabla rechaza lo que no es ───────────────────
  const validos: Array<[string, boolean]> = [
    ["won-2", true],
    ["won-4", true],
    ["lost-2", true],
    ["lost-4", true],
    ["won", false],
    ["lost", false],
    ["won-3", false],
    ["WON-2", false],
    ["won-2 ", false],
    ["drawn-2", false],
    ["", false]
  ];
  const malos = validos.filter(([raw, esperado]) => (parseBoardId(raw) !== null) !== esperado);
  if (malos.length === 0) {
    ok(`B8.5 parseBoardId acepta las cuatro tablas y rechaza el resto (${validos.length} casos)`);
  } else {
    fail(`B8.5 parseBoardId falla con ${JSON.stringify(malos.map(([r]) => r))}`);
  }
  if (parseBoardId(null) === null && parseBoardId(42) === null && parseBoardId({}) === null) {
    ok("B8.6 parseBoardId no se rompe con lo que no es texto");
  } else {
    fail("B8.6 parseBoardId acepta algo que no es texto");
  }

  // ── B8 · El ranking local que ya existía no se pierde ─────────────────────
  // Al partir las tablas cambian las claves de almacenamiento. Sin migración,
  // quien ya tuviera puntuaciones las vería desaparecer — y en un portal el
  // ranking local es el ÚNICO que hay.
  const viejas = [
    { name: "Viejo2", score: 500, suitMode: 2, date: "2026-08-01", ts: 1 },
    { name: "Viejo4", score: 400, suitMode: 4, date: "2026-08-02", ts: 2 },
    { name: "Otro4", score: 300, suitMode: 4, date: "2026-08-03", ts: 3 }
  ];
  store.set("solnap.lb.won", JSON.stringify(viejas));
  store.set("solnap.lb.lost", JSON.stringify([viejas[0]]));

  const juego = await import("../src/game/leaderboard.js");
  juego.configureLeaderboard({ remoteBaseUrl: null }); // fuerza a reconstruir

  const migrado2 = await juego.fetchLeaderboard("won", 2);
  const migrado4 = await juego.fetchLeaderboard("won", 4);
  if (migrado2.length === 1 && migrado2[0].name === "Viejo2") {
    ok("B8.7 las puntuaciones guardadas de 2 palos sobreviven al reparto");
  } else {
    fail(`B8.7 tabla de 2 palos migrada: ${JSON.stringify(migrado2.map((e) => e.name))}`);
  }
  if (migrado4.length === 2 && migrado4[0].name === "Viejo4" && migrado4[1].name === "Otro4") {
    ok("B8.8 las de 4 palos también, y en orden");
  } else {
    fail(`B8.8 tabla de 4 palos migrada: ${JSON.stringify(migrado4.map((e) => e.name))}`);
  }
  if ((await juego.fetchLeaderboard("lost", 2)).length === 1) {
    ok("B8.9 la migración cubre también las partidas perdidas");
  } else {
    fail("B8.9 las partidas perdidas no se migraron");
  }

  // Repetir la migración no puede duplicar nada.
  juego.configureLeaderboard({ remoteBaseUrl: null });
  const otraVez = await juego.fetchLeaderboard("won", 4);
  if (otraVez.length === 2) {
    ok("B8.10 la migración se hace una sola vez, no duplica");
  } else {
    fail(`B8.10 tras repetir, la tabla tiene ${otraVez.length} entradas`);
  }

  // ── Sin almacenamiento en absoluto (modo privado) ─────────────────────────
  delete (globalThis as unknown as { window?: unknown }).window;
  const noStorage = makeBoard(null);
  try {
    const entries = await noStorage.submit(payload("Sin", 10));
    ok(`T1.1 sin localStorage tampoco lanza (devuelve ${entries.length})`);
  } catch (e) {
    fail(`T1.1 sin localStorage lanzó: ${String(e)}`);
  }

  if (failed === 0) {
    console.log("\nOK — ranking a prueba de fallos");
    process.exit(0);
  }
  console.log(`\nFAIL — ${failed} chequeo(s) del ranking fallaron`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
