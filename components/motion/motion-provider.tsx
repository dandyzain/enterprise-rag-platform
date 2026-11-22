"use client";

import * as React from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { duration, ease } from "@/lib/motion";

/**
 * Lightweight motion runtime for a subtree.
 * - LazyMotion + `m.*` components load only the DOM animation feature set.
 * - reducedMotion="user" drops transform/layout animation for users who ask
 *   for reduced motion (opacity fades remain).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.out }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
