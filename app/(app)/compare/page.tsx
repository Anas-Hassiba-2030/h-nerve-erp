export const dynamic = "force-dynamic";
// Side-by-side company comparison view, daylight design.

import Link from "next/link";
import { ArrowLeftRight, ChevronLeft } from "lucide-react";
import { CompanyCover } from "@/components/CompanyCover";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import {
  DaylightShell, DaylightHeader, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";
import { formatMoney, formatNumber, SECTORS_AR, SECTORS_EN, loc } from "@/lib/utils";
import "../daylight.css";

export default async function ComparePage({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const ar = getLocale() === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const [companies, transactions, esg, allFarms, allHotels, allDairy, allPrograms, allForecasts] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } }),
    prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }] }),
    prisma.farm.findMany(), prisma.hotel.findMany(), prisma.dairyBatch.findMany(), prisma.program.findMany(), prisma.supplyForecast.findMany(),
  ]);

  const computed = companies.map((c) => {
    const ctx = transactions.filter((t) => t.companyId === c.id);
    return { id: c.id, revenue: ctx.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0) };
  });
  const sortedByRev = [...computed].sort((a, b) => b.revenue - a.revenue);
  const aId = searchParams.a || sortedByRev[0]?.id;
  const bId = searchParams.b || sortedByRev[1]?.id;
  const A = companies.find((c) => c.id === aId);
  const B = companies.find((c) => c.id === bId);

  function deepDive(c: typeof companies[number]) {
    const ctx = transactions.filter((t) => t.companyId === c.id);
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const trend: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getTime() - (i + 1) * monthMs);
      const to = new Date(now.getTime() - i * monthMs);
      trend.push(ctx.filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to).reduce((a, t) => a + t.amount, 0));
    }
    const revenue = ctx.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0);
    const expense = ctx.filter((t) => t.kind === "EXPENSE").reduce((a, t) => a + t.amount, 0);
    const net = revenue - expense;
    return {
      trend, revenue, expense, net, margin: revenue > 0 ? net / revenue : 0,
      lastEsg: [...esg].reverse().find((s) => s.companyId === c.id)?.overall ?? 0,
      employees: c.employees,
      hotels: allHotels.filter((h) => h.companyId === c.id).length,
      farms: allFarms.filter((f) => f.companyId === c.id).length,
      dairyBatches: allDairy.filter((d) => d.companyId === c.id).length,
      forecasts: allForecasts.filter((f) => f.sourceCompanyId === c.id || f.targetCompanyId === c.id).length,
    };
  }

  const dA = A ? deepDive(A) : null;
  const dB = B ? deepDive(B) : null;
  const brandA = A ? getCompanyBrand(A.code) : null;
  const brandB = B ? getCompanyBrand(B.code) : null;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "التحليلات · مقارنة" : "Analytics · Compare"}
        title={ar ? "مقارنة شركتين" : "Compare Two Companies"}
        subtitle={ar ? "اختر شركتين لمقارنة أدائهما جنباً إلى جنب — الإيرادات، الهامش، ESG، البصمة التشغيلية." : "Pick two companies and compare performance side-by-side — revenue, margin, ESG, ops footprint."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CompanyPicker companies={companies} current={aId} other={bId} otherKey="b" mineKey="a" label={ar ? "أ" : "A"} ar={ar} />
            <ArrowLeftRight className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
            <CompanyPicker companies={companies} current={bId} other={aId} otherKey="a" mineKey="b" label={ar ? "ب" : "B"} ar={ar} />
          </div>
        }
      />

      {!A || !B || !dA || !dB || !brandA || !brandB ? (
        <div className="panel reveal" style={{ textAlign: "center", color: "var(--ink-muted)" }}>{ar ? "اختر شركتين لرؤية المقارنة." : "Pick two companies to see the comparison."}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 reveal">
            <CompanyCover code={A.code} metrics={[{ label: ar ? "إيراد ١٢ش" : "Revenue 12mo", value: formatMoney(dA.revenue) }, { label: ar ? "صافي" : "Net", value: formatMoney(dA.net) }, { label: "ESG", value: dA.lastEsg ? dA.lastEsg.toFixed(1) : "—" }]} />
            <CompanyCover code={B.code} metrics={[{ label: ar ? "إيراد ١٢ش" : "Revenue 12mo", value: formatMoney(dB.revenue) }, { label: ar ? "صافي" : "Net", value: formatMoney(dB.net) }, { label: "ESG", value: dB.lastEsg ? dB.lastEsg.toFixed(1) : "—" }]} />
          </div>

          <DaylightPanel title={ar ? "اتجاه الإيرادات (١٢ شهر)" : "Revenue trend (12 months)"} aside={ar ? "منحنيا الشركتين" : "Both companies' curves"}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-2" style={{ fontSize: 11, fontWeight: 700 }}><span style={{ display: "block", height: 8, width: 16, borderRadius: 999, background: brandA.accent }} /><span style={{ color: "var(--ink)" }}>{ar ? A.name : A.nameEn}</span></div>
                <AreaLineChart data={dA.trend} height={140} color={brandA.accent} formatY={(v) => formatMoney(v)} />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2" style={{ fontSize: 11, fontWeight: 700 }}><span style={{ display: "block", height: 8, width: 16, borderRadius: 999, background: brandB.accent }} /><span style={{ color: "var(--ink)" }}>{ar ? B.name : B.nameEn}</span></div>
                <AreaLineChart data={dB.trend} height={140} color={brandB.accent} formatY={(v) => formatMoney(v)} />
              </div>
            </div>
          </DaylightPanel>

          <DaylightPanel title={ar ? "المقارنة المباشرة" : "Head-to-head"} aside={ar ? "المقياس لكلا الشركتين + الفائز" : "Each metric for both + the winner"}>
            <div>
              <CompareRow label={ar ? "القطاع" : "Sector"} a={loc(SECTORS_AR, SECTORS_EN, lc, A.sector)} b={loc(SECTORS_AR, SECTORS_EN, lc, B.sector)} noWinner />
              <CompareRow label={ar ? "الإيرادات (١٢ش)" : "Revenue (12mo)"} a={formatMoney(dA.revenue)} b={formatMoney(dB.revenue)} numA={dA.revenue} numB={dB.revenue} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "المصاريف" : "Expenses"} a={formatMoney(dA.expense)} b={formatMoney(dB.expense)} numA={-dA.expense} numB={-dB.expense} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "الصافي" : "Net"} a={formatMoney(dA.net)} b={formatMoney(dB.net)} numA={dA.net} numB={dB.net} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "هامش الربح" : "Profit margin"} a={`${(dA.margin * 100).toFixed(1)}%`} b={`${(dB.margin * 100).toFixed(1)}%`} numA={dA.margin} numB={dB.margin} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label="ESG" a={dA.lastEsg ? dA.lastEsg.toFixed(1) : "—"} b={dB.lastEsg ? dB.lastEsg.toFixed(1) : "—"} numA={dA.lastEsg} numB={dB.lastEsg} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "موظفون" : "Employees"} a={formatNumber(dA.employees)} b={formatNumber(dB.employees)} numA={dA.employees} numB={dB.employees} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "فنادق" : "Hotels"} a={formatNumber(dA.hotels)} b={formatNumber(dB.hotels)} numA={dA.hotels} numB={dB.hotels} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "مزارع" : "Farms"} a={formatNumber(dA.farms)} b={formatNumber(dB.farms)} numA={dA.farms} numB={dB.farms} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "دفعات ألبان" : "Dairy batches"} a={formatNumber(dA.dairyBatches)} b={formatNumber(dB.dairyBatches)} numA={dA.dairyBatches} numB={dB.dairyBatches} brandA={brandA.accent} brandB={brandB.accent} />
              <CompareRow label={ar ? "إشارات تنبؤ" : "Forecasts"} a={formatNumber(dA.forecasts)} b={formatNumber(dB.forecasts)} numA={dA.forecasts} numB={dB.forecasts} brandA={brandA.accent} brandB={brandB.accent} />
            </div>
          </DaylightPanel>

          <div className="grid gap-3 md:grid-cols-2">
            <Link href={`/companies/${A.id}`} className="prop-card flex items-center justify-between" style={{ padding: "14px 18px" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{ar ? `ملف ${A.name} الكامل` : `${A.nameEn} full profile`}</span><ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--gold)" }} /></Link>
            <Link href={`/companies/${B.id}`} className="prop-card flex items-center justify-between" style={{ padding: "14px 18px" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{ar ? `ملف ${B.name} الكامل` : `${B.nameEn} full profile`}</span><ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--gold)" }} /></Link>
          </div>
        </>
      )}
    </DaylightShell>
  );
}

