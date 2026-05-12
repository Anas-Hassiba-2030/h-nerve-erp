import { TrendingUp, TrendingDown, Globe, Network, ArrowUpRight, ArrowDownRight, Download, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { KpiCard } from "@/components/KpiCard";
import { Sparkline } from "@/components/Sparkline";
import { ExportMenu } from "@/components/ExportMenu";
import { prisma } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";

const REGION_AR: Record<string, string> = { MENA: "الشرق الأوسط", US: "الولايات المتحدة", EU: "أوروبا", ASIA: "آسيا" };
const REGION_EN: Record<string, string> = { MENA: "MENA", US: "US", EU: "EU", ASIA: "Asia" };

export default async function MarketsPage() {
  const ar = getLocale() === "ar";
  const stocks = await prisma.marketStock.findMany({
    orderBy: [{ region: "asc" }, { changePct: "desc" }],
    include: { company: true },
  });

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
        <HeroPanel
          gradient="linear-gradient(135deg, #0c1424 0%, #1e3a8a 40%, #3b82f6 80%, #93c5fd 110%)"
          accent="#3b82f6"
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
                  <Globe className="h-12 w-12 text-white" />
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
                  <BarChart3 className="h-3 w-3 hn-anim-pulse-soft" />
                  {ar ? "نبضات السوق — حي" : "Market pulse · live"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "الأسواق العالمية" : "Global Markets"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "H-Nerve يجمع كل أسهم المجموعة ويقارنها بأسواق العالم — قرارات على أرضية معلومات."
                    : "H-Nerve aggregates every group equity and benchmarks against the world — decisions on data."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <ExportMenu type="markets" locale={ar ? "ar" : "en"} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
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
        </HeroPanel>

        {/* KPI strip */}
        <section className="grid gap-4 stagger sm:grid-cols-2 xl:grid-cols-4">
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

        {/* Group equities highlighted */}
        <section className="space-y-3">
          <div className="section-title">{ar ? "أسهم مجموعة الحوراني" : "Hourani Group Equities"}</div>
          <div className="grid gap-3 stagger lg:grid-cols-2 xl:grid-cols-3">
            {groupStocks.map((s) => (
              <StockCard key={s.id} stock={s} ar={ar} highlighted />
            ))}
          </div>
        </section>

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
              <div className="grid gap-3 stagger md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/12 px-3 py-2 backdrop-blur ring-1 ring-white/20">
      <div className="text-[10px] uppercase tracking-widest opacity-75">{label}</div>
      <div className="mt-0.5 text-base font-extrabold">{value}</div>
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
        <div className="absolute end-0 top-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white"
             style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)", borderBottomLeftRadius: 12 }}>
          {ar ? "مجموعة الحوراني" : "Hourani Group"}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold" style={{ color: "var(--text-muted)" }}>{stock.ticker}</div>
          <div className="line-clamp-1 text-sm font-extrabold" style={{ color: "var(--text)" }}>
            {ar && stock.labelAr ? stock.labelAr : stock.label}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stock.exchange}</div>
        </div>
        <span className={up ? "badge-emerald" : "badge-red"}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {up ? "+" : ""}{stock.changePct.toFixed(2)}٪
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-black" style={{ color: "var(--text)" }}>
            {stock.lastPrice.toLocaleString(ar ? "ar-JO" : "en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stock.currency}</div>
        </div>
        <Sparkline data={history} width={120} height={42} positive={up} />
      </div>
    </div>
  );
}
