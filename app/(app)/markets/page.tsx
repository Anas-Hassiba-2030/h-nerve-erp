import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { ExportMenu } from "@/components/ExportMenu";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyRevenue30dMap, notionalValuationFromRevenue30d } from "@/lib/finance";
import "../daylight.css";

export const dynamic = "force-dynamic";

const REGION_AR: Record<string, string> = { MENA: "الشرق الأوسط", US: "الولايات المتحدة", EU: "أوروبا", ASIA: "آسيا" };
const REGION_EN: Record<string, string> = { MENA: "MENA", US: "US", EU: "EU", ASIA: "Asia" };

export default async function MarketsPage() {
  const ar = getLocale() === "ar";
  const [stocks, companies] = await Promise.all([
    prisma.marketStock.findMany({ orderBy: [{ region: "asc" }, { changePct: "desc" }], include: { company: true } }),
    prisma.company.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, nameEn: true, sector: true, employees: true } }),
  ]);

  const revenueMap = await getCompanyRevenue30dMap(companies.map((c) => c.id));
  const valuationByCompany = new Map<string, number>();
  for (const c of companies) valuationByCompany.set(c.id, notionalValuationFromRevenue30d(revenueMap.get(c.id) ?? 0));

  const byRegion = stocks.reduce<Record<string, typeof stocks>>((acc, s) => { (acc[s.region] ??= []).push(s); return acc; }, {});
  const groupStocks = stocks.filter((s) => s.companyId !== null);
  const allUp = stocks.filter((s) => s.changePct >= 0).length;
  const allDown = stocks.length - allUp;
  const groupAvgChange = groupStocks.length > 0 ? groupStocks.reduce((acc, s) => acc + s.changePct, 0) / groupStocks.length : 0;
  const topMover = stocks.length ? stocks.reduce((acc, s) => (Math.abs(s.changePct) > Math.abs(acc.changePct) ? s : acc), stocks[0]) : null;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "النمو والاستثمار · الأسواق" : "Growth & Capital · Markets"}
        title={ar ? "الأسواق العالمية" : "Global Markets"}
        subtitle={ar ? "تتبّع أسهم شركات المجموعة إلى جانب قائمة مرجعية من الأسواق العالمية والإقليمية." : "Track group equities alongside global and regional benchmarks."}
        status={ar ? "مباشر" : "Live"}
        actions={<ExportMenu type="markets" locale={ar ? "ar" : "en"} />}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "حركة أسهم المجموعة" : "Group equity move"} value={`${groupAvgChange >= 0 ? "+" : ""}${groupAvgChange.toFixed(2)}%`} hint={ar ? "متوسط ٥ أسهم قابضة" : "Avg of 5 group tickers"} delta={{ dir: groupAvgChange >= 0 ? "up" : "down", text: `${groupAvgChange.toFixed(2)}%` }} />
        <DaylightKpi label={ar ? "صاعدون" : "Advancers"} value={formatNumber(allUp)} hint={ar ? `من أصل ${formatNumber(stocks.length)} سهم` : `of ${formatNumber(stocks.length)} tracked`} delta={{ dir: "up", text: formatNumber(allUp) }} />
        <DaylightKpi label={ar ? "هابطون" : "Decliners"} value={formatNumber(allDown)} delta={allDown > 0 ? { dir: "down", text: formatNumber(allDown) } : undefined} />
        <DaylightKpi label={ar ? "أعلى تحرّك" : "Top mover"} value={topMover ? `${topMover.changePct >= 0 ? "+" : ""}${topMover.changePct.toFixed(2)}%` : "—"} hint={topMover ? (ar ? topMover.labelAr ?? topMover.label : topMover.label) : undefined} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "أسهم مجموعة الحوراني" : "Hourani Group Equities"} aside={ar ? "تقييم داخلي · إيراد ٣٠ يوماً × ٨" : "Internal valuation · 30d revenue × 8"}>
        <div className="prop-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {companies.map((c) => {
            const valuation = valuationByCompany.get(c.id) ?? 0;
            return (
              <div key={c.id} className="prop-card" style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", color: "var(--ink-muted)" }}>{c.code}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: ".1em", color: "var(--ink-muted)" }}>MENA · INTERNAL</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{ar ? c.name : c.nameEn}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: "var(--emerald)", fontVariantNumeric: "tabular-nums" }}>{Math.round(valuation).toLocaleString("en-US")} JOD</div>
                <div style={{ fontSize: 10.5, marginTop: 4, color: "var(--ink-muted)" }}>{c.sector} · {formatNumber(c.employees)} {ar ? "موظف" : "staff"}</div>
              </div>
            );
          })}
        </div>
      </DaylightPanel>

      {groupStocks.length > 0 ? (
        <DaylightPanel title={ar ? "أسهم متداولة مرتبطة" : "Linked tradable tickers"}>
          <div className="prop-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {groupStocks.map((s) => <StockCard key={s.id} stock={s} ar={ar} highlighted />)}
          </div>
        </DaylightPanel>
      ) : null}

      {Object.entries(byRegion).map(([region, list]) => {
        const filtered = list.filter((s) => !s.companyId);
        if (filtered.length === 0) return null;
        return (
          <DaylightPanel key={region} title={ar ? REGION_AR[region] ?? region : REGION_EN[region] ?? region}>
            <div className="prop-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {filtered.map((s) => <StockCard key={s.id} stock={s} ar={ar} />)}
            </div>
          </DaylightPanel>
        );
      })}
    </DaylightShell>
  );
}

function StockCard({ stock, ar, highlighted = false }: { stock: any; ar: boolean; highlighted?: boolean }) {
  const history: number[] = (() => { try { return JSON.parse(stock.history || "[]"); } catch { return []; } })();
  const up = stock.changePct >= 0;
  return (
    <div className="prop-card relative overflow-hidden" style={{ padding: 16 }}>
      {highlighted ? (
        <div className="absolute end-0 top-0 px-3 py-1" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff", background: "linear-gradient(135deg, var(--gold) 0%, var(--brick) 100%)" }}>{ar ? "مجموعة الحوراني" : "Hourani Group"}</div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--ink-muted)" }}>{stock.ticker}</div>
          <div className="line-clamp-1" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{ar && stock.labelAr ? stock.labelAr : stock.label}</div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{stock.exchange}</div>
        </div>
        <span className={`tag ${up ? "ok" : ""}`} style={!up ? { color: "#9a5648", background: "rgba(168,106,92,.16)" } : undefined}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{up ? "+" : ""}{stock.changePct.toFixed(2)}%
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{stock.lastPrice.toLocaleString(ar ? "ar-JO" : "en-US", { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{stock.currency}</div>
        </div>
        <Sparkline data={history} width={120} height={42} positive={up} />
      </div>
    </div>
  );
}
