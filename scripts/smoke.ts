// Smoke-test ejecutable con `node --experimental-strip-types`. No se incluye
// en el bundle. Verifica invariantes y reglas clave del motor.

import {
  applyMove,
  buildDecks,
  canPlace,
  chainMoveToFoundation,
  createInitialState,
  dealFromMonton,
  reduceAction,
  topOf,
  undo,
  type Card,
  type CoreState,
  type GameState,
  type PositionId
} from "../src/game/index.ts";

let failed = 0;
function check(label: string, cond: boolean): void {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failed++;
  }
}
function section(title: string): void {
  console.log(`\n--- ${title}`);
}

function totalCards(state: CoreState): number {
  let n = 0;
  for (const id of Object.keys(state.positions) as PositionId[]) {
    n += state.positions[id].length;
  }
  return n;
}

// ============================================================
section("setup inicial con seed determinista");
const game = createInitialState({ seed: 42 });
check("104 cartas en juego", totalCards(game) === 104);
check("4 pilas A/B/C/D con 9 cartas cada una", ["A", "B", "C", "D"].every((id) => game.positions[id as PositionId].length === 9));
check("free cells A1/B1/C1/D1 con 1 carta", ["A1", "B1", "C1", "D1"].every((id) => game.positions[id as PositionId].length === 1));
check("monton con 64 cartas", game.positions.monton.length === 64);
check("fundaciones vacías", ["I", "II", "III", "IV", "X"].every((id) => game.positions[id as PositionId].length === 0));
check("pilas de reparto vacías", ["pile1", "pile2", "pile3", "pile4"].every((id) => game.positions[id as PositionId].length === 0));

const stockTopFaceUp = (["A", "B", "C", "D"] as PositionId[]).every((id) => {
  const pile = game.positions[id];
  return pile[pile.length - 1].faceUp;
});
check("top de cada stock boca arriba", stockTopFaceUp);

const stockBottomsFaceDown = (["A", "B", "C", "D"] as PositionId[]).every((id) => {
  const pile = game.positions[id];
  return pile.slice(0, -1).every((c) => !c.faceUp);
});
check("resto de stocks boca abajo", stockBottomsFaceDown);

const freeCellsFaceUp = (["A1", "B1", "C1", "D1"] as PositionId[]).every((id) => game.positions[id][0].faceUp);
check("free cells boca arriba", freeCellsFaceUp);

// IDs únicos
const allIds = new Set<string>();
for (const id of Object.keys(game.positions) as PositionId[]) {
  for (const c of game.positions[id]) allIds.add(c.id);
}
check("104 ids únicos", allIds.size === 104);

// ============================================================
section("buildDecks: 2 mazos × 52 cartas");
const decks = buildDecks();
check("104 cartas", decks.length === 104);
check("52 distintas (suit, rank)", new Set(decks.map((c) => `${c.suit}-${c.rank}`)).size === 52);
check("8 reyes", decks.filter((c) => c.rank === 13).length === 8);
check("8 ases", decks.filter((c) => c.rank === 1).length === 8);

// ============================================================
section("canPlace: reglas de fundaciones");
const k = (suit: Card["suit"]): Card => ({ id: `${suit}-13`, suit, rank: 13, deck: 0, faceUp: true });
const q = (suit: Card["suit"]): Card => ({ id: `${suit}-12`, suit, rank: 12, deck: 0, faceUp: true });
const a = (suit: Card["suit"]): Card => ({ id: `${suit}-1`, suit, rank: 1, deck: 0, faceUp: true });
const two = (suit: Card["suit"]): Card => ({ id: `${suit}-2`, suit, rank: 2, deck: 0, faceUp: true });

