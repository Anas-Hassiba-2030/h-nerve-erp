// app/empire/page.tsx — Phase 19 The Empire Dashboard (holding-company view).
//
// A consolidated cross-tenant god-view: one JOD revenue rollup, four sector
// pulse cards (each with a 6-month trend sparkline), the live council feed,
// the top causal drivers, and brain activity by tenant. Quiet Authority
// aesthetic, Arabic-first / RTL.
//
// Data is fetched server-side via getEmpireSummary() directly — the same
// aggregator that GET /api/empire/summary wraps. We render SSR rather than
// self-fetch our own API (idiomatic Next.js; mirrors /admin/empire). The API
// route exists for client components and external consumers, per the spec.
//
// Auth + EXECUTIVE gate live in app/empire/layout.tsx.
//
// Phase 19 of docs/PHASES-INTELLIGENCE.md.

import { Crown } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getEmpireSummary } from "@/lib/empire/summary";
import { GroupKPIStrip } from "@/components/empire/GroupKPIStrip";
import { SectorCard } from "@/components/empire/SectorCard";
import { CouncilFeed } from "@/components/empire/CouncilFeed";
import { CausalDriverList } from "@/components/empire/CausalDriverList";
import { BrainActivity } from "@/components/empire/BrainActivity";

export const dynamic = "force-dynamic";

export default async function EmpirePage() {
  const ar = (await getLocale()) === "ar";
  const data = await getEmpireSummary();

  const businessCount = data.sectors.reduce((s, x) => s + x.companyCount, 0);

  return (
    <main className="emp-root">
      <header className="emp-head">
        <div className="emp-head-mark">
          <Crown className="h-3.5 w-3.5" strokeWidth={1.4} />
          <span>{ar ? "مجلس الإمبراطورية" : "EMPIRE BOARDROOM"}</span>
        </div>
        <h1 className="emp-head-title">
          {ar
            ? "أربعة قطاعات. مجموعة واحدة. شاشة واحدة."
            : "Four sectors. One group. One screen."}
        </h1>
        <p className="emp-head-sub">
          {ar
            ? "الإيراد الموحّد، نبض كل قطاع، وآخر ما فكّر به الدماغ — عبر كل الوحدات."
            : "Consolidated revenue, each sector's pulse, and what the brain last reasoned — across every unit."}
        </p>
        <div className="emp-head-stats">
          <Stat label={ar ? "وحدات الأعمال" : "BUSINESSES"} value={businessCount} />
          <Stat label={ar ? "قطاعات" : "SECTORS"} value={data.sectors.length} />
          <Stat
            label={ar ? "جلسات نقاش" : "COUNCIL"}
            value={data.council.length}
          />
          <Stat
            label={ar ? "تشغيلات / ٧ أيام" : "RUNS / 7d"}
            value={data.brainActivity.totalRuns7d}
            accent
          />
        </div>
      </header>

      {/* Top strip — consolidated revenue */}
      <GroupKPIStrip revenue={data.revenue} ar={ar} />

      {/* Four sector pulse cards */}
      <div className="emp-sectors-grid">
        {data.sectors.map((s) => (
          <SectorCard key={s.key} sector={s} ar={ar} />
        ))}
      </div>

      {/* Three intelligence panels */}
      <div className="emp-panels-grid">
        <CouncilFeed items={data.council} ar={ar} />
        <CausalDriverList drivers={data.drivers} ar={ar} />
        <BrainActivity
          total={data.brainActivity.totalRuns7d}
          byScope={data.brainActivity.byScope}
          ar={ar}
        />
      </div>

      <p className="emp-foot">
        {ar
          ? "رؤية موحّدة عبر كل المستأجرين. كل رقم منسوب لوحدته — لا تتسرّب بيانات بين الكيانات."
          : "A unified view across every tenant. Each number is attributed to its unit — no data bleeds between entities."}
      </p>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`emp-stat ${accent ? "is-accent" : ""}`}>
      <div className="emp-stat-label">{label}</div>
      <div className="emp-stat-value">{value.toLocaleString()}</div>
    </div>
  );
}
