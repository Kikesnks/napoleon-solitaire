// Arranque y parada de `vite preview` para los tests de navegador.
//
// Existe por dos motivos, los dos aprendidos a base de tests que fallaban sin
// que hubiera nada roto en el juego:
//
//  1. `--strictPort`. Sin él, si el puerto pedido está ocupado Vite coge el
//     siguiente libre sin avisar. Un preview huérfano acababa escuchando en el
//     puerto de OTRO test y lo tumbaba con EADDRINUSE, señalando al test
//     equivocado. Con strictPort, el que falla es quien tiene el problema.
//
//  2. Matar el árbol de procesos. En Windows el preview se lanza a través de
//     `npx.cmd` con shell, así que `proc.kill()` mata el intérprete y deja vivo
//     el `node` que de verdad escucha. Se iban acumulando previews zombis entre
//     ejecuciones. `taskkill /T` se lleva también a los descendientes.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export interface PreviewOptions {
  port: number;
  /** Carpeta a servir. Por defecto la del build normal (`dist`). */
  outDir?: string;
  /** Segundos de espera antes de rendirse. */
  timeoutMs?: number;
}

export function startPreview({
  port,
  outDir,
  timeoutMs = 20000
}: PreviewOptions): Promise<ChildProcess> {
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH ?? ""}` };
  const args = ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  if (outDir) args.push("--outDir", outDir);

  const proc = spawn("npx.cmd", args, {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true // Necesario en Windows para ejecutar .cmd
  });

  return new Promise((resolve, reject) => {
    let salida = "";
    const onData = (chunk: Buffer) => {
      salida += chunk.toString();
      if (salida.includes(String(port))) {
        proc.stdout?.off("data", onData);
        setTimeout(() => resolve(proc), 500);
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", (chunk) => {
      salida += chunk.toString();
      process.stderr.write(chunk);
    });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`vite preview salió con código ${code} (puerto ${port}).\n${salida}`));
      }
    });
    setTimeout(
      () => reject(new Error(`vite preview no arrancó en ${timeoutMs} ms (puerto ${port})`)),
      timeoutMs
    );
  });
}

/** Para el preview y todos sus descendientes. Ver el motivo 2 de arriba. */
export function stopPreview(proc: ChildProcess): void {
  if (proc.pid && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  }
  proc.kill();
}
