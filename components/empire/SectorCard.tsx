// components/empire/SectorCard.tsx — Phase 19 (empire boardroom).
//
// One pulse card per vertical: sector label, company count, the sector's key
// KPI as a big tabular number, and a 6-month trend sparkline beneath. Server
// component (pure props) that embeds the client <Sparkline>. Quiet Authority
// vocabulary via the .emp-* class family.

import { Hotel, Milk, Sprout, GraduationCap } from "lucide-react";
import type { SectorSummary } from "@/lib/empire/summary";
import { Sparkline } from "./Sparkline";

const ICON = {
  HOSPITALITY: Hotel,
  DAIRY: Milk,
  AGRICULTURE: Sprout,
  EDUCATION: GraduationCap,
} as const;

export function SectorCard({ sector, ar }: { sector: SectorSummary; ar: boolean }) {
  const Icon = ICON[sector.key];
  const kpiUnit = ar ? sector.kpiUnitAr : sector.kpiUnitEn;
  return (
    <article className="emp-sector">
      <header className="emp-sector-head">
        <span className="emp-sector-mark">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{ar ? sector.labelAr : sector.labelEn}</span>
        </span>
        <span className="emp-sector-count">
          {sector.companyCount} {ar ? "وحدة" : sector.companyCount === 1 ? "unit" : "units"}
        </span>
      </header>

      <div className="emp-sector-kpi">
        <span className="emp-sector-kpi-num">
          {sector.kpiValue.toLocaleString(ar ? "ar-JO" : "en-US")}
        </span>
        <span className="emp-sector-kpi-unit">{kpiUnit}</span>
      </div>
      <span className="emp-sector-kpi-label">
        {ar ? sector.kpiLabelAr : sector.kpiLabelEn}
      </span>

      <div className="emp-sector-spark">
        <Sparkline data={sector.spark} />
      </div>
    </article>
  );
}
