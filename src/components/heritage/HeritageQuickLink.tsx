// HeritageQuickLink — replaces the soft pastel-tinted QuickLink. Sharp
// hairline tile with display-serif eyebrow + ink label + ochre arrow on
// hover. The single chromatic touch is the rail color along the start
// edge, matched to the linked module's role.
//
// See docs/governance/DESIGN-SKILL.md §5.1 + §1.D.

import React from "react";
import Link from "next/link";

type Tone = "ink" | "ochre" | "terracotta" | "teal" | "copper" | "rose";

const RAIL: Record<Tone, string> = {
  ink:        "var(--heri-ink)",
  ochre:      "var(--heri-ochre)",
  terracotta: "var(--heri-terracotta)",
  teal:       "var(--heri-teal)",
  copper:     "var(--heri-copper)",
  rose:       "var(--heri-rose)",
};

export function HeritageQuickLink({
  href,
  icon: Icon,
  label,
  sub,
  tone = "ink",
}: {
  href: string;
  icon: any;
  label: string;
  sub: string;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="group heri-focusable relative block px-4 py-4 transition"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        textDecoration: "none",
      }}
    >
      {/* Inline-start rail — single accent */}
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{
          insetInlineStart: 0,
          width: 3,
          background: RAIL[tone],
          opacity: 0.85,
          transition: "width 200ms var(--ease-out-quart), opacity 200ms var(--ease-out-quart)",
        }}
      />
      <div className="ms-2 flex items-center gap-3">
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: RAIL[tone] }}
          strokeWidth={1.5}
        />
        <div className="min-w-0">
          <div
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              color: "var(--heri-ink)",
              lineHeight: 1.2,
            }}
          >
            {label}
          </div>
          <div
            className="truncate heri-number-mono"
            style={{
              fontSize: 10.5,
              color: "var(--heri-ink-3)",
              marginTop: 3,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}
