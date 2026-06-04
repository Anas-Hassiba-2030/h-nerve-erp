// StatusBadge — Heritage Modern variant.
// Maps every domain status onto one of 5 Heritage tones using the current-color
// dot pattern from `.heri-pill`. See docs/DESIGN-SKILL.md §5.2.
//
// BILINGUAL: the label flips AR/EN. Locale comes from the optional `locale`
// prop; when omitted it reads the h_nerve_locale cookie (server component) so
// the label is correct on every page without touching call sites. Previously it
// always rendered Arabic via ar(), which leaked Arabic in English mode.

import { loc, STATUS_AR, STATUS_EN } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";

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
  COMPLETED: "neutral", CHECKED_OUT: "neutral", REJECTED: "critical",
  // Drafts / dormant
  DRAFT: "neutral", INTAKE: "neutral", PAUSED: "neutral",
  ARCHIVED: "neutral", CLOSED: "neutral",
};

export function StatusBadge({ status, locale }: { status: string; locale?: "ar" | "en" }) {
  const lc = locale ?? getLocale();
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
      {loc(STATUS_AR, STATUS_EN, lc, status)}
    </span>
  );
}
