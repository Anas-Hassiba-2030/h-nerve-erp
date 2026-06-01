import Link from "next/link";
import { TrendingUp, Activity, ChevronLeft, Sparkles, Zap, Target } from "lucide-react";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BenchmarkBar } from "@/components/BenchmarkBar";
import { SectorPill } from "@/components/SectorPill";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function AnalyticsHubPage() {
  const ar = getLocale() === "ar";
  const now = new Date();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const start12mo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [companies, transactions, forecasts, esg] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: start12mo } } }),
    prisma.supplyForecast.findMany(),
    prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }] }),
  ]);

  const data = companies.map((c) => {
    const ctx = transactions.filter((t) => t.companyId === c.id);
    const trend: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getTime() - (i + 1) * monthMs);
      const to = new Date(now.getTime() - i * monthMs);
      trend.push(ctx.filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to).reduce((a, t) => a + t.amount, 0));
    }
    const revenue = ctx.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0);
    const expense = ctx.filter((t) => t.kind === "EXPENSE").reduce((a, t) => a + t.amount, 0);
    const net = revenue - expense;
    const margin = revenue > 0 ? net / revenue : 0;
    const fcCount = forecasts.filter((f) => f.sourceCompanyId === c.id || f.targetCompanyId === c.id).length;
    const lastEsg = [...esg].reverse().find((s) => s.companyId === c.id)?.overall ?? 0;
    return { company: c, trend, revenue, expense, net, margin, fcCount, lastEsg };
  });

  const groupRevenue = data.reduce((a, x) => a + x.revenue, 0);
  const groupNet = data.reduce((a, x) => a + x.net, 0);
  const groupMargin = groupRevenue > 0 ? groupNet / groupRevenue : 0;
  const fastest = [...data].sort((a, b) => b.margin - a.margin)[0];

  const activeRows = data.filter((d) => d.revenue > 0);
  const avgRevenue = activeRows.length ? activeRows.reduce((a, x) => a + x.revenue, 0) / activeRows.length : 0;
  const avgMargin = activeRows.length ? activeRows.reduce((a, x) => a + x.margin, 0) / activeRows.length : 0;
  const avgEsg = (() => {
    const withEsg = activeRows.filter((d) => d.lastEsg > 0);
    return withEsg.length ? withEsg.reduce((a, x) => a + x.lastEsg, 0) / withEsg.length : 0;
  })();

  const groupTrend: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * monthMs);
    const to = new Date(now.getTime() - i * monthMs);
    groupTrend.push(transactions.filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to).reduce((a, t) => a + t.amount, 0));
  }
  const monthLabels = (() => {
    const out: string[] = [];
    const fmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { month: "short" });
    for (let i = 11; i >= 0; i--) out.push(fmt.format(new Date(now.getTime() - i * monthMs)));
    return out;
  })();

  const barRevenue = data.filter((d) => d.revenue > 0).sort((a, b) => b.revenue - a.revenue).map((d) => ({ label: d.company.code, value: Math.round(d.revenue), color: getCompanyBrand(d.company.code).accent }));
  const donutData = data.filter((d) => d.revenue > 0).map((d) => ({ label: ar ? d.company.name : d.company.nameEn, value: d.revenue, color: getCompanyBrand(d.company.code).accent }));
  const esgBar = data.filter((d) => d.lastEsg > 0).map((d) => ({ label: d.company.code, value: Math.round(d.lastEsg), color: getCompanyBrand(d.company.code).accent }));

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المساحة · التحليلات المتقدمة" : "Workspace · Advanced Analytics"}
        title={ar ? "التحليلات المتقدمة" : "Advanced Analytics"}
        subtitle={ar ? "تحليل عميق لأداء كل شركة + مقارنات متقاطعة عبر المجموعة — آخر اثني عشر شهراً." : "Deep performance analytics for every company plus cross-group comparisons — last 12 months."}
        status={ar ? "مباشر" : "Live"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إيرادات المجموعة" : "Group revenue"} value={formatMoney(groupRevenue)} hint={ar ? "آخر ١٢ شهر" : "last 12 months"} delta={{ dir: "up", text: ar ? "١٢ش" : "12mo" }} />
        <DaylightKpi label={ar ? "الصافي" : "Net"} value={formatMoney(groupNet)} hint={ar ? "بعد المصاريف" : "after expenses"} delta={{ dir: groupNet >= 0 ? "up" : "down", text: groupNet >= 0 ? (ar ? "ربح" : "profit") : (ar ? "خسارة" : "loss") }} />
        <DaylightKpi label={ar ? "هامش الربح" : "Profit margin"} value={`${(groupMargin * 100).toFixed(1)}%`} hint={ar ? "صافي/إيراد" : "net/revenue"} />
        <DaylightKpi label={ar ? "أعلى نمو" : "Fastest grower"} value={fastest?.company.code ?? "—"} hint={fastest ? `${(fastest.margin * 100).toFixed(1)}% ${ar ? "هامش" : "margin"}` : undefined} />
      </DaylightKpiGrid>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.5fr 1fr" }}>
        <DaylightPanel title={ar ? "اتجاه إيرادات المجموعة" : "Group revenue trend"} aside={ar ? "كل الشركات شهرياً — ١٢ شهر" : "All companies monthly — 12 months"}>
          <AreaLineChart data={groupTrend} labels={monthLabels} height={240} color="var(--gold)" formatY={(v) => formatMoney(v)} />
        </DaylightPanel>
        <DaylightPanel title={ar ? "مساهمة الإيرادات" : "Revenue contribution"} aside={ar ? "نسبة كل شركة" : "Per-company share"}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <DonutChart data={donutData} size={170} centerLabel={ar ? "إجمالي" : "Total"} centerValue={formatMoney(groupRevenue)} />
          </div>
        </DaylightPanel>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <DaylightPanel title={ar ? "إيرادات كل شركة" : "Revenue by company"} aside={ar ? "إجمالي ١٢ شهر بالدينار" : "12-month total in JOD"}>
          <BarChart data={barRevenue} height={220} formatValue={(v) => formatMoney(v)} />
        </DaylightPanel>
        <DaylightPanel title={ar ? "نقاط ESG" : "ESG scores"} aside={ar ? "آخر تقييم — من ١٠٠" : "Latest score — out of 100"}>
          <BarChart data={esgBar} height={220} />
        </DaylightPanel>
      </div>

      <DaylightPanel title={ar ? "التحليل العميق لكل شركة" : "Per-company deep dive"} aside={ar ? "اضغط لفتح تحليل تفصيلي" : "Click for detailed analytics"}>
        <div className="prop-grid">
          {data.map((row) => {
            const brand = getCompanyBrand(row.company.code);
            return (
              <Link key={row.company.id} href={`/analytics/${row.company.id}`} className="prop-card" style={{ display: "block" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center text-base font-bold text-white" style={{ background: brand.gradient, borderRadius: 10 }}>{brand.emblem}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{ar ? row.company.name : row.company.nameEn}</div>
                        <SectorPill sector={row.company.sector} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{row.company.nameEn}</div>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--ink-muted)" }} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <Mini label={ar ? "إيراد" : "Revenue"} value={formatMoney(row.revenue)} />
                  <Mini label={ar ? "صافي" : "Net"} value={formatMoney(row.net)} negative={row.net < 0} />
                  <Mini label={ar ? "هامش" : "Margin"} value={`${(row.margin * 100).toFixed(1)}%`} />
                  <Mini label="ESG" value={row.lastEsg ? row.lastEsg.toFixed(1) : "—"} />
                </div>
                <div className="mt-3 -mx-2">
                  <AreaLineChart data={row.trend} height={90} color={brand.accent} showGrid={false} />
                </div>
                <div className="mt-3 space-y-2" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "مقارنة بمعيار المجموعة" : "Vs group average"}</div>
                  {avgRevenue > 0 ? <BenchmarkBar label={ar ? "إيرادات" : "Revenue"} value={row.revenue} benchmark={avgRevenue} formatValue={formatMoney} higherIsBetter locale={ar ? "ar" : "en"} /> : null}
                  {(row.margin !== 0 || avgMargin !== 0) ? <BenchmarkBar label={ar ? "هامش" : "Margin"} value={row.margin * 100} benchmark={avgMargin * 100} formatValue={(v) => `${v.toFixed(1)}%`} higherIsBetter locale={ar ? "ar" : "en"} /> : null}
                  {row.lastEsg > 0 && avgEsg > 0 ? <BenchmarkBar label="ESG" value={row.lastEsg} benchmark={avgEsg} max={100} formatValue={(v) => v.toFixed(1)} higherIsBetter locale={ar ? "ar" : "en"} /> : null}
                </div>
              </Link>
            );
          })}
        </div>
      </DaylightPanel>
    </DaylightShell>
  );
}

function Mini({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div style={{ background: "var(--ivory)", border: "1px solid var(--line)", padding: "8px 10px", borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-muted)" }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: negative ? "var(--brick)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}
