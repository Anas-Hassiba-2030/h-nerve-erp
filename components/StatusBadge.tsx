// StatusBadge — Heritage Modern variant.
// Maps every domain status onto one of 5 Heritage tones using the current-color
// dot pattern from `.heri-pill`. See docs/DESIGN-SKILL.md §5.2.

import { ar, STATUS_AR } from "@/lib/utils";

type Tone = "success" | "warn" | "critical" | "info" | "neutral";

const STATUS_TONE: Record<string, Tone> = {
  // Healthy / completed / approved
  ACTIVE: "success", READY: "success", DISTRIBUTED: "success",
  HARVESTED: "success", CONFIRMED: "success", CHECKED_IN: "success",
  APPROVED: "success", OK: "success", GRADUATED: "success",
  // In motion / informational
  EXECUTED: "info", GROWING: "info", ACCELERATING: "info", IN_PRODUCTION: "info",
  // Warning / pending
  RAMPING: "warn", PENDING: "warn", QC: "warn",
  HARVESTING: "warn", WARN: "warn",
  // Critical
  CRITICAL: "critical", CANCELLED: "critical", RECALLED: "critical",
  CHECKED_OUT: "neutral", REJECTED: "critical",
  // Drafts / dormant
  DRAFT: "neutral", INTAKE: "neutral", PAUSED: "neutral",
  ARCHIVED: "neutral", CLOSED: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = STATUS_TONE[status] ?? "neutral";
  const color: Record<Tone, string> = {
    success:  "var(--heri-teal)",
    warn:     "var(--heri-ochre-2)",
    critical: "var(--heri-terracotta)",
    info:     "var(--heri-copper)",
    neutral:  "var(--heri-ink-3)",
  };
  return (
    <span className="heri-pill" style={{ color: color[tone] }}>
      {ar(STATUS_AR, status)}
    </span>
  );
}
