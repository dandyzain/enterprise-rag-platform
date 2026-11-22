"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card wrapper with a cursor-following glow and border highlight
 * (styles: `.spotlight` in globals.css). Mouse pointers only, no re-renders.
 */
export const Spotlight = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Spotlight({ className, onPointerMove, ...props }, forwardedRef) {
    const innerRef = React.useRef<HTMLDivElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const node = innerRef.current;
      if (!node || event.pointerType !== "mouse") return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      node.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    return (
      <div
        ref={setRefs}
        onPointerMove={handlePointerMove}
        className={cn("spotlight", className)}
        {...props}
      />
    );
  }
);
