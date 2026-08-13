import { useCallback, useEffect, useRef, useState } from "react";
import type { PositionId } from "../game";

/**
 * Drag & drop universal con Pointer Events: funciona idéntico en mouse, touch
 * y stylus. Detecta el destino con elementFromPoint() leyendo data-drop-target.
 *
 * Flujo:
 *   1) onPointerDown sobre la carta superior de un origen → guardamos origen.
 *   2) onPointerMove → trackeamos posición y resaltamos posibles destinos.
 *   3) onPointerUp → si soltamos sobre un drop target válido, callback `onDrop`.
 *      Si el puntero apenas se movió y no había destino, es un TOQUE: `onTap`.
 *
 * El toque se detecta aquí y no con un `onClick` en la carta a propósito. El
 * navegador dispara `click` también al final de un arrastre fallido (pointer
 * capture manda el evento a la carta de origen aunque el dedo termine lejos),
 * así que promover desde `onClick` movería cartas tras cada arrastre que no
 * llegara a destino. Con el umbral de distancia, arrastrar y tocar quedan
 * separados de verdad.
 */

/** Movimiento máximo (px) para que soltar cuente como toque y no como arrastre. */
const TAP_SLOP_PX = 8;

export interface DragState {
  from: PositionId;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface DragHandlers {
  drag: DragState | null;
  hoveredTarget: PositionId | null;
  beginDrag(e: React.PointerEvent, from: PositionId): void;
}

interface Options {
  onDrop(from: PositionId, to: PositionId): void;
  /** Toque sin arrastre sobre la carta superior de `from`. */
  onTap(from: PositionId): void;
  isLegalTarget(from: PositionId, to: PositionId): boolean;
}

export function useDragDrop({ onDrop, onTap, isLegalTarget }: Options): DragHandlers {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<PositionId | null>(null);
  // Refs para evitar closures stale en los handlers globales.
  const dragRef = useRef<DragState | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const isLegalRef = useRef(isLegalTarget);
  const onDropRef = useRef(onDrop);
  const onTapRef = useRef(onTap);
  isLegalRef.current = isLegalTarget;
  onDropRef.current = onDrop;
  onTapRef.current = onTap;
  dragRef.current = drag;

  const beginDrag = useCallback((e: React.PointerEvent, from: PositionId) => {
    if (e.button !== undefined && e.button !== 0) return;
    originRef.current = { x: e.clientX, y: e.clientY };
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Las pilas B/B1/D/D1 muestran sus cartas rotadas 90°. El bounding rect
    // visual es card-h × card-w, pero el overlay flotante debe verse en
    // orientación natural (portrait). Usamos getComputedStyle para leer las
    // dimensiones intrínsecas de la carta (independientes del transform).
    const cs = window.getComputedStyle(target);
    const intrinsicW = parseFloat(cs.width) || rect.width;
    const intrinsicH = parseFloat(cs.height) || rect.height;
    const isHorizontal = !!target.closest(".pile--horizontal");

    target.setPointerCapture(e.pointerId);
    setDrag({
      from,
      pointerX: e.clientX,
      pointerY: e.clientY,
      // Para pilas horizontales centramos el overlay en el dedo (la rotación
      // hace que el "punto agarrado" en visual no se mapee 1:1 al portrait).
      offsetX: isHorizontal ? intrinsicW / 2 : e.clientX - rect.left,
      offsetY: isHorizontal ? intrinsicH / 2 : e.clientY - rect.top,
      width: intrinsicW,
      height: intrinsicH
    });
  }, []);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const next: DragState = { ...current, pointerX: e.clientX, pointerY: e.clientY };
      dragRef.current = next;
      setDrag(next);

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let found: PositionId | null = null;
      for (const el of elements) {
        const t = (el as HTMLElement).dataset?.dropTarget as PositionId | undefined;
        if (!t) continue;
        if (t === current.from) continue;
        if (isLegalRef.current(current.from, t)) {
          found = t;
          break;
        }
      }
      setHoveredTarget(found);
    };

    const finish = (e: PointerEvent) => {
      const current = dragRef.current;
      if (current) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        let target: PositionId | null = null;
        for (const el of elements) {
          const t = (el as HTMLElement).dataset?.dropTarget as PositionId | undefined;
          if (!t || t === current.from) continue;
          if (isLegalRef.current(current.from, t)) {
            target = t;
            break;
          }
        }
        if (target) {
          onDropRef.current(current.from, target);
        } else {
          // Sin destino: puede ser un arrastre que no llegó a ninguna parte o
          // un toque limpio. Los separa la distancia recorrida.
          const origin = originRef.current;
          const dx = origin ? e.clientX - origin.x : Infinity;
          const dy = origin ? e.clientY - origin.y : Infinity;
          if (Math.hypot(dx, dy) <= TAP_SLOP_PX) onTapRef.current(current.from);
        }
      }
      originRef.current = null;
      dragRef.current = null;
      setDrag(null);
      setHoveredTarget(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [drag]);

  return { drag, hoveredTarget, beginDrag };
}
