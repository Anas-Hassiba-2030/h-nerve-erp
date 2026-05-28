import { TrendingUp, TrendingDown, Globe, Network, ArrowUpRight, ArrowDownRight, Download, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { HeriKpi } from "@/components/HeriKpi";
import { KpiCard } from "@/components/KpiCard";
import { Sparkline } from "@/components/Sparkline";
import { ExportMenu } from "@/components/ExportMenu";
import { prisma } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyRevenue30dMap, notionalValuationFromRevenue30d } from "@/lib/finance";

export const dynamic = "force-dynamic";

const REGION_AR: Record<string, string> = { MENA: "الشرق الأوسط", US: "الولايات المتحدة", EU: "أوروبا", ASIA: "آسيا" };
const REGION_EN: Record<string, string> = { MENA: "MENA", US: "US", EU: "EU", ASIA: "Asia" };

export default async function MarketsPage() {
  const ar = getLocale() === "ar";
  const [stocks, companies] = await Promise.all([
    prisma.marketStock.findMany({
      orderBy: [{ region: "asc" }, { changePct: "desc" }],
      include: { company: true },
    }),
    // Phase V3-P11-finish — Hourani Group Equities cards built from
    // /companies data (not publicly traded — internal valuation only).
    prisma.company.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, nameEn: true, sector: true, employees: true },
    }),
  ]);

  // Phase BUG-3 — single source of truth for revenue 30d via
  // lib/finance.getCompanyRevenue30dMap. Both /workspace and /markets
  // now read the same JOD value for the same company × 30d window.
  // Notional valuation = revenue30d × 8 (P/E proxy, documented in
  // lib/finance.ts).
  const revenueMap = await getCompanyRevenue30dMap(companies.map((c) => c.id));
  const valuationByCompany = new Map<string, number>();
  const revenue30dByCompany = new Map<string, number>();
  for (const c of companies) {
    const rev = revenueMap.get(c.id) ?? 0;
    revenue30dByCompany.set(c.id, rev);
    valuationByCompany.set(c.id, notionalValuationFromRevenue30d(rev));
  }

  // Group by region
  const byRegion = stocks.reduce<Record<string, typeof stocks>>((acc, s) => {
    (acc[s.region] ??= []).push(s);
    return acc;
  }, {});

  const groupStocks = stocks.filter((s) => s.companyId !== null);
  const allUp = stocks.filter((s) => s.changePct >= 0).length;
  const allDown = stocks.length - allUp;
  const groupAvgChange =
    groupStocks.length > 0
      ? groupStocks.reduce((acc, s) => acc + s.changePct, 0) / groupStocks.length
      : 0;
  const topMover = stocks.reduce((acc, s) => (Math.abs(s.changePct) > Math.abs(acc.changePct) ? s : acc), stocks[0]);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "النمو والاستثمار" : "Growth & Capital"}
        title={ar ? "الأسواق العالمية" : "Global Markets"}
        subtitle={
          ar
            ? "تتبع أسهم شركات المجموعة + قائمة مرجعية من الأسواق العالمية والإقليمية."
            : "Track group equities alongside global and regional benchmarks."
        }
      />

      <PageContainer>
        <HeritageSection
          eyebrow={ar ? "نبضات السوق" : "Market pulse"}
          title={ar ? "الأسواق العالمية" : "Global Markets"}
          rtl={ar}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div>
                <Globe className="h-12 w-12" style={{ color: "var(--heri-ochre)" }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[12.5px] font-semibold"
                  style={{ color: "var(--heri-ink-2)" }}
                >
                  {ar
                    ? "H-Nerve يجمع كل أسهم المجموعة ويقارنها بأسواق العالم — قرارات على أرضية معلومات."
                    : "H-Nerve aggregates every group equity and benchmarks against the world — decisions on data."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ExportMenu type="markets" locale={ar ? "ar" : "en"} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 heri-stagger sm:grid-cols-2">
              <MktHeroStat label={ar ? "أسهم المجموعة" : "Group equities"} value={formatNumber(groupStocks.length)} icon={Network} />
              <MktHeroStat
                label={ar ? "متوسط الحركة" : "Avg move"}
                value={`${groupAvgChange >= 0 ? "+" : ""}${groupAvgChange.toFixed(2)}%`}
                icon={groupAvgChange >= 0 ? TrendingUp : TrendingDown}
              />
              <MktHeroStat label={ar ? "صاعدون" : "Advancers"} value={formatNumber(allUp)} icon={ArrowUpRight} />
              <MktHeroStat label={ar ? "هابطون" : "Decliners"} value={formatNumber(allDown)} icon={ArrowDownRight} />
            </div>
          </div>
        </HeritageSection>

        {/* KPI strip */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={ar ? "حركة أسهم المجموعة" : "Group equity move"}
            value={`${groupAvgChange >= 0 ? "+" : ""}${groupAvgChange.toFixed(2)}٪`}
            icon={Network}
            tone={groupAvgChange >= 0 ? "emerald" : "red"}
            delta={{ value: ar ? "متوسط 5 أسهم قابضة" : "Avg of 5 group tickers", up: groupAvgChange >= 0 }}
          />
          <KpiCard
            label={ar ? "صاعدون" : "Advancers"}
            value={formatNumber(allUp)}
            icon={TrendingUp}
            tone="emerald"
            hint={ar ? `من أصل ${formatNumber(stocks.length)} سهم متابع` : `Out of ${formatNumber(stocks.length)} tracked`}
          />
          <KpiCard
            label={ar ? "هابطون" : "Decliners"}
            value={formatNumber(allDown)}
            icon={TrendingDown}
            tone="red"
          />
          <KpiCard
            label={ar ? "أعلى تحرّك" : "Top mover"}
            value={topMover ? `${topMover.changePct >= 0 ? "+" : ""}${topMover.changePct.toFixed(2)}٪` : "—"}
            icon={topMover && topMover.changePct >= 0 ? ArrowUpRight : ArrowDownRight}
            tone="amber"
            hint={topMover ? (ar ? topMover.labelAr ?? topMover.label : topMover.label) : undefined}
          />
        </section>

        {/* Phase V3-P11-finish — Hourani Group Equities (internal valuation) */}
        <section className="space-y-3">
          <div className="section-title">
            {ar ? "أسهم مجموعة الحوراني (تقييم داخلي)" : "Hourani Group Equities (internal valuation)"}
          </div>
          <p className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
            {ar
              ? "تقييم تقديري داخلي · ليست أسهماً متداولة"
              : "Internal valuation · not publicly traded"}
            {" · "}
            {ar ? "حسبة: إيراد 30 يوماً × 8 (مضاعف P/E)" : "Calc: 30d revenue × 8 (P/E proxy)"}
          </p>
          <div className="grid gap-3 heri-stagger md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {companies.map((c) => {
              const valuation = valuationByCompany.get(c.id) ?? 0;
              return (
                <div
                  key={c.id}
                  className="heri-card p-4"
                  style={{
                    background: "var(--heri-cream-2)",
                    border: "1px solid var(--heri-rule)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="heri-eyebrow" style={{ color: "var(--heri-ink-3)" }}>
                      {c.code}
                    </span>
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      MENA · INTERNAL
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--heri-ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {ar ? c.name : c.nameEn}
                  </div>
                  <div
                    className="heri-number-mono"
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginTop: 8,
                      color: "var(--brand-deep, #0f5132)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round(valuation).toLocaleString("en-US")} JOD
                  </div>
                  <div
                    className="text-[10.5px] mt-1"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    {c.sector} · {formatNumber(c.employees)} {ar ? "موظف" : "staff"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Group equities — if any MarketStock is linked to a company */}
        {groupStocks.length > 0 ? (
          <section className="space-y-3">
            <div className="section-title">
              {ar ? "أسهم متداولة مرتبطة" : "Linked tradable tickers"}
            </div>
            <div className="grid gap-3 heri-stagger lg:grid-cols-2 xl:grid-cols-3">
              {groupStocks.map((s) => (
                <StockCard key={s.id} stock={s} ar={ar} highlighted />
              ))}
            </div>
          </section>
        ) : null}

        {/* By region */}
        {Object.entries(byRegion).map(([region, list]) => {
          if (list.every((s) => s.companyId !== null)) return null; // already shown above
          const filtered = list.filter((s) => !s.companyId);
          if (filtered.length === 0) return null;
          return (
            <section key={region} className="space-y-3">
              <div className="section-title">
                {ar ? REGION_AR[region] ?? region : REGION_EN[region] ?? region}
              </div>
              <div className="grid gap-3 heri-stagger md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((s) => (
                  <StockCard key={s.id} stock={s} ar={ar} />
                ))}
              </div>
            </section>
          );
        })}
      </PageContainer>
    </>
  );
}

function MktHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="px-3 py-2"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--heri-ink-3)" }}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="heri-number-mono mt-0.5 text-xl font-bold leading-none tracking-[-0.012em]" style={{ color: "var(--heri-ink)" }}>
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2" style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>{label}</div>
      <div className="mt-0.5 text-base font-bold" style={{ color: "var(--heri-ink)" }}>{value}</div>
    </div>
  );
}

