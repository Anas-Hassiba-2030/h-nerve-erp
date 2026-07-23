"use client";

// SectorStrip — the dashboard's "units at a glance" band, rolled up to the
// FIVE real businesses (sectors) instead of a flat wall of 10 near-identical
// company/unit cards. Clicking a sector card drills in: its member units
// render below as the existing CompanyStrip tiles (each still entering its
// workspace). One vocabulary, Heritage Modern — mirrors CompanyStrip's tile.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { CompanyStrip, type CompanyStripItem } from "./CompanyStrip";
import { formatMoney } from "@/lib/utils/utils";

export type SectorGroup = {
  id: string;        // sector key (HOSPITALITY, …)
  name: string;      // Arabic label
  nameEn: string;    // English label
  code: string;      // representative company code → rail accent + logo
  revenue: number;   // aggregated, in the active period
  revenueTrend: number[];
  ops: { label: string; value: string };
  health: "OK" | "WARN" | "CRITICAL" | "NONE";
  units: CompanyStripItem[];
};

// Single chromatic accent per sector — drawn from the Heritage palette,
// keyed by the representative company code (matches CompanyStrip's RAIL).
const RAIL: Record<string, string> = {
  HH: "var(--heri-terracotta)",
  ARENA: "var(--heri-ochre)",
  MAHA: "var(--heri-copper)",
  LORAN: "var(--heri-teal)",
  AAU: "var(--heri-ink)",
};
const RAIL_DEFAULT = "var(--heri-rule-strong)";

const HEALTH_AR: Record<string, string> = { OK: "صحي", WARN: "تنبيه", CRITICAL: "حرج", NONE: "لا نشاط" };
const HEALTH_EN: Record<string, string> = { OK: "Healthy", WARN: "Watch", CRITICAL: "Critical", NONE: "No activity" };
const HEALTH_HEX: Record<string, string> = {
  OK: "#1f4e4a", WARN: "#a87a32", CRITICAL: "#b85c38", NONE: "#8a8175",
};

export function SectorStrip({
  groups,
  locale = "en",
}: {
  groups: SectorGroup[];
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const [openId, setOpenId] = useState<string | null>(null);
  const open = groups.find((g) => g.id === openId) ?? null;

  return (
    <div className="grid gap-3">
      <div
        className="grid gap-3 heri-stagger"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(216px, 1fr))" }}
      >
        {groups.map((g) => {
          const accent = RAIL[g.code] ?? RAIL_DEFAULT;
          const trendUp =
            g.revenueTrend.length >= 2
              ? g.revenueTrend[g.revenueTrend.length - 1] >= g.revenueTrend[0]
              : true;
          const isOpen = g.id === openId;
          const healthHex = HEALTH_HEX[g.health];
          const unitWord = ar
            ? `${g.units.length} وحدة`
            : `${g.units.length} unit${g.units.length === 1 ? "" : "s"}`;

          return (
            <button
              key={g.id}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : g.id)}
              className="heri-focusable group relative block w-full transition"
              style={{
                background: isOpen ? "var(--heri-cream-2)" : "var(--heri-cream)",
                border: "1px solid var(--heri-rule)",
                boxShadow: isOpen ? `inset 0 0 0 1px ${accent}` : undefined,
                padding: "16px 16px 14px",
                textAlign: "start",
                font: "inherit",
                color: "var(--heri-ink)",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {/* Inline-start rail — single chromatic accent */}
              <span
                aria-hidden
                className="absolute top-0 bottom-0"
                style={{ insetInlineStart: 0, width: 3, background: accent }}
              />

              {/* TOP — logo + sector name + "Sector" eyebrow */}
              <div className="ms-2 flex items-start gap-2.5">
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex", width: 30, height: 30,
                    alignItems: "center", justifyContent: "center",
                    background: "var(--heri-cream-2)", border: "1px solid var(--heri-rule)",
                  }}
                >
                  <CompanyLogo code={g.code} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={ar ? "" : "font-display-latin"}
                    style={{
                      fontSize: 13, fontWeight: 600,
                      letterSpacing: ar ? 0 : "-0.005em",
                      color: "var(--heri-ink)", lineHeight: 1.15,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                    title={ar ? g.name : g.nameEn}
                  >
                    {ar ? g.name : g.nameEn}
                  </div>
                  <div className="heri-eyebrow heri-eyebrow-ink mt-1" style={{ fontSize: 12, letterSpacing: "0.16em" }}>
                    {unitWord}
                  </div>
                </div>
              </div>

              {/* DIVIDER */}
              <div className="ms-2 mt-3" style={{ borderTop: "1px solid var(--heri-rule)" }} />

              {/* MIDDLE — aggregated revenue + sparkline */}
              <div className="ms-2 mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 12 }}>
                    {ar ? "إيراد" : "Revenue"}
                  </div>
                  <div className="heri-number mt-1.5 truncate" style={{ fontSize: 18, fontWeight: 500, color: "var(--heri-ink)" }}>
                    {formatMoney(g.revenue)}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <Sparkline data={g.revenueTrend} width={56} height={22} positive={trendUp} fill={false} />
                </div>
              </div>

              {/* BOTTOM — ops metric + health pill */}
              <div className="ms-2 mt-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="heri-eyebrow heri-eyebrow-ink truncate" style={{ fontSize: 12 }} title={g.ops.label}>
                    {g.ops.label}
                  </div>
                  <div
                    className="mt-1 truncate"
                    style={{
                      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: 12.5, fontWeight: 600, color: "var(--heri-ink)", fontVariantNumeric: "tabular-nums",
                    }}
                    title={g.ops.value}
                  >
                    {g.ops.value}
                  </div>
                </div>
                <span className="heri-pill shrink-0" style={{ color: healthHex }} title={ar ? HEALTH_AR[g.health] : HEALTH_EN[g.health]}>
                  {ar ? HEALTH_AR[g.health] : HEALTH_EN[g.health]}
                </span>
              </div>

              {/* DRILL CUE */}
              <div
                className="ms-2 mt-3 flex items-center justify-between heri-eyebrow transition"
                style={{ color: accent, fontSize: 12, opacity: isOpen ? 1 : 0.65 }}
              >
                <span>{isOpen ? (ar ? "إخفاء الوحدات" : "Hide units") : (ar ? "عرض الوحدات" : "View units")}</span>
                <ChevronDown className="h-3 w-3 transition" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* DRILL PANEL — the open sector's member units, as the existing tiles */}
      {open ? (
        <div
          className="grid gap-2"
          style={{ borderTop: "1px solid var(--heri-rule)", paddingTop: 12 }}
        >
          <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 12, letterSpacing: "0.16em" }}>
            {ar ? `وحدات ${open.name}` : `${open.nameEn} units`}
          </div>
          <CompanyStrip items={open.units} locale={locale} />
        </div>
      ) : null}
    </div>
  );
}
