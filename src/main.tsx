import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { configureLeaderboard } from "./game/leaderboard";
import { getPlatform } from "./platform";
import "./styles/index.css";

// ── Punto de encuentro entre la base común y el juego ────────────────────────
// Es el único sitio que conoce los dos lados: `src/platform/` no sabe que
// existe el Napoleón, y `src/game/` no sabe dónde está corriendo. Aquí se le
// dice al juego de dónde salen sus puntuaciones, según el destino detectado.
const platform = getPlatform();
configureLeaderboard({ remoteBaseUrl: platform.leaderboard.remoteBaseUrl });
void platform.init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
