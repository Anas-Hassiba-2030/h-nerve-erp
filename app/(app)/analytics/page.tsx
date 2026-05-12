import Link from "next/link";
import {
  ChartLine, TrendingUp, TrendingDown, Activity, ChevronLeft,
  Sparkles, Zap, Target, BarChart3, LineChart,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { CompanyCover } from "@/components/CompanyCover";
import { KpiCard } from "@/components/KpiCard";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { BenchmarkBar } from "@/components/BenchmarkBar";
import { SectorPill } from "@/components/SectorPill";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";

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

  // Per-company aggregates
  const data = companies.map((c) => {
    const ctx = transactions.filter((t) => t.companyId === c.id);
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
    const fcCount = forecasts.filter((f) => f.sourceCompanyId === c.id || f.targetCompanyId === c.id).length;
    const lastEsg = [...esg].reverse().find((s) => s.companyId === c.id)?.overall ?? 0;
    return { company: c, trend, revenue, expense, net, margin, fcCount, lastEsg };
  });

  const groupRevenue = data.reduce((a, x) => a + x.revenue, 0);
  const groupNet = data.reduce((a, x) => a + x.net, 0);
  const groupMargin = groupRevenue > 0 ? groupNet / groupRevenue : 0;
  const top = [...data].sort((a, b) => b.revenue - a.revenue)[0];
  const fastest = [...data].sort((a, b) => b.margin - a.margin)[0];

  // Benchmarks across active companies (peers with non-zero data)
  const activeRows = data.filter((d) => d.revenue > 0);
  const avgRevenue = activeRows.length ? activeRows.reduce((a, x) => a + x.revenue, 0) / activeRows.length : 0;
  const avgMargin = activeRows.length ? activeRows.reduce((a, x) => a + x.margin, 0) / activeRows.length : 0;
  const avgEsg = (() => {
    const withEsg = activeRows.filter((d) => d.lastEsg > 0);
    return withEsg.length ? withEsg.reduce((a, x) => a + x.lastEsg, 0) / withEsg.length : 0;
  })();

  // Group revenue trend (sum across companies)
  const groupTrend: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * monthMs);
    const to = new Date(now.getTime() - i * monthMs);
    groupTrend.push(
      transactions
        .filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to)
        .reduce((a, t) => a + t.amount, 0)
    );
  }
  const monthLabels = (() => {
    const out: string[] = [];
    const fmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { month: "short" });
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * monthMs);
      out.push(fmt.format(d));
    }
    return out;
  })();

  // Bar chart: revenue per company
  const barRevenue = data
    .filter((d) => d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .map((d) => ({
      label: d.company.code,
      value: Math.round(d.revenue),
      color: getCompanyBrand(d.company.code).accent,
    }));

  // Donut chart: revenue contribution
  const donutData = data
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      label: ar ? d.company.name : d.company.nameEn,
      value: d.revenue,
      color: getCompanyBrand(d.company.code).accent,
    }));

  // Bar chart: ESG comparison
  const esgBar = data
    .filter((d) => d.lastEsg > 0)
    .map((d) => ({
      label: d.company.code,
      value: Math.round(d.lastEsg),
      color: getCompanyBrand(d.company.code).accent,
    }));

  return (
    <>
      <PageHeader
        eyebrow={ar ? "المساحة" : "Workspace"}
        title={ar ? "التحليلات المتقدمة" : "Advanced Analytics"}
        subtitle={
          ar
            ? "تحليل عميق لأداء كل شركة + مقارنات متقاطعة عبر المجموعة."
            : "Deep performance analytics for every company plus cross-group comparisons."
        }
      />

      <PageContainer>
        <HeroPanel
          gradient="linear-gradient(135deg, #0c1424 0%, #164e63 40%, #0891b2 75%, #67e8f9 110%)"
          accent="#0891b2"
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <ChartLine className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <BarChart3 className="h-3 w-3" />
                  {ar ? "تحليلات متقدمة" : "Advanced analytics"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "أداء المجموعة في 12 شهر" : "Group performance — 12 months"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "قراءة موحّدة عبر شركات الحوراني، مع مؤشرات هامش الربح وإشارات سلسلة التوريد."
                    : "Unified read across Hourani companies — margin signals + supply chain pulse."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <AnaHeroStat label={ar ? "إيرادات" : "Revenue"} value={formatMoney(groupRevenue)} icon={TrendingUp} />
              <AnaHeroStat label={ar ? "صافي" : "Net"} value={formatMoney(groupNet)} icon={Activity} />
              <AnaHeroStat label={ar ? "هامش" : "Margin"} value={`${(groupMargin * 100).toFixed(1)}%`} icon={Target} />
              <AnaHeroStat label={ar ? "أسرع نمو" : "Fastest grower"} value={fastest?.company.code ?? "—"} icon={Zap} />
            </div>
          </div>
        </HeroPanel>

        {/* KPI strip with animated counters */}
        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "إيرادات المجموعة" : "Group revenue"}
            value={formatMoney(groupRevenue)}
            icon={TrendingUp}
            tone="emerald"
            hint={ar ? "آخر 12 شهر" : "last 12 months"}
          />
          <MetricTile
            label={ar ? "صافي" : "Net"}
            value={formatMoney(groupNet)}
            icon={Activity}
            tone={groupNet >= 0 ? "emerald" : "rose"}
            hint={ar ? "بعد المصاريف" : "after expenses"}
          />
          <MetricTile
            label={ar ? "هامش الربح" : "Profit margin"}
            value={`${(groupMargin * 100).toFixed(1)}%`}
            icon={Target}
            tone="violet"
            hint={ar ? "صافي/إيراد" : "net/revenue"}
          />
          <MetricTile
            label={ar ? "أعلى نمو" : "Fastest grower"}
            value={fastest?.company.code ?? "—"}
            icon={Zap}
            tone="amber"
            hint={fastest ? `${(fastest.margin * 100).toFixed(1)}% ${ar ? "هامش" : "margin"}` : undefined}
          />
        </section>

        {/* Trend + Donut */}
        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <div>
                <div className="card-title">{ar ? "اتجاه إيرادات المجموعة (12 شهر)" : "Group revenue trend (12 months)"}</div>
                <div className="card-sub">{ar ? "مجموع كل الشركات شهرياً" : "All companies aggregated monthly"}</div>
              </div>
              <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <div className="mt-4">
              <AreaLineChart
                data={groupTrend}
                labels={monthLabels}
                height={240}
                color="var(--brand)"
                formatY={(v) => formatMoney(v)}
              />
            </div>
          </div>

          <div className="card card-pad">
            <div className="card-title mb-3">
              {ar ? "مساهمة الإيرادات" : "Revenue contribution"}
            </div>
            <DonutChart
              data={donutData}
              size={170}
              centerLabel={ar ? "إجمالي" : "Total"}
              centerValue={formatMoney(groupRevenue)}
            />
          </div>
        </section>

        {/* Bar charts */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card card-pad">
            <div className="card-title mb-2">
              {ar ? "إيرادات كل شركة" : "Revenue by company"}
            </div>
            <div className="card-sub mb-4">
              {ar ? "إجمالي 12 شهر بالدينار الأردني" : "12-month total, in JOD"}
            </div>
            <BarChart
              data={barRevenue}
              height={220}
              formatValue={(v) => formatMoney(v)}
            />
          </div>
          <div className="card card-pad">
            <div className="card-title mb-2">
              {ar ? "نقاط ESG لكل شركة" : "ESG scores by company"}
            </div>
            <div className="card-sub mb-4">
              {ar ? "آخر تقييم متاح (من 100)" : "Latest score (out of 100)"}
            </div>
            <BarChart data={esgBar} height={220} />
          </div>
        </section>

        {/* Per-company deep dive cards */}
        <section className="space-y-3">
          <div className="section-title">{ar ? "اختر شركة للتحليل العميق" : "Select a company for deep dive"}</div>
          <div className="grid gap-4 stagger lg:grid-cols-2">
            {data.map((row) => {
              const brand = getCompanyBrand(row.company.code);
              return (
                <Link
                  key={row.company.id}
                  href={`/analytics/${row.company.id}`}
                  className="card card-hover card-pad block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-black text-white shadow-soft"
                        style={{ background: brand.gradient }}
                      >
                        {brand.emblem}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                            {row.company.name}
                          </div>
                          <SectorPill sector={row.company.sector} />
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {row.company.nameEn}
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--text-muted)" }} />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Mini label={ar ? "إيرادات" : "Revenue"} value={formatMoney(row.revenue)} />
                    <Mini label={ar ? "صافي" : "Net"} value={formatMoney(row.net)} positive={row.net >= 0} />
                    <Mini label={ar ? "هامش" : "Margin"} value={`${(row.margin * 100).toFixed(1)}%`} />
                    <Mini label="ESG" value={row.lastEsg ? row.lastEsg.toFixed(1) : "—"} />
                  </div>

                  <div className="mt-3 -mx-2">
                    <AreaLineChart
                      data={row.trend}
                      height={90}
                      color={brand.accent}
                      showGrid={false}
                    />
                  </div>

                  {/* Benchmark bars: company vs group average */}
                  <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {ar ? "مقارنة بمعيار المجموعة" : "Vs group average"}
                    </div>
                    {avgRevenue > 0 ? (
                      <BenchmarkBar
                        label={ar ? "إيرادات" : "Revenue"}
                        value={row.revenue}
                        benchmark={avgRevenue}
                        formatValue={formatMoney}
                        higherIsBetter
                        locale={ar ? "ar" : "en"}
                      />
                    ) : null}
                    {row.margin !== 0 || avgMargin !== 0 ? (
                      <BenchmarkBar
                        label={ar ? "هامش الربح" : "Profit margin"}
                        value={row.margin * 100}
                        benchmark={avgMargin * 100}
                        formatValue={(v) => `${v.toFixed(1)}%`}
                        higherIsBetter
                        locale={ar ? "ar" : "en"}
                      />
                    ) : null}
                    {row.lastEsg > 0 && avgEsg > 0 ? (
                      <BenchmarkBar
                        label="ESG"
                        value={row.lastEsg}
                        benchmark={avgEsg}
                        max={100}
                        formatValue={(v) => v.toFixed(1)}
                        higherIsBetter
                        locale={ar ? "ar" : "en"}
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </PageContainer>
    </>
  );
}

function AnaHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-base font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg p-2" style={{ background: "var(--brand-soft)" }}>
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="mt-0.5 text-sm font-extrabold"
        style={{ color: positive === false ? "#c0392b" : "var(--brand-deep)" }}
      >
        {value}
      </div>
    </div>
  );
}