check("K a I vacía OK", canPlace(k("hearts"), "I", null));
check("Q a I vacía NO", !canPlace(q("hearts"), "I", null));
check("Q de hearts sobre K de hearts en I OK", canPlace(q("hearts"), "I", k("hearts")));
check("Q de spades sobre K de hearts en I NO (palo distinto)", !canPlace(q("spades"), "I", k("hearts")));
check("A a X vacía OK", canPlace(a("hearts"), "X", null));
check("K a X vacía NO", !canPlace(k("hearts"), "X", null));
check("2 de hearts sobre A de hearts en X OK", canPlace(two("hearts"), "X", a("hearts")));
check("A a free cell vacía OK", canPlace(a("hearts"), "A1", null));
check("K sobre free cell vacía OK (cualquier rango)", canPlace(k("hearts"), "A1", null));
check("2 hearts sobre A hearts en A1 OK (asc, mismo palo)", canPlace(two("hearts"), "A1", a("hearts")));
check("2 spades sobre A hearts en A1 NO (palo distinto)", !canPlace(two("spades"), "A1", a("hearts")));
check("3 hearts sobre A hearts en A1 NO (rango salta)", !canPlace({ ...two("hearts"), rank: 3, id: "h-3-skip" } as Card, "A1", a("hearts")));
check("A hearts sobre 2 hearts en A1 NO (descendente no vale)", !canPlace(a("hearts"), "A1", two("hearts")));

// ============================================================
section("free cell ascendente: stack 5♥-6♥-7♥ y encadenado a fundación");
let stackState = createInitialState({ preshuffled: buildDecks() });
const fiveH = stackState.positions.A[0]; // alguna carta cualquiera, la sustituyo manual
const sH = { id: "h-5", suit: "hearts" as const, rank: 5 as const, deck: 0 as const, faceUp: true };
const sH6 = { id: "h-6", suit: "hearts" as const, rank: 6 as const, deck: 0 as const, faceUp: true };
const sH7 = { id: "h-7", suit: "hearts" as const, rank: 7 as const, deck: 0 as const, faceUp: true };
const sH8 = { id: "h-8", suit: "hearts" as const, rank: 8 as const, deck: 0 as const, faceUp: true };
void fiveH;
stackState = {
  ...stackState,
  positions: {
    ...stackState.positions,
    A1: [sH, sH6, sH7], // ascendente válido 5,6,7 hearts
    I: [sH8] // 8 hearts en fundación descendente, espera el 7
  }
};
check("A1 acepta 8♥ encima del 7♥ (ascendente válido)", canPlace({ ...sH8, id: "h-8b" }, "A1", sH7));
const stackResult = chainMoveToFoundation(stackState, "A1", "I");
check("A1→I encadena 7,6,5 (3 cartas)", stackResult.records.length === 3);
check("A1 queda vacía y se repuso desde A", stackResult.state.positions.A1.length === 1);
check("I tiene [8,7,6,5] hearts", stackResult.state.positions.I.length === 4 && stackResult.state.positions.I.map((c) => c.rank).join(",") === "8,7,6,5");

// ============================================================
section("applyMove: reposición de free cell tras vaciarse");
// Construyo un estado controlado: A1 con un K, A con 2 cartas (una face-down, una face-up).
const controlledDeck = buildDecks();
let custom = createInitialState({ preshuffled: controlledDeck });
// Sustituyo manualmente A1 por un K hearts y A por [random, K spades face-up arriba]
const kh = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 13 && c.deck === 0)!;
const ks = controlledDeck.find((c) => c.suit === "spades" && c.rank === 13 && c.deck === 0)!;
const filler = controlledDeck.find((c) => c.suit === "clubs" && c.rank === 7 && c.deck === 0)!;
custom = {
  ...custom,
  positions: {
    ...custom.positions,
    A1: [{ ...kh, faceUp: true }],
    A: [{ ...filler, faceUp: false }, { ...ks, faceUp: true }],
    I: [],
    II: [],
    III: [],
    IV: [],
    X: []
  }
};
const before = totalCards(custom);
const result = applyMove(custom, "A1", "I");
check("104 cartas tras mover A1→I", totalCards(result.state) === before);
check("I contiene el K hearts", result.state.positions.I.length === 1 && result.state.positions.I[0].rank === 13);
check("A1 repuesta con K spades boca arriba", result.state.positions.A1.length === 1 && result.state.positions.A1[0].rank === 13 && result.state.positions.A1[0].faceUp);
check("A bajada a 1 carta y boca arriba", result.state.positions.A.length === 1 && result.state.positions.A[0].faceUp);

