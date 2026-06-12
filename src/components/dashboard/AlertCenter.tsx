// "What needs my attention right now?" — combines critical insights + farm
// alerts + expiring dairy batches + overdue tasks + low-occupancy hotels into
// one prioritized list. The triage list every executive should glance at first.

import Link from "next/link";
import {
  AlertTriangle, Clock, Sprout, Milk, Hotel, ListChecks, ChevronLeft, Shield,
} from "lucide-react";
import { formatRelative } from "@/lib/utils/utils";

export type AlertKind = "DAIRY_EXPIRY" | "FARM" | "HOTEL_LOW" | "TASK_OVERDUE" | "INSIGHT_CRITICAL" | "FORECAST_DRAFT";
export type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  sub: string;
  href: string;
  time?: Date;
  severity: "WARN" | "CRITICAL" | "INFO";
};

const KIND_ICON = {
  DAIRY_EXPIRY: Milk,
  FARM: Sprout,
  HOTEL_LOW: Hotel,
  TASK_OVERDUE: Clock,
  INSIGHT_CRITICAL: AlertTriangle,
  FORECAST_DRAFT: AlertTriangle,
};

export function AlertCenter({
  items,
  locale = "en",
}: {
  items: AlertItem[];
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <div
          className="flex h-9 w-9 items-center justify-center"
          style={{
            border: "1px solid var(--heri-rule)",
            color: "var(--heri-teal)",
            background: "var(--heri-cream)",
          }}
        >
          <Shield className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div
          className={ar ? "" : "font-display-latin"}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--heri-ink)",
            letterSpacing: ar ? 0 : "-0.005em",
          }}
        >
          {ar ? "كل شيء على ما يرام" : "All clear"}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 10,
            color: "var(--heri-ink-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {ar ? "لا تنبيهات حرجة" : "No critical alerts"}
        </div>
      </div>
    );
  }

  // Heritage palette only — keep the severity legible without neon
  const SEV_COLOR: Record<string, string> = {
    CRITICAL: "var(--heri-terracotta)",
    WARN:     "var(--heri-ochre-2)",
    INFO:     "var(--heri-copper)",
  };

  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const Icon = KIND_ICON[it.kind];
        const color = SEV_COLOR[it.severity] ?? "var(--heri-ink-3)";
        return (
          <li key={`${it.kind}-${it.id}`}>
            <Link
              href={it.href}
              className="heri-focusable group flex items-start gap-3 p-2.5 transition"
              style={{
                background: "var(--heri-cream)",
                border: "1px solid var(--heri-rule)",
                borderInlineStart: `2px solid ${color}`,
                textDecoration: "none",
                color: "var(--heri-ink)",
              }}
            >
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"
                style={{
                  color: color,
                  border: "1px solid var(--heri-rule)",
                  background: "var(--heri-cream-2)",
                }}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="line-clamp-1"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                    color: "var(--heri-ink)",
                    lineHeight: 1.3,
                  }}
                >
                  {it.title}
                </div>
                <div
                  className="line-clamp-1 mt-0.5"
                  style={{ fontSize: 10.5, color: "var(--heri-ink-3)", lineHeight: 1.4 }}
                >
                  {it.sub}
                  {it.time ? (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                        marginInlineStart: 6,
                      }}
                    >
                      · {formatRelative(it.time, lc as any)}
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronLeft
                className="mt-0.5 h-3.5 w-3.5 transition rtl:rotate-180 opacity-50 group-hover:opacity-100"
                style={{ color }}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
