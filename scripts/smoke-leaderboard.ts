// Smoke test del endpoint POST /api/leaderboard/submit.
// Crea una partida, agota el montón sin mover (forzando "lost") y envía el
// payload al servidor local. Verifica que la inserción se valida y persiste.

import { createInitialState } from "../src/game/state";
import { reduceAction, type Action } from "../src/game/rules";
import type { LoggedAction } from "../src/game/types";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3001";
const SEED = 42;
const SUIT_MODE = 4;
const NAME = "smoke-test";

let state = createInitialState({ seed: SEED, suitMode: SUIT_MODE });
const actions: LoggedAction[] = [];

let safety = 500;
while (state.status === "playing" && safety-- > 0) {
  const action: Action = { type: "deal" };
  state = reduceAction(state, action);
  actions.push(action);
}

if (state.status !== "lost") {
  throw new Error(`Esperaba 'lost', el motor dio '${state.status}' tras ${actions.length} reparts`);
}

const payload = {
  name: NAME,
  category: state.status,
  score: state.score,
  suitMode: SUIT_MODE,
  seed: SEED,
  actions
};

console.log("Enviando partida:", { score: payload.score, actions: actions.length });

const res = await fetch(`${BASE}/api/leaderboard/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);

if (!res.ok) {
  process.exit(1);
}
