"use client";

import * as React from "react";
import { m, type HTMLMotionProps, type Variants } from "framer-motion";
import { duration, ease, rise, stagger as staggerTokens } from "@/lib/motion";

/** Child variant: fade + rise. Use on any `m.*` element inside <Stagger>. */
export function riseVariants(distance: number = rise.md, delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: duration.deliberate, ease: ease.out, delay },
    },
  };
}

/** Child variant: blur-in rise, for headline words. */
export const wordVariants: Variants = {
  hidden: { opacity: 0, y: "0.35em", filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: ease.out },
  },
};

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
  distance?: number;
  /** Fraction of the element that must be visible before revealing. */
  amount?: number;
};

/** Reveals once when scrolled into view. */
export function Reveal({ delay = 0, distance = rise.md, amount = 0.2, children, ...rest }: RevealProps) {
  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={riseVariants(distance, delay)}
      {...rest}
    >
      {children}
    </m.div>
  );
}

type StaggerProps = HTMLMotionProps<"div"> & {
  /** Seconds between children. */
  interval?: number;
  delayChildren?: number;
  amount?: number;
  /** Animate on mount instead of when scrolled into view (above-the-fold content). */
  immediate?: boolean;
};

/** Orchestrates children that use `riseVariants` / `StaggerItem`. */
export function Stagger({
  interval = staggerTokens.children,
  delayChildren = 0,
  amount = 0.15,
  immediate = false,
  children,
  ...rest
}: StaggerProps) {
  const trigger = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: { once: true, amount } };

  return (
    <m.div
      initial="hidden"
      {...trigger}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: interval, delayChildren } },
      }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  distance = rise.md,
  children,
  ...rest
}: HTMLMotionProps<"div"> & { distance?: number }) {
  return (
    <m.div variants={riseVariants(distance)} {...rest}>
      {children}
    </m.div>
  );
}

/** Splits text into words that blur/rise in sequence (parent must be a variants orchestrator). */
export function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          <m.span variants={wordVariants} className={`inline-block will-change-transform ${className ?? ""}`}>
            {word}
          </m.span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  );
}
