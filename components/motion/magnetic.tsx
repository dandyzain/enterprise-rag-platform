"use client";

import * as React from "react";
import { m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  /** Fraction of the pointer offset applied to the element. */
  strength?: number;
  /** Maximum travel in px. */
  max?: number;
}

/** Subtly pulls its child toward the mouse pointer (disabled for touch / reduced motion). */
export function Magnetic({ children, className, strength = 0.22, max = 7 }: MagneticProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const clamp = (v: number) => Math.max(-max, Math.min(max, v));

  return (
    <m.div
      className={cn("inline-flex", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        if (reduceMotion || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(clamp((event.clientX - (rect.left + rect.width / 2)) * strength));
        y.set(clamp((event.clientY - (rect.top + rect.height / 2)) * strength));
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
