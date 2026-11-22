import type { CSSProperties } from "react";

/** Deterministic pseudo-random sequence so server and client markup match. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(42);
const PARTICLES = Array.from({ length: 18 }, () => ({
  left: 8 + rand() * 84,
  top: 18 + rand() * 62,
  size: 2 + Math.round(rand() * 2),
  duration: 7 + rand() * 6,
  delay: rand() * 8,
  drift: Math.round((rand() - 0.5) * 40),
}));

/**
 * Decorative hero background: masked grid, three drifting aurora glows,
 * rising "vector" particles and a slow scan line. Pure CSS animation
 * (transform/opacity), frozen automatically under prefers-reduced-motion.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]"
    >
      <div className="hero-grid absolute inset-0" />
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: `${p.left.toFixed(2)}%`,
              top: `${p.top.toFixed(2)}%`,
              "--size": p.size,
              "--dur": `${p.duration.toFixed(2)}s`,
              "--delay": `${p.delay.toFixed(2)}s`,
              "--drift": `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
      <div className="hero-scanline" />
    </div>
  );
}
