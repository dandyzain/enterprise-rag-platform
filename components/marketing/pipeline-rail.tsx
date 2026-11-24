"use client";

import * as React from "react";
import { m, useMotionValueEvent, useScroll } from "framer-motion";
import { Scissors, Binary, GitMerge, ArrowDownUp, ShieldCheck, type LucideIcon } from "lucide-react";
import { Spotlight } from "@/components/motion/spotlight";
import { riseVariants } from "@/components/motion/reveal";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}

// Copy kept verbatim from the original landing page (i18n is scheduled for Phase 7).
const STEPS: Step[] = [
  {
    title: "Recursive Chunking",
    description: "500-700 tokens with 100 overlap using intelligent text splitters (`\\n\\n`, `\\n`).",
    icon: Scissors,
  },
  {
    title: "Vector Embeddings",
    description: "1536-dim OpenAI `text-embedding-3-small` / Gemini with L2 unit norm normalization.",
    icon: Binary,
  },
  {
    title: "Hybrid Search (RRF)",
    description: "Merges dense cosine & BM25 sparse lexical ($k=60$) for exact code & semantic recall.",
    icon: GitMerge,
  },
  {
    title: "Two-Stage Re-Ranking",
    description: "Lexical re-ranker re-scores top candidates with phrase boost and entity congruence.",
    icon: ArrowDownUp,
  },
  {
    title: "Groundedness Auditor",
    description: "Sentence-by-sentence factuality check against cited chunks to guarantee zero hallucinations.",
    icon: ShieldCheck,
  },
];

/**
 * Five-stage pipeline whose nodes light up in sequence as the section is
 * scrolled; active connectors carry a travelling "data packet".
 */
export function PipelineRail() {
  const ref = React.useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const [activeCount, setActiveCount] = React.useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v <= 0.001 ? 0 : Math.min(STEPS.length, Math.floor(v * (STEPS.length - 1) + 0.05) + 1);
    setActiveCount((prev) => (prev === next ? prev : next));
  });

  return (
    <m.ol
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5"
    >
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const active = i < activeCount;
        const nextActive = i + 1 < activeCount;
        const isLast = i === STEPS.length - 1;

        return (
          <m.li
            key={step.title}
            variants={riseVariants(20)}
            data-active={active}
            className="group/step relative grid grid-cols-[2.75rem_1fr] gap-4 md:flex md:flex-col md:gap-0"
          >
            {/* Connector to the next node: vertical on mobile, horizontal on desktop */}
            {!isLast && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute left-[1.375rem] top-11 -bottom-4 w-px -translate-x-1/2 bg-zinc-200 dark:bg-zinc-800 md:hidden"
                >
                  <span
                    className={cn(
                      "absolute inset-0 origin-top bg-gradient-to-b from-signal to-teal-400 transition-transform duration-700 ease-out-expo",
                      nextActive ? "scale-y-100" : "scale-y-0"
                    )}
                  />
                  {nextActive && (
                    <span className="packet-track packet-track-vertical">
                      <span style={{ "--delay": `${i * 0.35}s` } as React.CSSProperties} />
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-[1.375rem] left-[calc(50%+1.375rem)] hidden h-px w-[calc(100%-1.75rem)] -translate-y-1/2 bg-zinc-200 dark:bg-zinc-800 lg:block"
                >
                  <span
                    className={cn(
                      "absolute inset-0 origin-left bg-gradient-to-r from-signal to-teal-400 transition-transform duration-700 ease-out-expo",
                      nextActive ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                  {nextActive && (
                    <span className="packet-track">
                      <span style={{ "--delay": `${i * 0.35}s` } as React.CSSProperties} />
                    </span>
                  )}
                </span>
              </>
            )}

            {/* Node */}
            <div className="relative z-10 flex md:mb-4 md:justify-start lg:justify-center">
              <m.span
                animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 0.5, ease: ease.out }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-500",
                  active
                    ? "border-signal bg-emerald-50 text-signal-text shadow-glow-signal dark:bg-emerald-950"
                    : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </m.span>
            </div>

            {/* Card */}
            <Spotlight
              className={cn(
                "rounded-xl border p-5 transition-[border-color,background-color,transform] duration-500 md:flex-1",
                active
                  ? "border-emerald-500/40 bg-white dark:bg-zinc-900/70"
                  : "border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40",
                "hover:-translate-y-1"
              )}
            >
              <div
                className={cn(
                  "mb-2 font-mono text-xs font-bold transition-colors duration-500",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{step.description}</p>
            </Spotlight>
          </m.li>
        );
      })}
    </m.ol>
  );
}
