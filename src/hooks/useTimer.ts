import { useEffect, useState } from "react";

/**
 * Cronómetro 1-second tick. Para parar, basta con dejar de actualizar el
 * `running` flag (p.ej. al ganar/perder). Devuelve milisegundos transcurridos.
 */
export function useTimer(startedAt: number, running: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return Math.max(0, now - startedAt);
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
