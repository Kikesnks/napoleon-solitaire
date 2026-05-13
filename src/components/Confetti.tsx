import { useEffect, useMemo, useState } from "react";

/**
 * Celebración de victoria en primer plano:
 *  - 75 partículas de confeti cayendo en bucle infinito (CSS infinite).
 *  - Ráfagas de fuegos artificiales que se regeneran cada 3.5 s mientras
 *    el jugador no pulse "Jugar otra". Se monta sobre el overlay de victoria
 *    (z-index 1000 > overlay 999) con pointer-events: none para que el botón
 *    siga siendo pulsable.
 */

const COLORS = [
  "#ffd166", // amarillo
  "#ef476f", // rosa
  "#06d6a0", // verde menta
  "#118ab2", // azul
  "#ff8b3d", // naranja
  "#c879ff", // violeta
  "#ff6b6b", // rojo
  "#00f5d4", // cian
  "#f72585", // magenta
  "#4cc9f0", // azul cielo
  "#7bed9f"  // verde lima
];

type FallShape = "square" | "circle" | "strip";

interface FallParticle {
  kind: "fall";
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
  shape: FallShape;
}

interface BurstParticle {
  kind: "burst";
  id: number;
  originX: number;
  originY: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  travelX: number;
  travelY: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const SHAPES: FallShape[] = ["square", "circle", "strip"];

function generateFall(): FallParticle[] {
  return Array.from({ length: 75 }, (_, i) => ({
    kind: "fall" as const,
    id: i,
    left: rand(0, 100),
    color: pickColor(),
    size: rand(6, 15),
    delay: rand(0, 5.5),
    duration: rand(2.5, 5.5),
    rotation: rand(-360, 720),
    drift: rand(-90, 90),
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]
  }));
}

function generateBursts(seed: number): BurstParticle[] {
  const list: BurstParticle[] = [];
  const NUM_BURSTS = 7;
  const RAYS = 20;
  for (let b = 0; b < NUM_BURSTS; b++) {
    const originX = rand(10, 90);
    const originY = rand(8, 60);
    const burstDelay = b * 0.45 + rand(0, 0.25);
    for (let r = 0; r < RAYS; r++) {
      const angle = (r / RAYS) * Math.PI * 2;
      const distance = rand(130, 260);
      list.push({
        kind: "burst" as const,
        id: seed * 100_000 + b * 1000 + r,
        originX,
        originY,
        color: pickColor(),
        size: rand(7, 14),
        delay: burstDelay,
        duration: rand(0.85, 1.45),
        travelX: Math.cos(angle) * distance,
        travelY: Math.sin(angle) * distance
      });
    }
  }
  return list;
}

export function Confetti() {
  const [burstSeed, setBurstSeed] = useState(0);

  // Regenerar ráfagas cada 3.5 s para mantener el espectáculo en bucle.
  useEffect(() => {
    const id = window.setInterval(() => setBurstSeed((s) => s + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  const fallParticles = useMemo(generateFall, []);
  const burstParticles = useMemo(() => generateBursts(burstSeed), [burstSeed]);

  return (
    <div className="confetti" aria-hidden>
      {fallParticles.map((p) => {
        const style: React.CSSProperties = {
          left: `${p.left}%`,
          top: "-24px",
          width: p.shape === "strip" ? "4px" : `${p.size}px`,
          height: p.shape === "strip" ? `${p.size * 2.8}px` : `${p.size}px`,
          background: p.color,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          ["--rot" as never]: `${p.rotation}deg`,
          ["--drift" as never]: `${p.drift}px`,
          borderRadius: p.shape === "circle" ? "50%" : "2px"
        };
        return <div key={p.id} className="confetti__p confetti__p--fall" style={style} />;
      })}
      {burstParticles.map((p) => {
        const style: React.CSSProperties = {
          left: `${p.originX}%`,
          top: `${p.originY}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          background: p.color,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          ["--burst-x" as never]: `${p.travelX}px`,
          ["--burst-y" as never]: `${p.travelY}px`
        };
        return <div key={p.id} className="confetti__p confetti__p--burst" style={style} />;
      })}
    </div>
  );
}
