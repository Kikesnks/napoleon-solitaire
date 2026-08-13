import { useEffect, type RefObject } from "react";

/**
 * Ajusta el tamaño de carta al espacio REALMENTE disponible.
 *
 * El CSS calcula `--card-w` a partir de `100svh` menos una altura de cabecera
 * *estimada* (`--hud-h`). Esa estimación falla en cuanto la cabecera no mide lo
 * previsto —otro idioma con botones más anchos, otra densidad de fuente— y en
 * móvil apaisado el error se paga entero: el tablero salía más alto que su
 * contenedor y, como `.app__main` recorta sin scroll, las pilas de reparto
 * 1-4 desaparecían por debajo del borde.
 *
 * En vez de afinar la estimación, aquí se mide. Un `ResizeObserver` sobre el
 * contenedor escribe su caja de contenido en `--avail-w` / `--avail-h`, que es
 * exactamente lo que la fórmula del CSS esperaba: la misma aritmética, pero con
 * el dato bueno. Sobra cualquier suposición sobre cabecera, barra de URL,
 * safe-areas o el `svh` de cada navegador.
 *
 * Si no hay `ResizeObserver` (navegador viejo), el CSS conserva su fórmula
 * estimada como respaldo y el juego sigue siendo jugable.
 */
export function useFitBoard(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const root = document.documentElement;
    const measure = () => {
      const cs = window.getComputedStyle(el);
      const w =
        el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      const h =
        el.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      if (w > 0) root.style.setProperty("--avail-w", `${w}px`);
      if (h > 0) root.style.setProperty("--avail-h", `${h}px`);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // Al girar el móvil, algunos navegadores reordenan el viewport después de
    // notificar el resize; una segunda medida diferida evita quedarse con el
    // tamaño de la orientación anterior.
    const onOrientation = () => window.setTimeout(measure, 250);
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [ref]);
}
