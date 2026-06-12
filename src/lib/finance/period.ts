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
