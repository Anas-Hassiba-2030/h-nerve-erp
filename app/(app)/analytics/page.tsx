import { AreaLineChart } from "@/components/charts/AreaLineChart";
import { prisma } from "@/lib/db/db";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCompanyBrand } from "@/lib/utils/companyBrand";
import { SECTORS_AR, SECTORS_EN } from "@/lib/utils/utils";
import { AnalyticsCovers, type Cover } from "./AnalyticsCovers";
import "../daylight.css";
import "./analytics.css";

export const dynamic = "force-dynamic";

export default async function AnalyticsHubPage() {
  const ar = getLocale() === "ar";
  const now = new Date();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const start12mo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [companies, transactions, forecasts, esg] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: start12mo } }, orderBy: { occurredAt: "desc" }, take: 3000 }),
    prisma.supplyForecast.findMany({ take: 500 }),
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
    // quarter-over-quarter growth: the most recent quarter vs the one before it
    // (trend[0] is the oldest month, trend[11] the most recent).
    const recent = trend.slice(9).reduce((a, v) => a + v, 0);
    const prior = trend.slice(6, 9).reduce((a, v) => a + v, 0);
    const growth = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : 0;
    return { company: c, trend, revenue, expense, net, margin, fcCount, lastEsg, growth };
  });

  const groupRevenue = data.reduce((a, x) => a + x.revenue, 0);
  const groupNet = data.reduce((a, x) => a + x.net, 0);

  const active = data.filter((d) => d.revenue > 0);
  const fastest = [...active].sort((a, b) => b.growth - a.growth)[0];
  const topRevenue = [...active].sort((a, b) => b.revenue - a.revenue)[0];
  const topMargin = [...active].sort((a, b) => b.margin - a.margin)[0];

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

  // cumulative growth curve (reference "منحنى النموّ التراكمي")
  const cumulative: number[] = [];
  let run = 0;
  for (const v of groupTrend) { run += v; cumulative.push(run); }

  // donut: revenue share by company
  const donut = active.map((d) => ({
    name: ar ? d.company.name : d.company.nameEn,
    value: d.revenue,
    color: getCompanyBrand(d.company.code).accent,
    pct: groupRevenue > 0 ? Math.round((d.revenue / groupRevenue) * 100) : 0,
  }));

  // benchmarks vs the group average (reference "المعايير المرجعية")
  const avgMargin = active.length ? active.reduce((a, x) => a + x.margin, 0) / active.length : 0;
  const withEsg = active.filter((d) => d.lastEsg > 0);
  const avgEsg = withEsg.length ? withEsg.reduce((a, x) => a + x.lastEsg, 0) / withEsg.length : 0;
  // Revenue benchmark: the leading company's revenue as a share of the average
  // company's revenue — a real "X% of avg" figure, not a hardcoded one.
  const avgRevenue = active.length ? groupRevenue / active.length : 0;
  const revLeadPct = avgRevenue > 0 ? Math.round(((topRevenue?.revenue ?? 0) / avgRevenue) * 100) : 0;
  const GOLD = "var(--gold)";
  const EM = "var(--emerald)";
  const benchmarks = [
    { label: ar ? "الإيراد" : "Revenue", val: Math.max(0, Math.min(100, revLeadPct)), disp: ar ? `${formatNumber(revLeadPct)}٪ من المتوسط` : `${revLeadPct}% of avg`, color: GOLD },
    { label: ar ? "الهامش" : "Margin", val: Math.round(avgMargin * 100), disp: `${Math.round(avgMargin * 100)}%`, color: EM },
    { label: "ESG", val: Math.round(avgEsg), disp: `${Math.round(avgEsg)} / 100`, color: GOLD },
    { label: ar ? "النموّ الفصلي" : "QoQ growth", val: Math.max(0, Math.min(100, fastest?.growth ?? 0)), disp: `${(fastest?.growth ?? 0) >= 0 ? "+" : ""}${formatNumber(fastest?.growth ?? 0)}%`, color: EM },
  ];

  // revenue bars (group revenue per month)
  const maxBar = Math.max(1, ...groupTrend);

  // covers (interactive client list)
  const sectorLabel = (s: string) => (ar ? SECTORS_AR[s] ?? s : SECTORS_EN[s] ?? s);
  const covers: Cover[] = data.map((d) => {
    const brand = getCompanyBrand(d.company.code);
    return {
      id: d.company.id,
      name: ar ? d.company.name : d.company.nameEn,
      emblem: brand.emblem,
      rev: formatMoney(d.revenue),
      growth: d.growth,
      growthText: formatNumber(Math.abs(d.growth)),
      sector: sectorLabel(d.company.sector),
    };
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "النمو ورأس المال · التحليلات" : "Growth & Capital · Analytics"}</div>
          <h1 className="sec-title">{ar ? "التحليلات" : "Analytics"}</h1>
          <p className="sec-sub">
            {ar
              ? "أداء المجموعة عبر اثني عشر شهراً — الإيراد، التوزيع، النموّ، والمعايير المرجعية."
              : "Group performance across twelve months — revenue, distribution, growth, and benchmarks."}
          </p>
        </div>
        <div className="sec-head-aside"><span className="sec-status"><span className="dot" />{ar ? "مباشر · مُحدّث" : "Live · updated"}</span></div>
      </div>

      <div className="an-callouts reveal">
        <div className="an-callout">
          <span className="ic">↗</span>
          <div>
            <div className="t">{ar ? "الأسرع نمواً" : "Fastest growing"}</div>
            <div className="v">{fastest ? `${ar ? fastest.company.name : fastest.company.nameEn} · ${fastest.growth >= 0 ? "+" : ""}${formatNumber(fastest.growth)}%` : "—"}</div>
          </div>
        </div>
        <div className="an-callout">
          <span className="ic">♔</span>
          <div>
            <div className="t">{ar ? "الأعلى إيراداً" : "Top revenue"}</div>
            <div className="v">{topRevenue ? (ar ? topRevenue.company.name : topRevenue.company.nameEn) : "—"}</div>
          </div>
        </div>
        <div className="an-callout">
          <span className="ic">⊕</span>
          <div>
            <div className="t">{ar ? "الأعلى هامشاً" : "Top margin"}</div>
            <div className="v">{topMargin ? `${ar ? topMargin.company.name : topMargin.company.nameEn} · ${Math.round(topMargin.margin * 100)}%` : "—"}</div>
          </div>
        </div>
      </div>

      <div className="an-grid">
        <div className="an-card reveal">
          <h2>{ar ? "إيراد المجموعة · ١٢ شهراً" : "Group revenue · 12 months"}</h2>
          <div className="sub">{ar ? "بالدينار الأردني · شهري" : "In JOD · monthly"}</div>
          <div className="an-bars">
            {groupTrend.map((v, i) => (
              <div className="bar" key={i}>
                <span className="col" style={{ height: `${(v / maxBar) * 100}%` }} />
                <span className="lbl">{monthLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="an-card reveal">
          <h2>{ar ? "توزيع الإيراد حسب القطاع" : "Revenue distribution by unit"}</h2>
          <div className="sub">{ar ? "حصة كل وحدة" : "Each unit's share"}</div>
          <div className="donut-wrap">
            <Donut data={donut} />
            <div className="donut-legend">
              {donut.map((s) => (
                <div className="lg-row" key={s.name}>
                  <span className="sw" style={{ background: s.color }} />
                  {s.name} · {formatNumber(s.pct)}%
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="an-card reveal">
          <h2>{ar ? "منحنى النموّ التراكمي" : "Cumulative growth curve"}</h2>
          <div className="sub">{ar ? "مؤشّر الأداء الموحّد" : "Unified performance index"}</div>
          <AreaLineChart data={cumulative} labels={monthLabels} height={150} color="var(--gold)" formatY={(v) => formatMoney(v)} />
        </div>

        <div className="an-card reveal">
          <h2>{ar ? "المعايير المرجعية" : "Benchmarks"}</h2>
          <div className="sub">{ar ? "مقابل متوسط القطاع" : "Vs sector average"}</div>
          <div className="an-bench">
            {benchmarks.map((b) => (
              <div className="bn-row" key={b.label}>
                <div className="bn-top">
                  <span className="bn-lbl">{b.label}</span>
                  <span className="bn-disp">{b.disp}</span>
                </div>
                <div className="bn-track">
                  <i style={{ width: `${Math.max(0, Math.min(100, b.val))}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnalyticsCovers
        covers={covers}
        allLabel={ar ? "الكل" : "All"}
        title={ar ? "الشركات" : "Companies"}
        sub={ar ? "انقر شركة للتفاصيل" : "Click a company for details"}
      />
    </div>
  );
}

/* Multi-segment revenue-share donut — mirrors the reference analytics-ops.js
   donut (rotated -90°, butt-cap segments). */
function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const size = 150;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const c = size / 2;
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const segs = data.map((d) => {
    const frac = d.value / total;
    const len = circ * frac;
    const seg = (
      <circle
        key={d.name}
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={d.color}
        strokeWidth={16}
        strokeDasharray={`${len} ${circ - len}`}
        strokeDashoffset={-acc}
      />
    );
    acc += len;
    return seg;
  });
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segs}
    </svg>
  );
}
