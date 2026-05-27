// Side-by-side company comparison view.
// Pick 2 companies via search-param and see their metrics, ESG, trend, and
// operational footprint laid out in matched columns for at-a-glance contrast.

import Link from "next/link";
import { ArrowLeftRight, ChevronLeft, Hotel, Milk, Sprout, Users2, Wallet, Leaf, Brain } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { CompanyCover } from "@/components/CompanyCover";
import { SectorPill } from "@/components/SectorPill";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BenchmarkBar } from "@/components/BenchmarkBar";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";
import { formatMoney, formatNumber, formatPercent, ar as arDict, SECTORS_AR, SECTORS_EN, loc } from "@/lib/utils";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const ar = getLocale() === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const [companies, transactions, esg, allFarms, allHotels, allDairy, allPrograms, allForecasts] =
    await Promise.all([
      prisma.company.findMany({ orderBy: { name: "asc" } }),
      prisma.transaction.findMany({
        where: { occurredAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }] }),
      prisma.farm.findMany(),
      prisma.hotel.findMany(),
      prisma.dairyBatch.findMany(),
      prisma.program.findMany(),
      prisma.supplyForecast.findMany(),
    ]);

  // Default selection: top-2 by revenue
  const computed = companies.map((c) => {
    const ctx = transactions.filter((t) => t.companyId === c.id);
    const revenue = ctx.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0);
    return { id: c.id, code: c.code, revenue };
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
      trend.push(
        ctx
          .filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to)
          .reduce((a, t) => a + t.amount, 0)
      );
    }
    const revenue = ctx.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0);
    const expense = ctx.filter((t) => t.kind === "EXPENSE").reduce((a, t) => a + t.amount, 0);
    const net = revenue - expense;
    const margin = revenue > 0 ? net / revenue : 0;
    const lastEsg = [...esg].reverse().find((s) => s.companyId === c.id)?.overall ?? 0;
    return {
      trend,
      revenue,
      expense,
      net,
      margin,
      lastEsg,
      employees: c.employees,
      hotels: allHotels.filter((h) => h.companyId === c.id).length,
      farms: allFarms.filter((f) => f.companyId === c.id).length,
      dairyBatches: allDairy.filter((d) => d.companyId === c.id).length,
      programs: allPrograms.filter((p) => p.companyId === c.id).length,
      forecastsOut: allForecasts.filter((f) => f.sourceCompanyId === c.id).length,
      forecastsIn: allForecasts.filter((f) => f.targetCompanyId === c.id).length,
    };
  }

  const dA = A ? deepDive(A) : null;
  const dB = B ? deepDive(B) : null;
  const brandA = A ? getCompanyBrand(A.code) : null;
  const brandB = B ? getCompanyBrand(B.code) : null;

  return (
    <>
      <Topbar
        eyebrow={ar ? "التحليلات" : "Analytics"}
        title={ar ? "مقارنة شركتين" : "Compare two companies"}
        subtitle={ar
          ? "اختر شركتين من القائمة لمقارنة أدائهما جنباً إلى جنب — الإيرادات، الهامش، ESG، البصمة التشغيلية."
          : "Pick two companies and compare their performance side-by-side — revenue, margin, ESG, ops footprint."}
        breadcrumbs={[
          { href: "/dashboard", label: ar ? "اللوحة" : "Dashboard" },
          { href: "/analytics", label: ar ? "التحليلات" : "Analytics" },
          { href: "/compare", label: ar ? "مقارنة" : "Compare" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CompanyPicker companies={companies} current={aId} other={bId} otherKey="b" mineKey="a" label={ar ? "الشركة A" : "Company A"} />
            <ArrowLeftRight className="h-4 w-4" style={{ color: "var(--heri-ink-3)" }} />
            <CompanyPicker companies={companies} current={bId} other={aId} otherKey="a" mineKey="b" label={ar ? "الشركة B" : "Company B"} />
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-6 px-6 py-6">
        {!A || !B || !dA || !dB || !brandA || !brandB ? (
          <div className="card card-pad text-center text-sm" style={{ color: "var(--heri-ink-3)" }}>
            {ar ? "اختر شركتين لرؤية المقارنة." : "Pick two companies to see the comparison."}
          </div>
        ) : (
          <>
            {/* Hero strip — both covers next to each other */}
            <div className="grid gap-4 md:grid-cols-2">
              <CompanyCover
                code={A.code}
                metrics={[
                  { label: ar ? "إيراد 12ش" : "Revenue 12mo", value: formatMoney(dA.revenue) },
                  { label: ar ? "صافي" : "Net", value: formatMoney(dA.net) },
                  { label: "ESG", value: dA.lastEsg ? dA.lastEsg.toFixed(1) : "—" },
                ]}
              />
              <CompanyCover
                code={B.code}
                metrics={[
                  { label: ar ? "إيراد 12ش" : "Revenue 12mo", value: formatMoney(dB.revenue) },
                  { label: ar ? "صافي" : "Net", value: formatMoney(dB.net) },
                  { label: "ESG", value: dB.lastEsg ? dB.lastEsg.toFixed(1) : "—" },
                ]}
              />
            </div>

            {/* Trend comparison */}
            <section className="card card-pad">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold" style={{ color: "var(--heri-ink)" }}>
                    {ar ? "اتجاه الإيرادات (12 شهر)" : "Revenue trend (12 months)"}
                  </h3>
                  <p className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                    {ar ? "تراكب لمنحنيي الشركتين" : "Overlay of both companies' curves"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-bold">
                    <span
                      className="block h-2 w-4 rounded-full"
                      style={{ background: brandA.accent }}
                    />
                    <span style={{ color: "var(--heri-ink)" }}>{A.name}</span>
                  </div>
                  <AreaLineChart
                    data={dA.trend}
                    height={140}
                    color={brandA.accent}
                    formatY={(v) => formatMoney(v)}
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-bold">
                    <span
                      className="block h-2 w-4 rounded-full"
                      style={{ background: brandB.accent }}
                    />
                    <span style={{ color: "var(--heri-ink)" }}>{B.name}</span>
                  </div>
                  <AreaLineChart
                    data={dB.trend}
                    height={140}
                    color={brandB.accent}
                    formatY={(v) => formatMoney(v)}
                  />
                </div>
              </div>
            </section>

            {/* Side-by-side metrics table */}
            <section className="card overflow-hidden">
              <div className="card-header">
                <div>
                  <div className="card-title">{ar ? "المقارنة المباشرة" : "Head-to-head"}</div>
                  <div className="card-sub">
                    {ar ? "كل صف يعرض المقياس لكلا الشركتين والفائز" : "Each row shows the metric for both, plus the winner"}
                  </div>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
                <CompareRow
                  label={ar ? "القطاع" : "Sector"}
                  a={loc(SECTORS_AR, SECTORS_EN, lc, A.sector)}
                  b={loc(SECTORS_AR, SECTORS_EN, lc, B.sector)}
                  noWinner
                />
                <CompareRow
                  label={ar ? "الإيرادات (12ش)" : "Revenue (12mo)"}
                  a={formatMoney(dA.revenue)} b={formatMoney(dB.revenue)}
                  numA={dA.revenue} numB={dB.revenue}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "المصاريف" : "Expenses"}
                  a={formatMoney(dA.expense)} b={formatMoney(dB.expense)}
                  numA={-dA.expense} numB={-dB.expense}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "الصافي" : "Net"}
                  a={formatMoney(dA.net)} b={formatMoney(dB.net)}
                  numA={dA.net} numB={dB.net}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "هامش الربح" : "Profit margin"}
                  a={`${(dA.margin * 100).toFixed(1)}%`} b={`${(dB.margin * 100).toFixed(1)}%`}
                  numA={dA.margin} numB={dB.margin}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label="ESG"
                  a={dA.lastEsg ? dA.lastEsg.toFixed(1) : "—"}
                  b={dB.lastEsg ? dB.lastEsg.toFixed(1) : "—"}
                  numA={dA.lastEsg} numB={dB.lastEsg}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "موظفون" : "Employees"}
                  a={formatNumber(dA.employees)} b={formatNumber(dB.employees)}
                  numA={dA.employees} numB={dB.employees}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "فنادق" : "Hotels"}
                  a={formatNumber(dA.hotels)} b={formatNumber(dB.hotels)}
                  numA={dA.hotels} numB={dB.hotels}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "مزارع" : "Farms"}
                  a={formatNumber(dA.farms)} b={formatNumber(dB.farms)}
                  numA={dA.farms} numB={dB.farms}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "دفعات ألبان" : "Dairy batches"}
                  a={formatNumber(dA.dairyBatches)} b={formatNumber(dB.dairyBatches)}
                  numA={dA.dairyBatches} numB={dB.dairyBatches}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
                <CompareRow
                  label={ar ? "إشارات تنبؤ" : "Forecasts (in+out)"}
                  a={formatNumber(dA.forecastsOut + dA.forecastsIn)}
                  b={formatNumber(dB.forecastsOut + dB.forecastsIn)}
                  numA={dA.forecastsOut + dA.forecastsIn}
                  numB={dB.forecastsOut + dB.forecastsIn}
                  brandA={brandA.accent} brandB={brandB.accent}
                />
              </div>
            </section>

            {/* Quick links */}
            <div className="grid gap-3 md:grid-cols-2">
              <Link href={`/companies/${A.id}`} className="card card-hover card-pad flex items-center justify-between">
                <span className="text-[12px] font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {ar ? `ملف ${A.name} الكامل` : `${A.name} full profile`}
                </span>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--heri-ochre)" }} />
              </Link>
              <Link href={`/companies/${B.id}`} className="card card-hover card-pad flex items-center justify-between">
                <span className="text-[12px] font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {ar ? `ملف ${B.name} الكامل` : `${B.name} full profile`}
                </span>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--heri-ochre)" }} />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function CompanyPicker({
  companies, current, other, otherKey, mineKey, label,
}: {
  companies: Array<{ id: string; name: string; code: string }>;
  current?: string; other?: string;
  otherKey: "a" | "b"; mineKey: "a" | "b";
  label: string;
}) {
  return (
    <form className="inline-flex items-center gap-1.5" method="get" action="/compare">
      {other ? <input type="hidden" name={otherKey} value={other} /> : null}
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
        {label}
      </span>
      <select
        name={mineKey}
        defaultValue={current ?? ""}
        className="select btn-sm"
        style={{ minWidth: 160 }}
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id} disabled={c.id === other}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary btn-sm">↻</button>
    </form>
  );
}

