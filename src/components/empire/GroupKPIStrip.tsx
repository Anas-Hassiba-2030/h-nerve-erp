// components/empire/GroupKPIStrip.tsx — Phase 19 (empire boardroom).
//
// The top strip: consolidated JOD revenue across every tenant, this month
// vs last, with a signed delta. Server component, pure props. Quiet Authority.

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { RevenueRollup } from "@/lib/empire/summary";

function fmtJod(n: number, ar: boolean): string {
  return n.toLocaleString(ar ? "ar-JO" : "en-US", { maximumFractionDigits: 0 });
}

export function GroupKPIStrip({ revenue, ar }: { revenue: RevenueRollup; ar: boolean }) {
  const dir = revenue.deltaPct > 0 ? "up" : revenue.deltaPct < 0 ? "down" : "flat";
  const DeltaIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const pct = Math.abs(revenue.deltaPct * 100);

  return (
    <section className="emp-strip">
      <div className="emp-strip-main">
        <span className="emp-strip-eyebrow">
          {ar ? "إيراد المجموعة · هذا الشهر" : "Group revenue · this month"}
        </span>
        <div className="emp-strip-figure">
          <span className="emp-strip-cur">{ar ? "د.أ" : "JOD"}</span>
          <span className="emp-strip-num">{fmtJod(revenue.currentMonthJod, ar)}</span>
        </div>
      </div>

      <div className="emp-strip-side">
        <div className={`emp-strip-delta`} data-dir={dir}>
          <DeltaIcon className="h-4 w-4" strokeWidth={1.6} />
          <span>{pct.toFixed(1)}%</span>
        </div>
        <span className="emp-strip-prev">
          {ar ? "الشهر الماضي" : "Last month"}: {fmtJod(revenue.lastMonthJod, ar)}{" "}
          {ar ? "د.أ" : "JOD"}
        </span>
      </div>
    </section>
  );
}
