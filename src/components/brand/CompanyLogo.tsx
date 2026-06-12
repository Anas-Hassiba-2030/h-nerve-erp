// CompanyLogo — distinctive SVG mark for each Hourani business unit.
// Each logo is hand-drawn, unique to the unit's identity, and brand-coloured.
// Used in heroes, sidebars, exports, cards. Pure server component.

import React from "react";

type LogoProps = {
  code: string;
  size?: number;
  /** White-on-dark variant for use over gradient banners */
  light?: boolean;
  className?: string;
  animated?: boolean;
};

export function CompanyLogo({
  code,
  size = 56,
  light = false,
  className = "",
  animated = false,
}: LogoProps) {
  const renderer = LOGOS[code] ?? LOGOS.HH;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? "hn-anim-zoom-bounce" : ""}`}
      aria-label={`${code} logo`}
    >
      {renderer({ light })}
    </svg>
  );
}

const LOGOS: Record<string, (p: { light: boolean }) => React.ReactElement> = {
  /* ───────────────────────────────────────────────────────────────
     HH — Hourani Holding
     Concept: Layered hexagonal crown — heritage, governance, depth.
     ─────────────────────────────────────────────────────────────── */
  HH: ({ light }) => {
    const fg = light ? "#ffffff" : "#c69345";
    const accent = light ? "rgba(255,255,255,0.4)" : "#1a2940";
    return (
      <g>
        <defs>
          <linearGradient id="hh-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={light ? 0 : 1} />
            <stop offset="100%" stopColor={fg} />
          </linearGradient>
        </defs>
        {/* outer hexagon */}
        <polygon
          points="50,4 92,28 92,72 50,96 8,72 8,28"
          fill="url(#hh-grad)"
          stroke={light ? "#ffffff" : "#c69345"}
          strokeWidth={light ? 2.5 : 1.5}
          strokeLinejoin="round"
        />
        {/* inner crown — three peaks (subtle gold pulse) */}
        <path
          d="M 28 56 L 28 38 L 38 48 L 50 30 L 62 48 L 72 38 L 72 56 Z"
          fill={light ? "#ffffff" : "#c69345"}
          opacity={light ? 0.95 : 1}
        >
          <animate
            attributeName="opacity"
            values={light ? "0.85;1;0.85" : "0.85;1;0.85"}
            dur="3.5s"
            repeatCount="indefinite"
          />
        </path>
        {/* base bar */}
        <rect
          x="28"
          y="60"
          width="44"
          height="6"
          fill={light ? "#ffffff" : "#c69345"}
          rx="1"
        />
        {/* center dot — heritage accent (heartbeat) */}
        <circle cx="50" cy="73" r="3" fill={accent} opacity={light ? 0.9 : 0.5}>
          <animate
            attributeName="r"
            values="2.6;3.5;2.6"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    );
  },

  /* ───────────────────────────────────────────────────────────────
     ARENA — Arena Space Hospitality
     Concept: 5-pointed star with arena ring — luxury, prestige.
     ─────────────────────────────────────────────────────────────── */
  ARENA: ({ light }) => {
    const fg = light ? "#ffffff" : "#b06a1a";
    const ring = light ? "rgba(255,255,255,0.45)" : "#f5b341";
    return (
      <g>
        <defs>
          <linearGradient id="arena-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light ? "#ffffff" : "#5a3a1f"} stopOpacity={light ? 0.2 : 1} />
            <stop offset="100%" stopColor={fg} />
          </linearGradient>
        </defs>
        {/* Arena oval ring */}
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="42"
          fill="url(#arena-grad)"
          stroke={ring}
          strokeWidth="2"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="36"
          fill="none"
          stroke={ring}
          strokeWidth="1"
          opacity="0.6"
        />
        {/* 5-pointed star — gentle continuous rotation around center */}
        <g style={{ transformOrigin: "50px 50px" }}>
          <polygon
            points="50,18 58,42 84,42 63,58 71,82 50,68 29,82 37,58 16,42 42,42"
            fill={light ? "#ffffff" : "#f5b341"}
            stroke={light ? "rgba(0,0,0,0.15)" : "#b06a1a"}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="40s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    );
  },

  /* ───────────────────────────────────────────────────────────────
     MAHA — Maha Dairy
     Concept: Water drop with concentric ripples — purity, freshness.
     ─────────────────────────────────────────────────────────────── */
  MAHA: ({ light }) => {
    const fg = light ? "#ffffff" : "#0d7eaf";
    const deep = light ? "rgba(255,255,255,0.5)" : "#084d6e";
    return (
      <g>
        <defs>
          <linearGradient id="maha-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light ? "rgba(255,255,255,0.2)" : "#b3e5f7"} />
            <stop offset="100%" stopColor={fg} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill={light ? "rgba(255,255,255,0.1)" : "#dff1f9"}
          stroke={fg}
          strokeWidth="1.5"
        />
        {/* Concentric ripples — animated outward (water expanding) */}
        <circle cx="50" cy="56" r="20" fill="none" stroke={deep} strokeWidth="1.2" opacity="0">
          <animate attributeName="r" values="20;38" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="56" r="20" fill="none" stroke={deep} strokeWidth="1.2" opacity="0">
          <animate attributeName="r" values="20;38" dur="3.2s" begin="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0" dur="3.2s" begin="1.6s" repeatCount="indefinite" />
        </circle>
        {/* Water drop */}
        <path
          d="M 50 18 C 50 18 30 42 30 58 C 30 70 39 78 50 78 C 61 78 70 70 70 58 C 70 42 50 18 50 18 Z"
          fill="url(#maha-grad)"
          stroke={fg}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Highlight — gentle shimmer */}
        <ellipse cx="42" cy="42" rx="4" ry="8" fill="white" opacity={light ? 0.85 : 0.7}>
          <animate
            attributeName="opacity"
            values={light ? "0.6;0.95;0.6" : "0.45;0.85;0.45"}
            dur="2.8s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>
    );
  },

  /* ───────────────────────────────────────────────────────────────
     LORAN — Loran Agricultural Investment
     Concept: Stylized leaf inside a sun ray rosette — growth, care.
     ─────────────────────────────────────────────────────────────── */
  LORAN: ({ light }) => {
    const fg = light ? "#ffffff" : "#15846a";
    const accent = light ? "rgba(255,255,255,0.5)" : "#a3d9b1";
    return (
      <g>
        <defs>
          <linearGradient id="loran-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light ? "rgba(255,255,255,0.2)" : "#0a4d3a"} />
            <stop offset="100%" stopColor={fg} />
          </linearGradient>
        </defs>
        {/* Outer sun rays — 8 spokes, slowly rotating clockwise (growth) */}
        <g style={{ transformOrigin: "50px 50px" }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 8;
            const x1 = 50 + Math.cos(angle) * 38;
            const y1 = 50 + Math.sin(angle) * 38;
            const x2 = 50 + Math.cos(angle) * 46;
            const y2 = 50 + Math.sin(angle) * 46;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={accent}
                strokeWidth={3}
                strokeLinecap="round"
                opacity="0.7"
              >
                <animate
                  attributeName="opacity"
                  values="0.4;0.85;0.4"
                  dur={`${2.6 + (i % 3) * 0.4}s`}
                  begin={`${i * 0.18}s`}
                  repeatCount="indefinite"
                />
              </line>
            );
          })}
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="60s"
            repeatCount="indefinite"
          />
        </g>
        {/* Inner circle */}
        <circle cx="50" cy="50" r="34" fill="url(#loran-grad)" />
        {/* Leaf */}
        <path
          d="M 50 22 C 30 28 22 50 28 72 C 50 70 70 50 72 28 C 64 24 56 22 50 22 Z"
          fill={light ? "rgba(255,255,255,0.95)" : "#a3d9b1"}
          opacity="0.95"
        />
        {/* Leaf vein — drawing animation (stroke-dasharray) */}
        <path
          d="M 50 22 Q 48 50 28 72"
          fill="none"
          stroke={fg}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
          strokeDasharray="60"
          strokeDashoffset="60"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="60;0;0;60"
            keyTimes="0;0.4;0.7;1"
            dur="6s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    );
  },

  /* ───────────────────────────────────────────────────────────────
     AAU — Al-Ahliyya Amman University
     Concept: Scholar's open book in front of pillared portico.
     ─────────────────────────────────────────────────────────────── */
  AAU: ({ light }) => {
    const fg = light ? "#ffffff" : "#4f5dd1";
    const deep = light ? "rgba(255,255,255,0.7)" : "#1d2680";
    return (
      <g>
        <defs>
          <linearGradient id="aau-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light ? "rgba(255,255,255,0.15)" : "#c8cdf5"} />
            <stop offset="100%" stopColor={fg} />
          </linearGradient>
        </defs>
        {/* Shield silhouette */}
        <path
          d="M 50 8 L 88 18 L 88 56 C 88 76 70 88 50 94 C 30 88 12 76 12 56 L 12 18 Z"
          fill="url(#aau-grad)"
          stroke={fg}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Pillars (3) */}
        {[28, 50, 72].map((x, i) => (
          <rect
            key={i}
            x={x - 4}
            y={36}
            width={8}
            height={36}
            fill={deep}
            opacity="0.5"
            rx="1"
          />
        ))}
        {/* Pediment line */}
        <line x1="22" y1="34" x2="78" y2="34" stroke={deep} strokeWidth="2" strokeLinecap="round" />
        {/* Open book */}
        <path
          d="M 28 60 L 50 56 L 72 60 L 72 76 L 50 72 L 28 76 Z"
          fill="white"
          stroke={fg}
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity={light ? 0.95 : 1}
        />
        <line x1="50" y1="56" x2="50" y2="72" stroke={fg} strokeWidth="1" />
        {/* Star above — twinkling (scale + opacity) */}
        <g style={{ transformOrigin: "50px 22.5px" }}>
          <polygon
            points="50,16 52,21 57,21 53,24 55,29 50,26 45,29 47,24 43,21 48,21"
            fill={light ? "#ffffff" : "#f5b341"}
          >
            <animate
              attributeName="opacity"
              values="0.55;1;0.55"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </polygon>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="scale"
            values="0.85;1.15;0.85"
            dur="2.2s"
            repeatCount="indefinite"
            additive="sum"
          />
        </g>
      </g>
    );
  },
};
