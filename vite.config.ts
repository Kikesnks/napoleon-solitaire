import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Capacitor copia el contenido de `dist/` al shell nativo, así que mantenemos
// rutas relativas para que el bundle funcione tanto en web como empaquetado.
// CrazyGames exige exactamente lo mismo ("use only relative paths"), así que el
// build de portal no necesita nada especial en este punto.
//
// `--mode portal` (ver `.env.portal`) produce el paquete para los portales:
// sin sourcemap —500 KB que allí no pinta nada— y en su propia carpeta para no
// pisar el `dist/` que usan Vercel y Capacitor.
export default defineConfig(({ mode }) => {
  const isPortal = mode === "portal";
  return {
    plugins: [react()],
    base: "./",
    server: {
      host: true,
      port: 5173
    },
    build: {
      outDir: isPortal ? "dist-portal" : "dist",
      sourcemap: !isPortal,
      // Bajamos el target del bundle a ES2018 para que funcione en WebViews
      // antiguos del Android empaquetado por Capacitor y en Safari iOS 12+.
      // Vite/esbuild transpilará optional chaining, nullish coalescing, etc.
      target: "es2018"
    }
  };
});
