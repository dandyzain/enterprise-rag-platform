/**
 * Motion tokens for framer-motion. Values mirror the CSS custom properties in
 * app/globals.css (--duration-*, --ease-*) so CSS and JS animations share one
 * rhythm.
 *
 * Guidelines:
 * - UI feedback (hover, press, icon swaps): `fast`
 * - Menus, tooltips, tabs: `base`
 * - Dialogs, drawers, panels: `slow` / `spring.panel`
 * - Marketing reveals, gauges: `deliberate`
 * - Exits run at ~70% of the enter duration with `easeIn`.
 * - Only animate transform / opacity.
 */

export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  deliberate: 0.5,
} as const;

export const ease = {
  /** Entering elements — fast start, soft landing. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Exiting elements — gentle start, quick finish. */
  in: [0.4, 0, 1, 1] as const,
  /** Symmetric state changes. */
  standard: [0.2, 0, 0, 1] as const,
};

export const spring = {
  /** Drawers, sheets, docked panels. */
  panel: { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const,
  /** Layout shifts (list reorder, tab indicator). */
  layout: { type: "spring", stiffness: 500, damping: 40 } as const,
  /** Small playful pops (feedback, badges). */
  pop: { type: "spring", stiffness: 600, damping: 22 } as const,
};

export const stagger = {
  /** Delay between sibling reveals. */
  children: 0.06,
};

/** Distance (px) for rise-in reveals. */
export const rise = {
  sm: 6,
  md: 16,
} as const;
