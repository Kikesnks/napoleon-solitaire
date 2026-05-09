import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Capacitor copia el contenido de `dist/` al shell nativo, así que mantenemos
// rutas relativas para que el bundle funcione tanto en web como empaquetado.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // Bajamos el target del bundle a ES2018 para que funcione en WebViews
    // antiguos del Android empaquetado por Capacitor y en Safari iOS 12+.
    // Vite/esbuild transpilará optional chaining, nullish coalescing, etc.
    target: "es2018"
  }
});
