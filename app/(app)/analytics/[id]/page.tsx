import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChartLine, Wallet, FlaskConical, Brain, Leaf } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { CompanyCover } from "@/components/CompanyCover";
import { Sparkline } from "@/components/Sparkline";
import { KpiCard } from "@/components/KpiCard";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, formatPercent, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";

export default async function AnalyticsCompanyPage({ params }: { params: { id: string } }) {
  const ar = getLocale() === "ar";
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      transactions: { orderBy: { occurredAt: "asc" } },
      hotels: true,
      dairyBatches: true,
      farms: true,
      programs: true,
      forecastsOut: true,
      forecastsIn: true,
      futureProjects: true,
      esgScores: { orderBy: [{ year: "asc" }, { period: "asc" }] },
      marketStocks: true,
    },
  });
  if (!company) notFound();

  // 12-month revenue/expense trend
  const now = new Date();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const buckets = 12;
  const revenueTrend: number[] = [];
  const expenseTrend: number[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * monthMs);
    const to = new Date(now.getTime() - i * monthMs);
    const rev = company.transactions
      .filter((t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to)
      .reduce((a, t) => a + t.amount, 0);
    const exp = company.transactions
      .filter((t) => t.kind === "EXPENSE" && t.occurredAt >= from && t.occurredAt < to)
      .reduce((a, t) => a + t.amount, 0);
    revenueTrend.push(rev);
    expenseTrend.push(exp);
  }

  const revenue12 = revenueTrend.reduce((a, b) => a + b, 0);
  const expense12 = expenseTrend.reduce((a, b) => a + b, 0);
  const net12 = revenue12 - expense12;
  const margin = revenue12 > 0 ? net12 / revenue12 : 0;

  // Quarter splits
  const q3 = revenueTrend.slice(-3).reduce((a, b) => a + b, 0);
  const q6 = revenueTrend.slice(-6).reduce((a, b) => a + b, 0);
  const q12 = revenue12;

  // Category breakdown
  const byCategory = new Map<string, number>();
  for (const t of company.transactions) {
    if (t.kind !== "REVENUE") continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const cats = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catTotal = cats.reduce((a, [, v]) => a + v, 0) || 1;

  const lastEsg = [...company.esgScores].pop();

  const brand = getCompanyBrand(company.code);

  return (
    <>
      <Topbar
        eyebrow={ar ? "تحليل عميق" : "Deep dive"}
        title={ar ? company.name : company.nameEn}
        subtitle={brand.motto}
        actions={
          <Link href="/analytics" className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "رجوع للوحدات" : "Back to hub"}
          </Link>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        <CompanyCover
          code={company.code}
          eyebrow={company.code}
          title={ar ? company.name : company.nameEn}
          subtitle={brand.motto}
          metrics={[
            { label: ar ? "إيرادات 12ش" : "Revenue 12mo", value: formatMoney(revenue12) },
            { label: ar ? "صافي" : "Net", value: formatMoney(net12) },
            { label: ar ? "هامش" : "Margin", value: `${(margin * 100).toFixed(1)}٪` },
          ]}
        />

        <section className="grid gap-4 stagger sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={ar ? "إيرادات (3 أشهر)" : "Revenue (3mo)"} value={formatMoney(q3)} icon={Wallet} tone="emerald" />
          <KpiCard label={ar ? "إيرادات (6 أشهر)" : "Revenue (6mo)"} value={formatMoney(q6)} icon={Wallet} tone="emerald" />
          <KpiCard label={ar ? "إيرادات (12 شهر)" : "Revenue (12mo)"} value={formatMoney(q12)} icon={Wallet} tone="emerald" />
          <KpiCard label={ar ? "هامش الربح" : "Profit margin"} value={`${(margin * 100).toFixed(1)}٪`} icon={ChartLine} tone="violet" />
        </section>

        {/* Trend strip */}
        <section className="card card-pad">
          <div className="flex items-center justify-between">
            <div>
              <div className="card-title">{ar ? "اتجاه الإيرادات والمصاريف (شهرياً)" : "Revenue vs expenses trend (monthly)"}</div>
              <div className="card-sub">{ar ? "آخر 12 شهر" : "Last 12 months"}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--heri-ink-3)" }}>
                {ar ? "إيرادات" : "Revenue"}
              </div>
              <Sparkline data={revenueTrend} width={420} height={120} positive />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--heri-ink-3)" }}>
                {ar ? "مصاريف" : "Expenses"}
              </div>
              <Sparkline data={expenseTrend} width={420} height={120} positive={false} />
            </div>
          </div>
        </section>

        {/* Category breakdown + ESG */}
        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="card card-pad">
            <div className="card-title mb-3">{ar ? "أعلى مصادر الإيراد" : "Top revenue sources"}</div>
            <div className="space-y-2">
              {cats.length === 0 ? (
                <div className="text-sm" style={{ color: "var(--heri-ink-3)" }}>—</div>
              ) : (
                cats.map(([cat, val]) => (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold" style={{ color: "var(--heri-ink)" }}>{cat}</span>
                      <span className="font-mono" style={{ color: "var(--heri-ink-3)" }}>{formatMoney(val)}</span>
                    </div>
                    <div className="bar"><div className="bar-fill" style={{ width: `${(val / catTotal) * 100}%` }} /></div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="card-title mb-3">{ar ? "ESG الأخير" : "Latest ESG"}</div>
            {lastEsg ? (
              <>
                <div className="text-3xl font-bold" style={{ color: "var(--heri-ochre)" }}>{lastEsg.overall.toFixed(1)}</div>
                <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{lastEsg.year} · {lastEsg.period}</div>
                <div className="mt-3 space-y-2 text-xs">
                  <Bar label={ar ? "بيئي" : "Environmental"} val={lastEsg.environmentalScore} />
                  <Bar label={ar ? "اجتماعي" : "Social"} val={lastEsg.socialScore} />
                  <Bar label={ar ? "حوكمة" : "Governance"} val={lastEsg.governanceScore} />
                </div>
              </>
            ) : <div className="text-sm" style={{ color: "var(--heri-ink-3)" }}>—</div>}
          </div>
        </section>

        {/* Operations footprint */}
        <section className="grid gap-3 stagger md:grid-cols-2 xl:grid-cols-4">
          <Footprint label={ar ? "فنادق" : "Hotels"} value={company.hotels.length} icon={Wallet} />
          <Footprint label={ar ? "دفعات ألبان" : "Dairy batches"} value={company.dairyBatches.length} icon={FlaskConical} />
          <Footprint label={ar ? "مزارع" : "Farms"} value={company.farms.length} icon={Leaf} />
          <Footprint label={ar ? "إشارات تنبؤ" : "Forecasts"} value={company.forecastsOut.length + company.forecastsIn.length} icon={Brain} />
        </section>

        {/* Future Projects pipeline */}
        {company.futureProjects.length > 0 ? (
          <section className="card card-pad">
            <div className="card-title mb-3">{ar ? "المشاريع المستقبلية" : "Future Projects pipeline"}</div>
            <div className="space-y-3">
              {company.futureProjects.map((p) => (
                <div key={p.id} className="rounded-xl p-3" style={{ border: "1px solid var(--heri-rule)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>{p.title}</div>
                      <div className="line-clamp-2 text-xs" style={{ color: "var(--heri-ink-3)" }}>{p.description}</div>
                    </div>
                    <span className="badge-violet">{p.stage}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                    <span>{p.startQuarter} → {p.targetQuarter}</span>
                    <span className="font-mono">{formatMoney(p.budgetJod)}</span>
                  </div>
                  <div className="mt-2 bar"><div className="bar-fill" style={{ width: `${p.progressPct}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Bar({ label, val }: { label: string; val: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]"><span style={{ color: "var(--heri-ink-3)" }}>{label}</span><span className="font-mono">{val.toFixed(1)}</span></div>
      <div className="bar"><div className="bar-fill" style={{ width: `${val}%` }} /></div>
    </div>
  );
}

function Footprint({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="card card-pad flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--heri-cream-2)", color: "var(--heri-ochre)" }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{label}</div>
        <div className="text-lg font-bold" style={{ color: "var(--heri-ink)" }}>{formatNumber(value)}</div>
      </div>
    </div>
  );
}
