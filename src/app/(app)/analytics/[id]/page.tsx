import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChartLine, Wallet, FlaskConical, Brain, Leaf } from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { CompanyCover } from "@/components/empire/CompanyCover";
import { Sparkline } from "@/components/ui/Sparkline";
import "../../daylight.css";
import { prisma } from "@/lib/db/db";
import { formatMoney, formatNumber, formatPercent, formatShortDate } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCompanyBrand } from "@/lib/utils/companyBrand";

export default async function AnalyticsCompanyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ar = (await getLocale()) === "ar";
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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "تحليل عميق" : "Deep dive"}
        title={ar ? company.name : company.nameEn}
        subtitle={brand.motto}
        actions={
          <Link href="/analytics" className="dl-btn dl-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "رجوع للوحدات" : "Back to hub"}
          </Link>
        }
      />

      <CompanyCover
        code={company.code}
        eyebrow={company.code}
        title={ar ? company.name : company.nameEn}
        subtitle={brand.motto}
        metrics={[
          { label: ar ? "إيرادات 12ش" : "Revenue 12mo", value: formatMoney(revenue12) },
          { label: ar ? "صافي" : "Net", value: formatMoney(net12) },
          { label: ar ? "هامش" : "Margin", value: `${(margin * 100).toFixed(1)}${ar ? "٪" : "%"}` },
        ]}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إيرادات (3 أشهر)" : "Revenue (3mo)"} value={formatMoney(q3)} />
        <DaylightKpi label={ar ? "إيرادات (6 أشهر)" : "Revenue (6mo)"} value={formatMoney(q6)} />
        <DaylightKpi label={ar ? "إيرادات (12 شهر)" : "Revenue (12mo)"} value={formatMoney(q12)} />
        <DaylightKpi label={ar ? "هامش الربح" : "Profit margin"} value={`${(margin * 100).toFixed(1)}${ar ? "٪" : "%"}`} />
      </DaylightKpiGrid>

      {/* Trend strip */}
      <DaylightPanel title={ar ? "اتجاه الإيرادات والمصاريف (شهرياً)" : "Revenue vs expenses trend (monthly)"} aside={ar ? "آخر 12 شهر" : "Last 12 months"}>
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--ink-muted)" }}>
              {ar ? "إيرادات" : "Revenue"}
            </div>
            <Sparkline data={revenueTrend} width={420} height={120} positive />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--ink-muted)" }}>
              {ar ? "مصاريف" : "Expenses"}
            </div>
            <Sparkline data={expenseTrend} width={420} height={120} positive={false} />
          </div>
        </div>
      </DaylightPanel>

      {/* Category breakdown + ESG */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.5fr 1fr" }}>
        <DaylightPanel title={ar ? "أعلى مصادر الإيراد" : "Top revenue sources"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cats.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>—</div>
            ) : (
              cats.map(([cat, val]) => (
                <div key={cat}>
                  <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>{cat}</span>
                    <span style={{ fontFamily: "monospace", color: "var(--ink-muted)" }}>{formatMoney(val)}</span>
                  </div>
                  <div className="dl-bar"><i style={{ width: `${(val / catTotal) * 100}%` }} /></div>
                </div>
              ))
            )}
          </div>
        </DaylightPanel>

        <DaylightPanel title={ar ? "ESG الأخير" : "Latest ESG"}>
          {lastEsg ? (
            <>
              <div style={{ fontSize: 30, fontWeight: 700, color: "var(--gold)" }}>{lastEsg.overall.toFixed(1)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{lastEsg.year} · {lastEsg.period}</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <Bar label={ar ? "بيئي" : "Environmental"} val={lastEsg.environmentalScore} />
                <Bar label={ar ? "اجتماعي" : "Social"} val={lastEsg.socialScore} />
                <Bar label={ar ? "حوكمة" : "Governance"} val={lastEsg.governanceScore} />
              </div>
            </>
          ) : <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>—</div>}
        </DaylightPanel>
      </div>

      {/* Operations footprint */}
      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "فنادق" : "Hotels"} value={String(company.hotels.length)} />
        <DaylightKpi label={ar ? "دفعات ألبان" : "Dairy batches"} value={String(company.dairyBatches.length)} />
        <DaylightKpi label={ar ? "مزارع" : "Farms"} value={String(company.farms.length)} />
        <DaylightKpi label={ar ? "إشارات تنبؤ" : "Forecasts"} value={String(company.forecastsOut.length + company.forecastsIn.length)} />
      </DaylightKpiGrid>

      {/* Future Projects pipeline */}
      {company.futureProjects.length > 0 ? (
        <DaylightPanel title={ar ? "المشاريع المستقبلية" : "Future Projects pipeline"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {company.futureProjects.map((p) => (
              <div key={p.id} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{p.description}</div>
                  </div>
                  <span className="tag ok" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>{p.stage}</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--ink-muted)" }}>
                  <span>{p.startQuarter} → {p.targetQuarter}</span>
                  <span style={{ fontFamily: "monospace" }}>{formatMoney(p.budgetJod)}</span>
                </div>
                <div className="dl-bar" style={{ marginTop: 8 }}><i style={{ width: `${p.progressPct}%` }} /></div>
              </div>
            ))}
          </div>
        </DaylightPanel>
      ) : null}
    </DaylightShell>
  );
}

function Bar({ label, val }: { label: string; val: number }) {
  return (
    <div>
      <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--ink-muted)" }}>{label}</span>
        <span style={{ fontFamily: "monospace" }}>{val.toFixed(1)}</span>
      </div>
      <div className="dl-bar"><i style={{ width: `${val}%` }} /></div>
    </div>
  );
}

