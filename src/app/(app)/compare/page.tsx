export const dynamic = "force-dynamic";
// Side-by-side company comparison view — Claude Design "compare" daylight section.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCompanyBrand } from "@/lib/utils/companyBrand";
import { formatMoney, formatNumber, SECTORS_AR, SECTORS_EN, loc } from "@/lib/utils/utils";
import "../daylight.css";
import "./compare.css";

export default async function ComparePage(props: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const searchParams = await props.searchParams;
  const ar = (await getLocale()) === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const [companies, transactions, esg, allFarms, allHotels, allDairy, allPrograms, allForecasts] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } }, orderBy: { occurredAt: "desc" }, take: 3000 }),
    prisma.sustainabilityScore.findMany({ orderBy: [{ year: "asc" }, { period: "asc" }], take: 500 }),
    prisma.farm.findMany({ take: 100 }), prisma.hotel.findMany({ take: 100 }), prisma.dairyBatch.findMany({ take: 200 }), prisma.program.findMany({ take: 100 }), prisma.supplyForecast.findMany({ take: 500 }),
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

  // shared scales so the bars are comparable across the two columns
  const maxRev = Math.max(dA?.revenue ?? 0, dB?.revenue ?? 0, 1);
  const maxEmp = Math.max(dA?.employees ?? 0, dB?.employees ?? 0, 1);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "النمو ورأس المال · مقارنة" : "Growth & Capital · Compare"}</div>
          <h1 className="sec-title">{ar ? "مقارنة الوحدات" : "Compare Units"}</h1>
          <p className="sec-sub">
            {ar
              ? "اختر شركتين لمقارنة الإيراد والهامش والاستدامة والبصمة التشغيلية جنباً إلى جنب."
              : "Pick two companies and compare revenue, margin, ESG and operational footprint side-by-side."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر" : "Live"}</span>
        </div>
      </header>

      {/* ── pickers ── */}
      <form className="cmp-pickers reveal" method="get" action="/compare">
        <div className="cmp-sel">
          <label htmlFor="selA">{ar ? "الشركة الأولى" : "First company"}</label>
          <select id="selA" name="a" defaultValue={aId ?? ""}>
            {companies.map((c) => (<option key={c.id} value={c.id}>{ar ? c.name : c.nameEn}</option>))}
          </select>
        </div>
        <span className="cmp-vs">⚔</span>
        <div className="cmp-sel">
          <label htmlFor="selB">{ar ? "الشركة الثانية" : "Second company"}</label>
          <select id="selB" name="b" defaultValue={bId ?? ""}>
            {companies.map((c) => (<option key={c.id} value={c.id}>{ar ? c.name : c.nameEn}</option>))}
          </select>
        </div>
        <button type="submit" className="cmp-sel" style={{ alignSelf: "flex-end" }}>
          <span className="dl-btn dl-btn-secondary">{ar ? "قارن" : "Compare"}</span>
        </button>
      </form>

      {!A || !B || !dA || !dB || !brandA || !brandB ? (
        <div className="panel reveal" style={{ textAlign: "center", color: "var(--ink-muted)" }}>{ar ? "اختر شركتين لرؤية المقارنة." : "Pick two companies to see the comparison."}</div>
      ) : (
        <>
          {/* ── head-to-head columns ── */}
          <div className="cmp-cols">
            <CompareColumn co={A} d={dA} brand={brandA} color="var(--emerald)" ar={ar} lc={lc} maxRev={maxRev} maxEmp={maxEmp} />
            <CompareColumn co={B} d={dB} brand={brandB} color="var(--gold)" ar={ar} lc={lc} maxRev={maxRev} maxEmp={maxEmp} />
          </div>

          {/* ── revenue curve (both companies) ── */}
          <div
            className="reveal"
            style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 18, padding: 20 }}
          >
            <div style={{ fontFamily: "var(--dl-display)", fontSize: 20, fontWeight: 600, color: "var(--emerald)", marginBottom: 4 }}>
              {ar ? "منحنى الإيراد · ١٢ شهراً" : "Revenue curve · 12 months"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 16 }}>
              {ar
                ? `الأخضر = ${A.name} · الذهبي = ${B.name}`
                : `Green = ${A.nameEn} · Gold = ${B.nameEn}`}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700 }}><span style={{ display: "block", height: 8, width: 16, borderRadius: 999, background: "var(--emerald)" }} /><span style={{ color: "var(--ink)" }}>{ar ? A.name : A.nameEn}</span></div>
                <AreaLineChart data={dA.trend} height={160} color="var(--emerald)" formatY={(v) => formatMoney(v)} />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700 }}><span style={{ display: "block", height: 8, width: 16, borderRadius: 999, background: "var(--gold)" }} /><span style={{ color: "var(--ink)" }}>{ar ? B.name : B.nameEn}</span></div>
                <AreaLineChart data={dB.trend} height={160} color="var(--gold)" formatY={(v) => formatMoney(v)} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2" style={{ marginTop: 16 }}>
            <Link href={`/companies/${A.id}`} className="prop-card flex items-center justify-between" style={{ padding: "14px 18px" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{ar ? `ملف ${A.name} الكامل` : `${A.nameEn} full profile`}</span><ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--gold)" }} /></Link>
            <Link href={`/companies/${B.id}`} className="prop-card flex items-center justify-between" style={{ padding: "14px 18px" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{ar ? `ملف ${B.name} الكامل` : `${B.nameEn} full profile`}</span><ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--gold)" }} /></Link>
          </div>
        </>
      )}
    </div>
  );
}

function CompareColumn({
  co, d, brand, color, ar, lc, maxRev, maxEmp,
}: {
  co: { code: string; name: string; nameEn: string; sector: string };
  d: { revenue: number; net: number; margin: number; lastEsg: number; employees: number };
  brand: { accent: string; emblem: string };
  color: string;
  ar: boolean;
  lc: "ar" | "en";
  maxRev: number;
  maxEmp: number;
}) {
  return (
    <div className="cmp-card reveal">
      <div className="cmp-head" style={{ background: `linear-gradient(135deg, ${brand.accent}, ${brand.accent}cc)` }}>
        <div className="lg">{brand.emblem}</div>
        <div>
          <div className="nm">{ar ? co.name : co.nameEn}</div>
          <div className="sc">{loc(SECTORS_AR, SECTORS_EN, lc, co.sector)}</div>
        </div>
      </div>
      <div className="cmp-body">
        <Metric label={ar ? "الإيراد (١٢ش)" : "Revenue (12mo)"} disp={formatMoney(d.revenue)} pct={(d.revenue / maxRev) * 100} color={color} />
        <Metric label={ar ? "الهامش" : "Margin"} disp={`${(d.margin * 100).toFixed(1)}%`} pct={Math.max(0, Math.min(100, d.margin * 100))} color={color} />
        <Metric label={ar ? "الاستدامة ESG" : "ESG"} disp={d.lastEsg ? `${d.lastEsg.toFixed(1)}/100` : "—"} pct={Math.min(100, d.lastEsg)} color={color} />
        <Metric label={ar ? "الفريق" : "Team"} disp={`${formatNumber(d.employees)} ${ar ? "موظف" : "staff"}`} pct={(d.employees / maxEmp) * 100} color={color} />
      </div>
    </div>
  );
}

function Metric({ label, disp, pct, color }: { label: string; disp: string; pct: number; color: string }) {
  return (
    <div className="cmp-metric">
      <div className="ml"><span>{label}</span><b>{disp}</b></div>
      <div className="cmp-bar"><span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(90deg, ${color}b3, ${color})` }} /></div>
    </div>
  );
}
