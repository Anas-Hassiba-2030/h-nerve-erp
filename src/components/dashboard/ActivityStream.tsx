// Mixed activity stream — pulls Insights, Forecasts, Bookings into one
// chronological feed. Each row has an icon, severity-tinted background dot,
// title, sub-line, time-ago. Click → drill into source page.

import Link from "next/link";
import {
  Sparkles, Brain, Hotel, AlertTriangle, Lightbulb, Info, Activity,
} from "lucide-react";
import { formatRelative } from "@/lib/utils/utils";

export type ActivityKind = "INSIGHT" | "FORECAST" | "BOOKING" | "TASK";
export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  severity?: "INFO" | "WARN" | "CRITICAL" | "OPPORTUNITY";
  title: string;
  sub: string;
  href: string;
  time: Date;
};

const KIND_ICON = {
  INSIGHT: Sparkles,
  FORECAST: Brain,
  BOOKING: Hotel,
  TASK: Activity,
};
// Heritage palette only — single chromatic accent per row, no neon, no purple/blue
const SEV_COLOR: Record<string, string> = {
  INFO:        "var(--heri-copper)",
  WARN:        "var(--heri-ochre-2)",
  CRITICAL:    "var(--heri-terracotta)",
  OPPORTUNITY: "var(--heri-ochre)",
};
const KIND_COLOR: Record<string, string> = {
  INSIGHT:  "var(--heri-copper)",
  FORECAST: "var(--heri-teal)",
  BOOKING:  "var(--heri-ochre)",
  TASK:     "var(--heri-rose)",
};

export function ActivityStream({
  items,
  locale = "en",
}: {
  items: ActivityItem[];
  locale?: "ar" | "en";
}) {
  const lc = locale === "ar" ? "ar" : "en";
  if (items.length === 0) {
    return (
      <div
        className="py-6 text-center"
        style={{ color: "var(--heri-ink-3)", fontSize: 12.5, fontStyle: "italic" }}
      >
        {locale === "ar" ? "لا نشاط حديث" : "No recent activity"}
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const Icon = KIND_ICON[it.kind];
        const color = it.severity ? SEV_COLOR[it.severity] : KIND_COLOR[it.kind];
        return (
          <li key={`${it.kind}-${it.id}`}>
            <Link
              href={it.href}
              className="heri-focusable group flex items-start gap-3 px-2 py-2 transition"
              style={{
                textDecoration: "none",
                borderInlineStart: "2px solid transparent",
              }}
            >
              {/* Inline-start rail appears on hover — single accent */}
              <span
                aria-hidden
                className="absolute opacity-0 transition group-hover:opacity-100"
              />
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"
                style={{
                  color: color,
                  border: "1px solid var(--heri-rule)",
                  background: "var(--heri-cream)",
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
                  style={{ fontSize: 12, color: "var(--heri-ink-3)", lineHeight: 1.35 }}
                >
                  {it.sub}
                </div>
              </div>
              <span
                className="shrink-0 mt-0.5"
                style={{
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  color: "var(--heri-ink-3)",
                  textTransform: "uppercase",
                }}
                title={it.time.toString()}
              >
                {formatRelative(it.time, lc as any)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