function CompareRow({
  label, a, b,
  numA, numB,
  brandA, brandB,
  noWinner,
}: {
  label: string;
  a: string; b: string;
  numA?: number; numB?: number;
  brandA?: string; brandB?: string;
  noWinner?: boolean;
}) {
  const winnerA = !noWinner && numA != null && numB != null && numA > numB;
  const winnerB = !noWinner && numA != null && numB != null && numB > numA;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-2.5">
      <div className="text-end">
        <span
          className={`font-mono text-[13px] tabular-nums ${winnerA ? "font-semibold" : ""}`}
          style={{ color: winnerA ? (brandA ?? "var(--heri-ochre)") : "var(--heri-ink)" }}
        >
          {a}
        </span>
        {winnerA ? (
          <span className="ms-1.5 inline-flex h-1.5 w-1.5 rounded-full" style={{ background: brandA }} />
        ) : null}
      </div>
      <span className="text-center text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--heri-ink-3)" }}>
        {label}
      </span>
      <div className="text-start">
        {winnerB ? (
          <span className="me-1.5 inline-flex h-1.5 w-1.5 rounded-full" style={{ background: brandB }} />
        ) : null}
        <span
          className={`font-mono text-[13px] tabular-nums ${winnerB ? "font-semibold" : ""}`}
          style={{ color: winnerB ? (brandB ?? "var(--heri-ochre)") : "var(--heri-ink)" }}
        >
          {b}
        </span>
      </div>
    </div>
  );
}
