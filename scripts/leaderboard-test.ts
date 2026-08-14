// Test del mecanismo de ranking (src/core/leaderboard) sin navegador.
//
// Cubre las dos garantías de la fachada:
//  - T1.1 Con el backend caído, ninguna operación lanza.
//  - T1.4 El respaldo local guarda, ordena y persiste entre "sesiones".
//
// No necesita servidor: el "remoto" apunta a un puerto muerto.

import { createLeaderboard } from "../src/core/leaderboard/index.js";
import type { EntryBase, PayloadBase } from "../src/core/leaderboard/types.js";

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