function CompanyPicker({ companies, current, other, otherKey, mineKey, label, ar }: { companies: Array<{ id: string; name: string; nameEn: string }>; current?: string; other?: string; otherKey: "a" | "b"; mineKey: "a" | "b"; label: string; ar: boolean }) {
  return (
    <form className="inline-flex items-center gap-1.5" method="get" action="/compare">
      {other ? <input type="hidden" name={otherKey} value={other} /> : null}
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{label}</span>
      <select name={mineKey} defaultValue={current ?? ""} style={{ minWidth: 150, padding: "7px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--cream)", color: "var(--ink)", fontSize: 13 }}>
        {companies.map((c) => (<option key={c.id} value={c.id} disabled={c.id === other}>{ar ? c.name : c.nameEn}</option>))}
      </select>
      <button type="submit" className="dl-btn dl-btn-secondary" style={{ padding: "7px 12px" }}>↻</button>
    </form>
  );
}

function CompareRow({ label, a, b, numA, numB, brandA, brandB, noWinner }: { label: string; a: string; b: string; numA?: number; numB?: number; brandA?: string; brandB?: string; noWinner?: boolean }) {
  const winnerA = !noWinner && numA != null && numB != null && numA > numB;
  const winnerB = !noWinner && numA != null && numB != null && numB > numA;
  return (
    <div className="grid items-center gap-3" style={{ gridTemplateColumns: "1fr auto 1fr", padding: "11px 6px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ textAlign: "end" }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: winnerA ? 700 : 400, color: winnerA ? (brandA ?? "var(--gold)") : "var(--ink)" }}>{a}</span>
        {winnerA ? <span style={{ marginInlineStart: 6, display: "inline-block", height: 6, width: 6, borderRadius: 999, background: brandA }} /> : null}
      </div>
      <span style={{ textAlign: "center", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--ink-muted)" }}>{label}</span>
      <div style={{ textAlign: "start" }}>
        {winnerB ? <span style={{ marginInlineEnd: 6, display: "inline-block", height: 6, width: 6, borderRadius: 999, background: brandB }} /> : null}
        <span style={{ fontFamily: "monospace", fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: winnerB ? 700 : 400, color: winnerB ? (brandB ?? "var(--gold)") : "var(--ink)" }}>{b}</span>
      </div>
    </div>
  );
}
