import { useMemo } from "react";

/**
 * Celebración de victoria: 50 partículas que caen (confetti) + 4 ráfagas
 * radiales (fuegos artificiales) en puntos aleatorios. Todo con CSS puro,
 * sin lib externa. Los parámetros (posición, color, retardo, rotación...) se
 * fijan en mount via useMemo — cada partida ganada tiene un patrón ligeramente
 * distinto pero estable durante toda la celebración.
 *
 * Se monta cuando el jugador gana y se desmonta al iniciar nueva partida.
 */

const COLORS = [
  "#ffd166", // amarillo
  "#ef476f", // rosa
  "#06d6a0", // verde
  "#118ab2", // azul
  "#ff8b3d", // naranja
  "#c879ff", // violeta
  "#ff6b6b" // rojo
];

interface FallParticle {
  kind: "fall";
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  shape: "square" | "circle";
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

type Particle = FallParticle | BurstParticle;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function Confetti() {
  const particles: Particle[] = useMemo(() => {
    const list: Particle[] = [];

    // 50 partículas cayendo desde arriba, repartidas por todo el ancho.
    for (let i = 0; i < 50; i++) {
      list.push({
        kind: "fall",
        id: i,
        left: rand(0, 100),
        color: pickColor(),
        size: rand(6, 14),
        delay: rand(0, 3.5),
        duration: rand(2.5, 5),
        rotation: rand(-180, 540),
        shape: Math.random() < 0.5 ? "square" : "circle"
      });
    }

    // 4 ráfagas tipo fuegos artificiales, escalonadas en el tiempo.
    for (let b = 0; b < 4; b++) {
      const originX = rand(20, 80);
      const originY = rand(20, 55);
      const burstDelay = 0.2 + b * 0.9 + rand(0, 0.2);
      const numRays = 14;
      for (let r = 0; r < numRays; r++) {
        const angle = (r / numRays) * Math.PI * 2;
        const distance = rand(120, 180);
        list.push({
          kind: "burst",
          id: 1000 + b * 100 + r,
          originX,
          originY,
          color: pickColor(),
          size: rand(7, 11),
          delay: burstDelay,
          duration: rand(1.0, 1.5),
          travelX: Math.cos(angle) * distance,
          travelY: Math.sin(angle) * distance
        });
      }
    }

    return list;
  }, []);

  return (
    <div className="confetti" aria-hidden>
      {particles.map((p) => {
        if (p.kind === "fall") {
          const style: React.CSSProperties = {
            left: `${p.left}%`,
            top: `-20px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--rot" as never]: `${p.rotation}deg`,
            borderRadius: p.shape === "circle" ? "50%" : "2px"
          };
          return <div key={p.id} className="confetti__p confetti__p--fall" style={style} />;
        }
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
