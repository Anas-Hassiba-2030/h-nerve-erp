import "server-only";
import { prisma } from "@/lib/db/db";
import { COMPANY_BRANDS } from "@/lib/utils/companyBrand";
import {
  financeAnalytics, hotelsAnalytics, dairyAnalytics, farmsAnalytics,
  supplyAnalytics, sustainabilityAnalytics, projectsAnalytics, marketsAnalytics,
  type ExportAnalytics,
} from "@/lib/export/exportAnalytics";
import { renderKpiGrid, renderTrendChart, renderDistribution, escapeHtml } from "@/lib/export/exportRender";
import { NUM, formatGroupCommentary } from "./shell";

export async function renderAll(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  // GROUP PULSE — combined mega-report covering every module in one document.
  const title = ar ? "نبض المجموعة — التقرير الشامل" : "Group Pulse — Combined Report";
  const subtitle = ar
    ? "تقرير تنفيذي موحد عبر كل وحدات الحوراني"
    : "Unified executive report across all Hourani business units";

  const [tx, bookings, batches, farms, fc, esg, projs, stocks, companies] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { occurredAt: "desc" },
      include: { company: true, createdBy: true },
      where: {
        occurredAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.booking.findMany({
      orderBy: { checkIn: "desc" },
      include: { hotel: { include: { company: true } } },
      take: 200,
    }),
    prisma.dairyBatch.findMany({
      orderBy: { productionDate: "desc" },
      take: 200,
    }),
    prisma.farm.findMany({ include: { company: true, crops: true } }),
    prisma.supplyForecast.findMany({
      where: { deletedAt: null },
      orderBy: { periodStart: "asc" },
      include: { source: true, target: true },
    }),
    prisma.sustainabilityScore.findMany({
      orderBy: [{ year: "asc" }, { period: "asc" }],
      include: { company: true },
    }),
    prisma.futureProject.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { company: true },
    }),
    prisma.marketStock.findMany({ orderBy: { region: "asc" } }),
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const recordCount = tx.length + bookings.length + batches.length + farms.length +
    fc.length + esg.length + projs.length + stocks.length;

  // Compute per-module analytics + roll up a top-level group summary.
  const finA = financeAnalytics(tx as any);
  const hosA = hotelsAnalytics(bookings as any);
  const dairyA = dairyAnalytics(batches as any);
  const farmA = farmsAnalytics(farms as any);
  const supA = supplyAnalytics(fc as any);
  const esgA = sustainabilityAnalytics(esg as any);
  const projA = projectsAnalytics(projs as any);
  const mktA = marketsAnalytics(stocks as any);

  const groupKpis = [
    finA.kpis.find((k) => k.label_en === "Revenue"),
    finA.kpis.find((k) => k.label_en === "Net"),
    finA.kpis.find((k) => k.label_en === "Margin"),
    hosA.kpis.find((k) => k.label_en === "Bookings"),
    dairyA.kpis.find((k) => k.label_en === "Output (L)"),
    farmA.kpis.find((k) => k.label_en === "Farms"),
    supA.kpis.find((k) => k.label_en === "Forecasts"),
    esgA.kpis.find((k) => k.label_en === "Avg overall"),
    projA.kpis.find((k) => k.label_en === "Total budget"),
    mktA.kpis.find((k) => k.label_en === "Avg change"),
  ].filter(Boolean) as any[];

  const analytics: ExportAnalytics = {
    kpis: groupKpis,
    trend: finA.trend,
    distribution: null,
    commentary_ar: `${ar ? "" : ""}${formatGroupCommentary(
      { tx: tx.length, bookings: bookings.length, batches: batches.length, farms: farms.length, fc: fc.length, esg: esg.length, projs: projs.length, companies: companies.length },
      true,
    )}`,
    commentary_en: formatGroupCommentary(
      { tx: tx.length, bookings: bookings.length, batches: batches.length, farms: farms.length, fc: fc.length, esg: esg.length, projs: projs.length, companies: companies.length },
      false,
    ),
  };

  // Build modular content sections.
  const buildSection = (
    sectionTitle: string,
    a: ExportAnalytics,
    emoji: string,
  ): string => {
    const tone = "var(--brand)";
    const trendBlock = a.trend && a.trend.series.length
      ? `<div style="margin-top:14px"><div style="font-size:11px;font-weight:800;color:${tone};margin-bottom:6px">${escapeHtml(ar ? a.trend.title_ar : a.trend.title_en)}</div>${renderTrendChart(a.trend.series, ar)}</div>`
      : "";
    const distBlock = a.distribution && a.distribution.buckets.length
      ? `<div style="margin-top:14px"><div style="font-size:11px;font-weight:800;color:${tone};margin-bottom:8px">${escapeHtml(ar ? a.distribution.title_ar : a.distribution.title_en)}</div>${renderDistribution(a.distribution.buckets, ar)}</div>`
      : "";
    return `<section class="block">
          <div class="block-head">
            <span class="block-mark"></span>
            <h2>${emoji} ${escapeHtml(sectionTitle)}</h2>
          </div>
          ${renderKpiGrid(a.kpis, ar)}
          <div style="margin-top:8px;padding:10px 14px;background:var(--brand-soft);border-radius:10px;font-size:12px;font-weight:600;color:var(--ink);line-height:1.6">
            <b style="color:var(--brand);font-weight:900">${ar ? "تحليل" : "Analysis"}: </b>
            ${escapeHtml(ar ? a.commentary_ar : a.commentary_en)}
          </div>
          ${trendBlock}
          ${distBlock}
        </section>`;
  };

  // Per-company strip — tiny cards
  const companyCards = companies.map((c) => {
    const rev = tx
      .filter((t) => t.companyId === c.id && t.kind === "REVENUE")
      .reduce((a, t) => a + t.amount, 0);
    const expense = tx
      .filter((t) => t.companyId === c.id && t.kind === "EXPENSE")
      .reduce((a, t) => a + t.amount, 0);
    const net = rev - expense;
    const esgScore = esg.find((s) => s.companyId === c.id)?.overall;
    const brand = COMPANY_BRANDS[c.code] ?? COMPANY_BRANDS.HH;
    return `<div style="background:white;border:1px solid var(--line);border-radius:12px;overflow:hidden">
          <div style="background:${brand.gradient};color:white;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border-radius:8px;font-weight:900;font-size:16px">${escapeHtml(brand.emblem)}</span>
            <div style="min-width:0;flex:1">
              <div style="font-weight:900;font-size:11.5px;line-height:1.2">${escapeHtml(ar ? c.name : c.nameEn)}</div>
              <div style="opacity:0.8;font-size:9.5px;font-weight:700;margin-top:2px">${escapeHtml(c.code)} · ${escapeHtml(c.sector)}</div>
            </div>
          </div>
          <div style="padding:10px 14px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10.5px">
            <div><span style="color:var(--ink-soft);font-weight:700">${ar ? "إيراد" : "Revenue"}: </span><b style="font-family:'Inter',monospace">${NUM(rev)}</b></div>
            <div><span style="color:var(--ink-soft);font-weight:700">${ar ? "صافي" : "Net"}: </span><b style="color:${net >= 0 ? "#047857" : "#be123c"};font-family:'Inter',monospace">${NUM(net)}</b></div>
            ${esgScore !== undefined ? `<div style="grid-column:1/-1"><span style="color:var(--ink-soft);font-weight:700">ESG: </span><b style="font-family:'Inter',monospace">${esgScore.toFixed(1)}/100</b></div>` : ""}
          </div>
        </div>`;
  }).join("");

  const companyStrip = `<section class="block">
        <div class="block-head">
          <span class="block-mark"></span>
          <h2>🏢 ${ar ? "نبض كل شركة" : "Per-company pulse"}</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">${companyCards}</div>
      </section>`;

  const html = [
    companyStrip,
    buildSection(ar ? "المركز المالي" : "Finance", finA, "💰"),
    buildSection(ar ? "الضيافة" : "Hospitality", hosA, "🏨"),
    buildSection(ar ? "الألبان" : "Dairy", dairyA, "🥛"),
    buildSection(ar ? "الزراعة" : "Agriculture", farmA, "🌾"),
    buildSection(ar ? "سلسلة التوريد التنبؤية" : "Predictive Supply", supA, "🧠"),
    buildSection(ar ? "الاستدامة (ESG)" : "Sustainability (ESG)", esgA, "🌱"),
    buildSection(ar ? "خط الأنابيب" : "Project Pipeline", projA, "🚀"),
    buildSection(ar ? "الأسواق العالمية" : "Global Markets", mktA, "📈"),
  ].join("\n");

  return { title, subtitle, html, analytics, recordCount };
}
