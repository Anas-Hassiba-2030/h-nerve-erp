// Pure helpers for period selection — usable from both server and client.

export type Period = "24H" | "7D" | "30D" | "QTD" | "YTD";

export function periodToRange(p: Period): { start: Date; end: Date; label: string; days: number } {
  const now = new Date();
  const end = now;
  let start: Date;
  let days: number;
  switch (p) {
    case "24H": start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); days = 1; break;
    case "7D":  start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); days = 7; break;
    case "QTD": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      days = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      break;
    }
    case "YTD":
      start = new Date(now.getFullYear(), 0, 1);
      days = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      break;
    case "30D":
    default: start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); days = 30; break;
  }
  return { start, end, label: p, days };
}

const VALID = new Set<Period>(["24H", "7D", "30D", "QTD", "YTD"]);
export function isValidPeriod(v: string | undefined | null): Period {
  if (v && VALID.has(v as Period)) return v as Period;
  return "30D";
}

// Human, owner-readable period label (vs the raw "30D"/"QTD" codes). Used so
// the hero KPIs read "Revenue · last 30 days" and reconcile with the 12-month
// "Financial pulse" instead of an unexplained code.
export function periodLabel(p: Period, ar: boolean): string {
  const en: Record<Period, string> = {
    "24H": "last 24 hours", "7D": "last 7 days", "30D": "last 30 days",
    "QTD": "this quarter", "YTD": "year to date",
  };
  const arr: Record<Period, string> = {
    "24H": "آخر ٢٤ ساعة", "7D": "آخر ٧ أيام", "30D": "آخر ٣٠ يوماً",
    "QTD": "هذا الربع", "YTD": "منذ بداية السنة",
  };
  return ar ? arr[p] : en[p];
}
