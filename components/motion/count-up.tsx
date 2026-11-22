"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";

interface CountUpProps {
  /** Text containing a number, e.g. "99.99% Enterprise SLA" or "< 50ms P99". */
  value: string;
  /** Seconds. */
  duration?: number;
  className?: string;
}

const NUMBER = /\d+(?:\.\d+)?/;

/**
 * Counts the first number inside `value` up from zero when scrolled into view,
 * keeping surrounding text intact. Screen readers always get the final value.
 */
export function CountUp({ value, duration = 1.6, className }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();

  const match = value.match(NUMBER);
  const target = match ? parseFloat(match[0]) : 0;
  const decimals = match?.[0].split(".")[1]?.length ?? 0;
  const prefix = match ? value.slice(0, match.index) : value;
  const suffix = match ? value.slice((match.index ?? 0) + match[0].length) : "";

  const format = React.useCallback(
    (n: number) =>
      n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: false,
      }),
    [decimals]
  );

  const hasNumber = Boolean(match);

  // Server markup shows the final value; on the client we reset to zero until
  // the number scrolls into view, then count up (skipped for reduced motion).
  React.useEffect(() => {
    const node = ref.current;
    if (!hasNumber || reduceMotion || !node) return;
    if (!inView) {
      node.textContent = format(0);
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: ease.out,
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [hasNumber, inView, reduceMotion, target, duration, format]);

  if (!match) return <span className={className}>{value}</span>;

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {prefix}
        <span ref={ref} className="tabular-nums">
          {format(target)}
        </span>
        {suffix}
      </span>
    </span>
  );
}
