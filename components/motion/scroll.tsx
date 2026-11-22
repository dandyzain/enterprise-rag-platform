"use client";

import * as React from "react";
import { m, useMotionValueEvent, useScroll, useSpring } from "framer-motion";

/** Thin page-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });
  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-signal via-teal-400 to-info"
    />
  );
}

/** True once the page has scrolled past `threshold` px. */
export function useScrolled(threshold = 8) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > threshold);
  });
  return scrolled;
}