// ============================================================
section("applyMove: A directo voltea la siguiente");
let directA = createInitialState({ preshuffled: controlledDeck });
const fakeQ = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 12 && c.deck === 0)!;
const fakeK = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 13 && c.deck === 1)!;
const buried = controlledDeck.find((c) => c.suit === "diamonds" && c.rank === 5 && c.deck === 0)!;
directA = {
  ...directA,
  positions: {
    ...directA.positions,
    A: [{ ...buried, faceUp: false }, { ...fakeQ, faceUp: true }],
    I: [{ ...fakeK, faceUp: true }],
    II: [],
    III: [],
    IV: [],
    X: []
  }
};
const directRes = applyMove(directA, "A", "I");
check("Q hearts (de A) cae sobre K hearts de I", directRes.state.positions.I.length === 2 && directRes.state.positions.I[1].rank === 12);
check("nueva top de A boca arriba tras mover A directo", directRes.state.positions.A.length === 1 && directRes.state.positions.A[0].faceUp);

// ============================================================
section("foundation se vacía al colocar As (descendente)");
let toClear = createInitialState({ preshuffled: controlledDeck });
const aH = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 1 && c.deck === 0)!;
const twoH = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 2 && c.deck === 0)!;
toClear = {
  ...toClear,
  positions: {
    ...toClear.positions,
    A1: [{ ...aH, faceUp: true }],
    I: [{ ...twoH, faceUp: true }]
  }
};
const cleared = applyMove(toClear, "A1", "I");
check("I queda vacía tras As", cleared.state.positions.I.length === 0);
check("record cleared = true", cleared.record.cleared === true);
check("score +10 (carta) +50 (clear) = +60", cleared.state.score === 60);

// ============================================================
section("X completa al colocar K (ascendente)");
let toClearX = createInitialState({ preshuffled: controlledDeck });
const qH = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 12 && c.deck === 1)!;
toClearX = {
  ...toClearX,
  positions: {
    ...toClearX.positions,
    A1: [{ ...kh, faceUp: true }],
    X: [{ ...qH, faceUp: true }]
  }
};
const clearedX = applyMove(toClearX, "A1", "X");
check("X queda vacía tras K en ascendente", clearedX.state.positions.X.length === 0);
check("clear flag", clearedX.record.cleared === true);

// ============================================================
section("dealFromMonton: ronda 1 reparte 4");
const dealt = dealFromMonton(game);
check("monton baja en 4", dealt.positions.monton.length === game.positions.monton.length - 4);
check("4 cartas en pile1-4 boca arriba", (["pile1", "pile2", "pile3", "pile4"] as PositionId[]).every((id) => dealt.positions[id].length === 1 && dealt.positions[id][0].faceUp));

// ============================================================
section("advanceRound: tras agotar montón ronda 1 → ronda 2");
let g: GameState = game;
let safety = 0;
while (g.positions.monton.length > 0 && safety++ < 30) {
  const after = reduceAction(g, { type: "deal" });
  if (after === g) break;
  g = after;
}
check("montón vacío tras múltiples deals", g.positions.monton.length === 0);
check("16 cartas distribuidas en pile1-4", (["pile1", "pile2", "pile3", "pile4"] as PositionId[]).reduce((sum, id) => sum + g.positions[id].length, 0) === 64);
const advanced = reduceAction(g, { type: "deal" }); // siguiente click reagrupa y pasa de ronda
check("ronda avanza a 2", advanced.round === 2);
check("nuevas cartas en monton boca abajo", advanced.positions.monton.length === 64 && advanced.positions.monton.every((c) => !c.faceUp));
check("piles reset", (["pile1", "pile2", "pile3", "pile4"] as PositionId[]).every((id) => advanced.positions[id].length === 0));

// ============================================================
section("ronda 2 reparte 3 cartas a pile1-3");
const round2Deal = dealFromMonton(advanced);
check("3 cartas repartidas a pile1-3", (["pile1", "pile2", "pile3"] as PositionId[]).every((id) => round2Deal.positions[id].length === 1));
check("pile4 sigue vacía en ronda 2", round2Deal.positions.pile4.length === 0);

// ============================================================
section("undo: revierte el último estado");
const before2 = createInitialState({ seed: 99 });
const moved = reduceAction(before2, { type: "deal" });
check("estado cambia tras deal", moved !== before2);
const reverted = undo(moved);
check("undo restaura monton", reverted.positions.monton.length === before2.positions.monton.length);
check("undo limpia pile1", reverted.positions.pile1.length === 0);
check("history pop", reverted.history.length === before2.history.length);

