// LiveTicker — Heritage Modern variant.
//
// Flat ink-on-cream rail. No gradients. No neon. Mono uppercase eyebrow
// labels separate from tabular-numeral values, divided by hairline rules.
// Single ochre dot at the start to signal "live."
//
// See docs/DESIGN-SKILL.md §1.D and §5 (interface patterns).

import { Sparkles, ArrowLeftRight, TrendingUp, TrendingDown, Activity } from "lucide-react";

export type TickerItem = {
  id: string;
  icon?: "sparkle" | "bridge" | "up" | "down" | "pulse";
  label: string;
  value?: string;
  highlight?: boolean;
};

export function LiveTicker({ items }: { items: TickerItem[] }) {
  if (!items || items.length === 0) return null;
  // Static strip — no auto-scroll, so no need to duplicate for a loop.
  const loop = items;

  return (
    <div
      className="ticker"
      style={{
        background: "var(--heri-cream-2)",
        color: "var(--heri-ink)",
        borderTop: "1px solid var(--heri-rule)",
        borderBottom: "1px solid var(--heri-rule)",
      }}
    >
      <div className="ticker-track px-4 py-2.5">
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            className="inline-flex items-center gap-2 whitespace-nowrap"
            style={{
              fontFamily:
                "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
              paddingInlineEnd: 18,
            }}
          >
            <span style={{ color: "var(--heri-copper)", display: "inline-flex" }}>
              {iconFor(it.icon)}
            </span>
            <span
              style={{
                color: "var(--heri-ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {it.label}
            </span>
            {it.value ? (
              <span
                style={{
                  color: it.highlight ? "var(--heri-terracotta)" : "var(--heri-ink)",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                }}
              >
                {it.value}
              </span>
            ) : null}
            <span
              aria-hidden
              style={{
                color: "var(--heri-rule-strong)",
                marginInlineStart: 12,
                fontSize: 12,
              }}
            >
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function iconFor(kind: TickerItem["icon"]) {
  switch (kind) {
    case "sparkle":
      return <Sparkles className="h-3 w-3" strokeWidth={1.5} />;
    case "bridge":
      return <ArrowLeftRight className="h-3 w-3" strokeWidth={1.5} />;
    case "up":
      return <TrendingUp className="h-3 w-3" strokeWidth={1.5} />;
    case "down":
      return <TrendingDown className="h-3 w-3" strokeWidth={1.5} />;
    case "pulse":
    default:
      return <Activity className="h-3 w-3" strokeWidth={1.5} />;
  }
}
