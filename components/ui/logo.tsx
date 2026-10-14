import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function CortexLogo({
  size = 36,
  className = "",
  showText = false,
  textClassName = "",
  ...props
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        {...props}
      >
        <defs>
          <linearGradient id="cortex-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="cortex-facet-1" x1="20" y1="9" x2="11" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="cortex-facet-2" x1="20" y1="9" x2="29" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="cortex-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Minimalist Rounded Squircle Container */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="11"
          fill="url(#cortex-bg)"
          stroke="#10b981"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          className="shadow-sm"
        />

        {/* Vector Grid Orbit Accent */}
        <circle
          cx="20"
          cy="20"
          r="15"
          stroke="#ffffff"
          strokeOpacity="0.12"
          strokeWidth="0.8"
          strokeDasharray="2.5 2.5"
        />

        {/* Neural Vector Facets */}
        <path
          d="M20 9.5 L11.5 27 L20 20.5 Z"
          fill="url(#cortex-facet-1)"
          stroke="#6ee7b7"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M20 9.5 L28.5 27 L20 20.5 Z"
          fill="url(#cortex-facet-2)"
          stroke="#a7f3d0"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 27 L20 20.5 L28.5 27 Z"
          fill="#064e3b"
          fillOpacity="0.45"
          stroke="#34d399"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Outer Connection Beams */}
        <line x1="20" y1="9.5" x2="20" y2="20.5" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.75" />

        {/* Neural Cortex Nodes */}
        <circle cx="20" cy="9.5" r="2.2" fill="#ffffff" />
        <circle cx="11.5" cy="27" r="2" fill="#a7f3d0" />
        <circle cx="28.5" cy="27" r="2" fill="#a7f3d0" />

        {/* Central Core Nexus Node */}
        <circle cx="20" cy="20.5" r="2.6" fill="#ffffff" />
        <circle cx="20" cy="20.5" r="1.4" fill="#059669" />
      </svg>

      {showText && (
        <div className={`flex flex-col leading-none ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              CORTEX
            </span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              RAG
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 tracking-wider uppercase font-medium mt-0.5">
            Vector Engine
          </span>
        </div>
      )}
    </div>
  );
}