// REGRESIÓN: tras múltiples deals + undo encadenados, las cartas del montón
// deben seguir TODAS boca abajo. Antes el snapshot era shallow y dealFromMonton
// mutaba faceUp en sitio, contaminando los estados de history.
section("regresión bug snapshot shallow: monton boca abajo tras undos");
let r = createInitialState({ seed: 7 });
const initialMontonTop = r.positions.monton[r.positions.monton.length - 1];
check("inicio: top del montón boca abajo", initialMontonTop && !initialMontonTop.faceUp);
let chain = r;
for (let i = 0; i < 3; i++) chain = reduceAction(chain, { type: "deal" });
check("tras 3 deals algunas cartas están boca arriba (en pila1-4)", chain.positions.pile1[0]?.faceUp === true);
let undone3 = chain;
for (let i = 0; i < 3; i++) undone3 = undo(undone3);
check("tras 3 undo, monton tiene la longitud original", undone3.positions.monton.length === r.positions.monton.length);
const allFaceDown = undone3.positions.monton.every((c) => !c.faceUp);
check("tras 3 undo, TODAS las cartas del montón están boca abajo", allFaceDown);
check("tras 3 undo, pila1 vacía", undone3.positions.pile1.length === 0);

// ============================================================
section("chainMoveToFoundation: encadena dentro del origen");
// X con A,2,3 hearts y A1 con 4 hearts. Mover 4 hearts a una I-IV no aplica
// (descendente). Mejor caso: X tiene A-3 hearts (ascendente). Movemos A1 con
// otra carta a X: encadena solo si la siguiente carta de A1 sigue ascendente.
// Para probar el encadenado limitamos a un caso natural: X→I-IV.
let chainState = createInitialState({ preshuffled: controlledDeck });
// Construyo X con A, 2, 3 hearts (ascendente válido). Quiero moverlo a una I-IV
// vacía: solo se mueve la primera carta (3) porque luego I-IV expecta 2 (que está
// debajo de 3 en X, así que sí encaja). Test: X = [A, 2, 3] hearts, I-IV vacía.
const aH2 = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 1 && c.deck === 1)!;
const twoH2 = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 2 && c.deck === 1)!;
const threeH2 = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 3 && c.deck === 1)!;
chainState = {
  ...chainState,
  positions: {
    ...chainState.positions,
    X: [
      { ...aH2, faceUp: true },
      { ...twoH2, faceUp: true },
      { ...threeH2, faceUp: true }
    ],
    I: []
  }
};
// Mover X→I: primero K esperaba la I vacía. 3 NO encaja (vacía exige K).
// Mejor escenario: I tiene un 4 hearts encima (descendente: 4 espera 3 después).
const fourH = controlledDeck.find((c) => c.suit === "hearts" && c.rank === 4 && c.deck === 0)!;
chainState = {
  ...chainState,
  positions: {
    ...chainState.positions,
    I: [{ ...fourH, faceUp: true }]
  }
};
const chainResult = chainMoveToFoundation(chainState, "X", "I");
check("X→I mueve 3 cartas (3,2,A)", chainResult.records.length === 3);
check("X queda vacía", chainResult.state.positions.X.length === 0);
// I tenía [4]. Tras encadenar 3, 2, A: I tendría [4,3,2,1]. Al colocar el A se
// dispara cleared y la fundación se vacía.
check("I se vació al llegar al As", chainResult.state.positions.I.length === 0);

// ============================================================
section("undo restaura encadenado completo");
const beforeChain = chainState;
const afterChainAction = reduceAction(
  { ...chainState, history: [], startedAt: Date.now(), finishedAt: null },
  { type: "move", from: "X", to: "I" }
);
check("acción 'move' encadena al ser destino fundación desde X", afterChainAction.positions.X.length === 0);
const undone = undo(afterChainAction);
check("undo restaura X con 3 cartas (1 sola entrada en history a pesar de 3 moves físicos)", undone.positions.X.length === 3);
check("undo restaura I con la 4 sola", undone.positions.I.length === 1);

// ============================================================
console.log(`\n=================`);
if (failed === 0) {
  console.log(`OK — todos los chequeos pasaron`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failed} chequeo(s) fallaron`);
  process.exit(1);
}
