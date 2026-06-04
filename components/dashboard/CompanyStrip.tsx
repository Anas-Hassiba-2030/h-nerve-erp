// CompanyStrip — Heritage Modern rebuild.
//
// Each company tile is a flat cream surface with a single inline-start rail
// (the only chromatic accent, picked from the Heritage palette per company).
// Logo + name in display, revenue in Fraunces tabular numerals, health as a
// current-color pill, ops metric in mono. No gradients. No drop shadows.
// Single 1px hairline border, sharp 0px corners.
//
// See docs/DESIGN-SKILL.md §1.D and §5.1.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { formatMoney } from "@/lib/utils/utils";

export type CompanyStripItem = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  sector: string;
  revenueTrend: number[];
  revenue: number;
  ops: { label: string; value: string }; // primary operational metric
  health: "OK" | "WARN" | "CRITICAL";
};

// Per-company accent — single chromatic touch, drawn from Heritage palette.
const RAIL: Record<string, string> = {
  HH:    "var(--heri-terracotta)", // Hourani Holding
  ARENA: "var(--heri-ochre)",      // Arena (hospitality / gold)
  MAHA:  "var(--heri-copper)",     // Maha Dairy
  LORAN: "var(--heri-teal)",       // Loran Agriculture
  AAU:   "var(--heri-ink)",        // Al-Ahliyya (institutional)
};
const RAIL_DEFAULT = "var(--heri-rule-strong)";

const HEALTH_TONE: Record<string, "success" | "warn" | "critical"> = {
  OK: "success", WARN: "warn", CRITICAL: "critical",
};
const HEALTH_AR: Record<string, string> = { OK: "صحي", WARN: "تنبيه", CRITICAL: "حرج" };
const HEALTH_EN: Record<string, string> = { OK: "Healthy", WARN: "Watch", CRITICAL: "Critical" };
const HEALTH_HEX: Record<string, string> = {
  OK: "#1f4e4a",       // heri-teal
  WARN: "#a87a32",     // heri-ochre-2
  CRITICAL: "#b85c38", // heri-terracotta
};

export function CompanyStrip({
  items,
  locale = "en",
}: {
  items: CompanyStripItem[];
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";

  return (
    <div
      className="grid gap-3 heri-stagger"
      style={{
        // Auto-fit wrapping: every tile keeps a readable minimum width and the
        // row wraps to a second line instead of crushing 10 companies into one
        // strip (which truncated revenue + orphaned the ops unit + clipped the
        // health pill). With few companies the tiles stretch to fill the width.
        gridTemplateColumns: "repeat(auto-fit, minmax(216px, 1fr))",
      }}
    >
      {items.map((c) => {
        const accent = RAIL[c.code] ?? RAIL_DEFAULT;
        const trendUp =
          c.revenueTrend.length >= 2
            ? c.revenueTrend[c.revenueTrend.length - 1] >= c.revenueTrend[0]
            : true;
        const tone = HEALTH_TONE[c.health];
        const healthHex = HEALTH_HEX[c.health];

        return (
          <Link
            key={c.id}
            href={`/companies/${c.id}`}
            className="heri-focusable group relative block transition"
            style={{
              background: "var(--heri-cream)",
              border: "1px solid var(--heri-rule)",
              padding: "16px 16px 14px",
              textDecoration: "none",
              color: "var(--heri-ink)",
              overflow: "hidden",
            }}
          >
            {/* Inline-start rail — single chromatic accent */}
            <span
              aria-hidden
              className="absolute top-0 bottom-0"
              style={{ insetInlineStart: 0, width: 3, background: accent }}
            />

            {/* TOP — logo + name + code */}
            <div className="ms-2 flex items-start gap-2.5">
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  width: 30,
                  height: 30,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--heri-cream-2)",
                  border: "1px solid var(--heri-rule)",
                }}
              >
                <CompanyLogo code={c.code} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={ar ? "" : "font-display-latin"}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: ar ? 0 : "-0.005em",
                    color: "var(--heri-ink)",
                    lineHeight: 1.15,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={ar ? c.name : c.nameEn}
                >
                  {ar ? c.name : c.nameEn}
                </div>
                <div
                  className="heri-eyebrow heri-eyebrow-ink mt-1"
                  style={{ fontSize: 9.5, letterSpacing: "0.16em" }}
                >
                  {c.code}
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div
              className="ms-2 mt-3"
              style={{ borderTop: "1px solid var(--heri-rule)" }}
            />

            {/* MIDDLE — revenue + sparkline */}
            <div className="ms-2 mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 9.5 }}>
                  {ar ? "إيراد" : "Revenue"}
                </div>
                <div
                  className="heri-number mt-1.5 truncate"
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--heri-ink)",
                  }}
                >
                  {formatMoney(c.revenue)}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Sparkline
                  data={c.revenueTrend}
                  width={56}
                  height={22}
                  positive={trendUp}
                  fill={false}
                />
              </div>
            </div>

            {/* BOTTOM — ops metric (label over value, never orphans the unit) + health pill */}
            <div className="ms-2 mt-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="heri-eyebrow heri-eyebrow-ink truncate"
                  style={{ fontSize: 9 }}
                  title={c.ops.label}
                >
                  {c.ops.label}
                </div>
                <div
                  className="mt-1 truncate"
                  style={{
                    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--heri-ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                  title={c.ops.value}
                >
                  {c.ops.value}
                </div>
              </div>
              <span
                className="heri-pill shrink-0"
                style={{ color: healthHex }}
                title={ar ? HEALTH_AR[c.health] : HEALTH_EN[c.health]}
              >
                {ar ? HEALTH_AR[c.health] : HEALTH_EN[c.health]}
              </span>
            </div>

            {/* HOVER REVEAL — open profile cue */}
            <div
              className="ms-2 mt-3 flex items-center justify-between heri-eyebrow opacity-0 transition group-hover:opacity-100"
              style={{ color: accent, fontSize: 10 }}
            >
              <span>{ar ? "افتح الملف" : "Open profile"}</span>
              <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
