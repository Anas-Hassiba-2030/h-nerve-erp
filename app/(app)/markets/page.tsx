import { Sparkline } from "@/components/Sparkline";
import { ExportMenu } from "@/components/ExportMenu";
import { prisma } from "@/lib/db/db";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCompanyRevenue30dMap, notionalValuationFromRevenue30d } from "@/lib/finance/finance";
import "../daylight.css";
import "./markets.css";

export const dynamic = "force-dynamic";

const REGION_AR: Record<string, string> = { MENA: "الشرق الأوسط", US: "الولايات المتحدة", EU: "أوروبا", ASIA: "آسيا" };
const REGION_EN: Record<string, string> = { MENA: "MENA", US: "US", EU: "EU", ASIA: "Asia" };
const REGION_TAG_AR: Record<string, string> = { MENA: "إقليمي", US: "دولي", EU: "دولي", ASIA: "إقليمي" };
const REGION_TAG_EN: Record<string, string> = { MENA: "Regional", US: "International", EU: "International", ASIA: "Regional" };

export default async function MarketsPage() {
  const ar = getLocale() === "ar";
  const [stocks, companies] = await Promise.all([
    prisma.marketStock.findMany({ orderBy: [{ region: "asc" }, { changePct: "desc" }], include: { company: true } }),
    prisma.company.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, nameEn: true, sector: true, employees: true } }),
  ]);

  const revenueMap = await getCompanyRevenue30dMap(companies.map((c) => c.id));
  const valuationByCompany = new Map<string, number>();
  for (const c of companies) valuationByCompany.set(c.id, notionalValuationFromRevenue30d(revenueMap.get(c.id) ?? 0));
  const groupValuation = companies.reduce((acc, c) => acc + (valuationByCompany.get(c.id) ?? 0), 0);

  const byRegion = stocks.reduce<Record<string, typeof stocks>>((acc, s) => { (acc[s.region] ??= []).push(s); return acc; }, {});
  const groupStocks = stocks.filter((s) => s.companyId !== null);
  const allUp = stocks.filter((s) => s.changePct >= 0).length;
  const allDown = stocks.length - allUp;
  const groupAvgChange = groupStocks.length > 0 ? groupStocks.reduce((acc, s) => acc + s.changePct, 0) / groupStocks.length : 0;
  const topMover = stocks.length ? stocks.reduce((acc, s) => (Math.abs(s.changePct) > Math.abs(acc.changePct) ? s : acc), stocks[0]) : null;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "النمو ورأس المال · الأسواق" : "Growth & Capital · Markets"}</div>
          <h1 className="sec-title">{ar ? "الأسواق" : "Markets"}</h1>
          <p className="sec-sub">
            {ar
              ? "تقييم المجموعة الداخلي والأسهم العامة المرتبطة — أبرز المحرّكات حسب المنطقة."
              : "Group internal valuation and linked public equities — top movers by region."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · سوق مفتوح" : "Live · market open"}</span>
          <div className="sec-actions">
            <ExportMenu type="markets" locale={ar ? "ar" : "en"} />
          </div>
        </div>
      </header>

      {/* ── KPI band ── */}
      <section className="kpi-grid reveal reveal-stagger">
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "تقييم المجموعة" : "Group valuation"}</div>
          <div className="kpi-val">{Math.round(groupValuation).toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US")}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "دينار · إيراد ٣٠ يوماً × ٨" : "JOD · 30d revenue × 8"}</span>
            <span className={`delta ${groupAvgChange >= 0 ? "up" : "down"}`}>{groupAvgChange >= 0 ? "▲" : "▾"} {groupAvgChange >= 0 ? "+" : ""}{groupAvgChange.toFixed(2)}%</span>
          </div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "أعلى تحرّك" : "Top mover"}</div>
          <div className="kpi-val" style={{ fontSize: 24 }}>{topMover ? (ar ? topMover.labelAr ?? topMover.label : topMover.label) : "—"}</div>
          <div className="kpi-foot"><span className="kpi-hint">{topMover ? `${topMover.changePct >= 0 ? "+" : ""}${topMover.changePct.toFixed(1)}% ${ar ? "اليوم" : "today"}` : "—"}</span></div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "صاعدون" : "Advancers"}</div>
          <div className="kpi-val">{formatNumber(allUp)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? `من أصل ${formatNumber(stocks.length)} سهم` : `of ${formatNumber(stocks.length)} tracked`}</span>
            {allDown > 0 ? <span className="delta down">▾ {formatNumber(allDown)}</span> : null}
          </div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "الأسهم المرتبطة" : "Linked tickers"}</div>
          <div className="kpi-val">{formatNumber(groupStocks.length)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{ar ? `عبر ${formatNumber(Object.keys(byRegion).length)} مناطق` : `across ${formatNumber(Object.keys(byRegion).length)} regions`}</span></div>
        </div>
      </section>

      {/* ── Hourani Group equities (internal valuation) ── */}
      <div className="mk-region reveal">
        <h2>
          {ar ? "أسهم مجموعة الحوراني" : "Hourani Group equities"}
          <span className="rg">{ar ? "تقييم داخلي" : "Internal"}</span>
        </h2>
        <div className="mk-grid">
          {companies.map((c) => {
            const valuation = valuationByCompany.get(c.id) ?? 0;
            return (
              <div key={c.id} className="stock">
                <div className="sk-top">
                  <span className="sym">{c.code}</span>
                  <span className="ch up">{ar ? "داخلي" : "INTERNAL"}</span>
                </div>
                <div className="nm">{ar ? c.name : c.nameEn}</div>
                <div className="px">{Math.round(valuation).toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US")} {ar ? "د" : "JOD"}</div>
                <div className="nm" style={{ margin: "8px 0 0" }}>{c.sector} · {formatNumber(c.employees)} {ar ? "موظف" : "staff"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── linked tradable tickers ── */}
      {groupStocks.length > 0 ? (
        <div className="mk-region reveal">
          <h2>
            {ar ? "أسهم متداولة مرتبطة" : "Linked tradable tickers"}
            <span className="rg">{ar ? "مجموعة الحوراني" : "Hourani Group"}</span>
          </h2>
          <div className="mk-grid">
            {groupStocks.map((s) => <StockCard key={s.id} stock={s} ar={ar} />)}
          </div>
        </div>
      ) : null}

      {/* ── benchmarks grouped by region ── */}
      {Object.entries(byRegion).map(([region, list]) => {
        const filtered = list.filter((s) => !s.companyId);
        if (filtered.length === 0) return null;
        return (
          <div key={region} className="mk-region reveal">
            <h2>
              {ar ? REGION_AR[region] ?? region : REGION_EN[region] ?? region}
              <span className="rg">{ar ? REGION_TAG_AR[region] ?? "" : REGION_TAG_EN[region] ?? ""}</span>
            </h2>
            <div className="mk-grid">
              {filtered.map((s) => <StockCard key={s.id} stock={s} ar={ar} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockCard({ stock, ar }: { stock: any; ar: boolean }) {
  const history: number[] = (() => { try { return JSON.parse(stock.history || "[]"); } catch { return []; } })();
  const up = stock.changePct >= 0;
  return (
    <div className="stock">
      <div className="sk-top">
        <span className="sym">{stock.ticker}</span>
        <span className={`ch ${up ? "up" : "down"}`}>{up ? "+" : ""}{stock.changePct.toFixed(1)}%</span>
      </div>
      <div className="nm">{ar && stock.labelAr ? stock.labelAr : stock.label} · {stock.exchange}</div>
      <div className="px">{stock.lastPrice.toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US", { maximumFractionDigits: 2 })} <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{stock.currency}</span></div>
      {history.length >= 2 ? <div className="mt-2"><Sparkline data={history} width={188} height={40} positive={up} /></div> : null}
    </div>
  );
}
