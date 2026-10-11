import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900",
        secondary:
          "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300",
        outline:
          "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
        // Pipeline status badges as requested:
        // Uploading (kuning pudar)
        uploading:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300",
        // Chunking & Indexing (biru berdenyut)
        indexing:
          "border-sky-300 bg-sky-50 text-sky-800 animate-pulse dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-300",
        // Ready (hijau solid)
        ready:
          "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold",
        // Failed
        failed:
          "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300",
        // Citation chip
        citation:
          "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 font-mono font-medium px-1.5 py-0.5 rounded text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