function StockCard({
  stock,
  ar,
  highlighted = false,
}: {
  stock: any;
  ar: boolean;
  highlighted?: boolean;
}) {
  const history: number[] = (() => {
    try { return JSON.parse(stock.history || "[]"); } catch { return []; }
  })();
  const up = stock.changePct >= 0;
  return (
    <div className="card card-hover card-pad relative overflow-hidden">
      {highlighted ? (
        <div className="absolute end-0 top-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white"
             style={{ background: "linear-gradient(135deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)", borderBottomLeftRadius: 0 }}>
          {ar ? "مجموعة الحوراني" : "Hourani Group"}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold" style={{ color: "var(--heri-ink-3)" }}>{stock.ticker}</div>
          <div className="line-clamp-1 text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
            {ar && stock.labelAr ? stock.labelAr : stock.label}
          </div>
          <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{stock.exchange}</div>
        </div>
        <span className={up ? "badge-emerald" : "badge-red"}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {up ? "+" : ""}{stock.changePct.toFixed(2)}٪
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold" style={{ color: "var(--heri-ink)" }}>
            {stock.lastPrice.toLocaleString(ar ? "ar-JO" : "en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{stock.currency}</div>
        </div>
        <Sparkline data={history} width={120} height={42} positive={up} />
      </div>
    </div>
  );
}
