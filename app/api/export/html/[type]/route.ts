import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { COMPANY_BRANDS, PERSONAL_BRANDS } from "@/lib/companyBrand";
import {
  financeAnalytics, hotelsAnalytics, dairyAnalytics, farmsAnalytics,
  supplyAnalytics, sustainabilityAnalytics, projectsAnalytics, marketsAnalytics,
  type ExportAnalytics,
} from "@/lib/exportAnalytics";
import { renderKpiGrid, renderTrendChart, renderDistribution, escapeHtml } from "@/lib/exportRender";

// =====================================================================
// Branded executive HTML report — print-friendly to PDF.
// Each export type carries: KPI strip, trend chart, distribution chart,
// AI commentary, and the full data table.
// =====================================================================

function logoSvg(brandKey: string, size = 56): string {
  const brand = COMPANY_BRANDS[brandKey] ?? COMPANY_BRANDS.HH;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-${brandKey}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brand.accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0a4d3a"/>
    </linearGradient>
  </defs>
  <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="url(#g-${brandKey})" stroke="white" stroke-width="2"/>
  <text x="50" y="64" text-anchor="middle" font-family="Cairo, system-ui, sans-serif" font-size="42" font-weight="900" fill="white">${brand.emblem}</text>
</svg>`;
}

function partnerSvg(brandKey: "ANAS_AI" | "HASIBA_G"): string {
  const b = PERSONAL_BRANDS[brandKey];
  return `
<svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="88" height="88" rx="20" fill="#0a0a0a" stroke="${b.accent}" stroke-width="3"/>
  <text x="50" y="62" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${brandKey === "ANAS_AI" ? 32 : 28}" font-weight="900" fill="white">${b.emblem}</text>
</svg>`;
}

function reportNumber(brandKey: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HN-${brandKey}-${date}-${rand}`;
}

function pageShell({
  title, subtitle, brandKey, content, locale, analytics, recordCount,
}: {
  title: string;
  subtitle: string;
  brandKey: string;
  content: string;
  locale: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}) {
  const brand = COMPANY_BRANDS[brandKey] ?? COMPANY_BRANDS.HH;
  const ar = locale === "ar";
  const dir = ar ? "rtl" : "ltr";
  const lang = ar ? "ar" : "en";
  const now = new Date();
  const nowText = now.toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US");
  const reportId = reportNumber(brandKey);

  const kpiHtml = analytics ? renderKpiGrid(analytics.kpis, ar) : "";
  const trendHtml =
    analytics?.trend && analytics.trend.series.length
      ? `<section class="block">
          <div class="block-head">
            <span class="block-mark"></span>
            <h2>${escapeHtml(ar ? analytics.trend.title_ar : analytics.trend.title_en)}</h2>
          </div>
          ${renderTrendChart(analytics.trend.series, ar)}
        </section>`
      : "";
  const distHtml =
    analytics?.distribution && analytics.distribution.buckets.length
      ? `<section class="block">
          <div class="block-head">
            <span class="block-mark"></span>
            <h2>${escapeHtml(ar ? analytics.distribution.title_ar : analytics.distribution.title_en)}</h2>
          </div>
          ${renderDistribution(analytics.distribution.buckets, ar)}
        </section>`
      : "";
  const commentaryHtml = analytics
    ? `<section class="commentary">
        <div class="commentary-mark">AI</div>
        <div>
          <div class="commentary-label">${ar ? "ملاحظة تحليلية" : "Analyst note"}</div>
          <p>${escapeHtml(ar ? analytics.commentary_ar : analytics.commentary_en)}</p>
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>H-Nerve ERP — ${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    :root {
      --brand: ${brand.accent};
      --brand-soft: ${brand.accentSoft};
      --ink: #0f1f1c;
      --ink-soft: #586670;
      --line: #e6e2d3;
      --line-soft: #f0ece0;
      --paper: #faf7ee;
      --card: #ffffff;
    }
    body {
      font-family: ${ar ? "'Cairo'" : "'Inter'"}, 'Cairo', system-ui, sans-serif;
      margin: 0; padding: 0;
      color: var(--ink);
      background: var(--paper);
      -webkit-font-smoothing: antialiased;
      letter-spacing: ${ar ? "0" : "-0.005em"};
    }
    a { color: inherit; }

    /* ====== Watermark ====== */
    .watermark {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: 0.04;
      background-image:
        radial-gradient(ellipse at 30% 20%, var(--brand) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, var(--brand) 0%, transparent 50%);
    }
    .watermark::before {
      content: 'H-NERVE';
      position: absolute;
      inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', sans-serif;
      font-size: 220px; font-weight: 900;
      color: var(--brand);
      opacity: 0.35;
      transform: rotate(-22deg);
      letter-spacing: 0.1em;
    }

    /* ====== Print bar ====== */
    .print-bar {
      position: sticky; top: 0; z-index: 50;
      background: linear-gradient(135deg, #0a4d3a 0%, var(--brand) 110%);
      color: white;
      padding: 10px 24px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 4px 12px -4px rgba(0,0,0,0.15);
    }
    .print-bar-text { font-size: 12px; font-weight: 800; letter-spacing: 0.04em; }
    .print-bar-text small { display:block; opacity: 0.75; font-weight: 600; font-size: 10px; margin-top: 2px; }
    .print-actions { display: flex; gap: 8px; }
    .print-btn {
      background: white;
      color: #0a4d3a;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 11px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .print-btn:hover { transform: scale(1.04); }
    .print-btn-ghost {
      background: rgba(255,255,255,0.12);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
    }

    /* ====== Page ====== */
    .page {
      position: relative; z-index: 1;
      max-width: 1100px;
      margin: 24px auto 64px;
      padding: 0 24px;
    }

    /* ====== Hero ====== */
    .hero {
      background: ${brand.gradient};
      color: white;
      border-radius: 22px;
      padding: 32px 36px;
      box-shadow: 0 18px 40px -12px rgba(10,77,58,0.35);
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .hero::after {
      content: '';
      position: absolute; top: -40%; right: -10%;
      width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-row {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
      position: relative; z-index: 1;
    }
    .hero-left { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .hero h1 {
      margin: 0;
      font-size: 30px;
      letter-spacing: -0.015em;
      font-weight: 900;
      line-height: 1.15;
    }
    .hero h1 small { font-weight: 600; opacity: 0.7; font-size: 22px; }
    .hero .sub {
      font-size: 12.5px;
      opacity: 0.86;
      margin-top: 6px;
      font-weight: 600;
    }
    .hero-meta {
      display: flex; gap: 8px; flex-wrap: wrap;
      margin-top: 14px;
    }
    .hero-chip {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
      padding: 5px 11px; border-radius: 8px;
      font-size: 10.5px; font-weight: 800;
      letter-spacing: 0.02em;
    }
    .hero-chip b { font-weight: 900; }

    .partners {
      display: flex; flex-direction: column; gap: 8px;
      flex-shrink: 0;
    }
    .partner {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.28);
      padding: 8px 12px; border-radius: 12px;
      backdrop-filter: blur(6px);
    }
    .partner-name { font-size: 11px; font-weight: 800; }
    .partner-tag { font-size: 9px; opacity: 0.78; font-weight: 600; }

    /* ====== Document meta strip ====== */
    .doc-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      margin: 18px 0 24px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
    }
    .doc-meta-cell {
      padding: 12px 16px;
      border-${ar ? "left" : "right"}: 1px solid var(--line);
    }
    .doc-meta-cell:last-child { border: none; }
    .doc-meta-label {
      font-size: 9px; font-weight: 800;
      color: var(--ink-soft);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .doc-meta-value {
      font-size: 12px; font-weight: 800;
      color: var(--ink);
      margin-top: 3px;
      font-family: 'Inter', monospace;
    }

    /* ====== Block ====== */
    .block {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 22px 24px;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    .block-head {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px;
    }
    .block-mark {
      width: 4px; height: 18px; border-radius: 2px;
      background: linear-gradient(180deg, var(--brand) 0%, #0a4d3a 100%);
    }
    .block h2 {
      margin: 0;
      font-size: 13px; font-weight: 900;
      letter-spacing: 0.02em;
      color: var(--ink);
    }

    /* ====== KPI grid ====== */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin: 16px 0 20px;
    }
    .kpi-card {
      border: 1px solid;
      border-radius: 14px;
      padding: 14px 16px;
      position: relative;
      background: white;
    }
    .kpi-label {
      font-size: 10px; font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.85;
    }
    .kpi-value {
      font-family: 'Inter', monospace;
      font-size: 20px; font-weight: 900;
      margin-top: 4px;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .kpi-delta {
      display: inline-block;
      margin-top: 4px;
      font-size: 10px; font-weight: 800;
      font-family: 'Inter', monospace;
    }

    /* ====== Chart cards ====== */
    .chart-card { background: white; }
    .chart-legend {
      display: flex; gap: 16px;
      margin-bottom: 8px;
      font-size: 10.5px; font-weight: 700;
      color: var(--ink-soft);
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot {
      width: 10px; height: 10px;
      border-radius: 3px;
      display: inline-block;
    }

    /* ====== Distribution rows ====== */
    .dist-grid { display: flex; flex-direction: column; gap: 8px; }
    .dist-row {
      display: grid;
      grid-template-columns: 160px 1fr auto auto;
      align-items: center;
      gap: 12px;
      font-size: 11px;
    }
    .dist-label {
      font-weight: 800;
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dist-bar-wrap {
      height: 12px;
      background: #f1ecdf;
      border-radius: 6px;
      overflow: hidden;
    }
    .dist-bar {
      height: 100%; border-radius: 6px;
      transition: width 0.5s;
    }
    .dist-value {
      font-family: 'Inter', monospace;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      min-width: 64px;
      text-align: ${ar ? "left" : "right"};
    }
    .dist-pct {
      font-size: 10px;
      color: var(--ink-soft);
      font-weight: 700;
      min-width: 40px;
      text-align: ${ar ? "left" : "right"};
    }

    /* ====== Commentary ====== */
    .commentary {
      display: flex; gap: 14px;
      margin: 16px 0 24px;
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--brand-soft) 0%, white 90%);
      border: 1px solid var(--brand);
      border-radius: 14px;
      page-break-inside: avoid;
    }
    .commentary-mark {
      flex-shrink: 0;
      width: 42px; height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--brand) 0%, #0a4d3a 100%);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900;
      font-family: 'Inter', sans-serif;
      letter-spacing: 0.05em;
    }
    .commentary-label {
      font-size: 9px; font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--brand);
    }
    .commentary p {
      margin: 4px 0 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.6;
      color: var(--ink);
    }

    /* ====== Table ====== */
    .table-wrap {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      margin: 16px 0;
    }
    table {
      width: 100%; border-collapse: collapse;
      font-size: 11.5px;
    }
    th, td {
      padding: 11px 14px;
      text-align: ${ar ? "right" : "left"};
      border-bottom: 1px solid var(--line-soft);
    }
    th {
      background: linear-gradient(135deg, #0a4d3a 0%, var(--brand) 110%);
      color: white;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      position: relative;
    }
    tbody tr:nth-child(even) td { background: #fcfaf3; }
    tbody tr:hover td { background: var(--brand-soft); }
    td {
      font-weight: 600;
    }
    td.num {
      font-family: 'Inter', monospace;
      font-variant-numeric: tabular-nums;
      font-weight: 800;
    }

    /* ====== Footer ====== */
    .footer {
      margin-top: 32px;
      padding: 18px 22px;
      background: linear-gradient(135deg, #0a4d3a 0%, #1a5d4a 100%);
      color: white;
      border-radius: 14px;
      page-break-inside: avoid;
    }
    .footer-row {
      display: flex; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }
    .footer-block { font-size: 10px; opacity: 0.92; }
    .footer-block b { font-weight: 900; opacity: 1; display: block; margin-bottom: 2px; }
    .footer-id {
      font-family: 'Inter', monospace;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .footer-bar {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.18);
      font-size: 9px;
      opacity: 0.7;
      text-align: center;
      letter-spacing: 0.08em;
    }

    /* ====== Empty ====== */
    .empty {
      padding: 48px 32px;
      text-align: center;
      color: var(--ink-soft);
      font-size: 12px;
      font-weight: 700;
    }

    /* ====== Print ====== */
    @media print {
      body { background: white; }
      .watermark { display: none; }
      .print-bar { display: none; }
      .page { padding: 0; margin: 0; max-width: none; }
      .block, .footer, .commentary, .doc-meta { box-shadow: none !important; page-break-inside: avoid; }
      .hero { box-shadow: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin: 14mm 12mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="watermark"></div>
  <div class="print-bar">
    <div class="print-bar-text">
      ${ar ? "تقرير تحليلي تنفيذي — H-Nerve ERP" : "Executive analytics report — H-Nerve ERP"}
      <small>${escapeHtml(brand.nameEn)} · ${escapeHtml(reportId)}</small>
    </div>
    <div class="print-actions">
      <button class="print-btn print-btn-ghost" onclick="history.back()">${ar ? "← رجوع" : "← Back"}</button>
      <button class="print-btn" onclick="window.print()">${ar ? "🖨 طباعة / PDF" : "🖨 Print / PDF"}</button>
    </div>
  </div>

  <div class="page">
    <header class="hero">
      <div class="hero-row">
        <div class="hero-left">
          ${logoSvg(brandKey, 64)}
          <div>
            <h1>${escapeHtml(title)} <small>· ${escapeHtml(ar ? brand.name : brand.nameEn)}</small></h1>
            <div class="sub">${escapeHtml(ar ? brand.motto : brand.mottoEn)} · ${escapeHtml(subtitle)}</div>
            <div class="hero-meta">
              <span class="hero-chip">📄 <b>${recordCount}</b> ${ar ? "سجل" : "records"}</span>
              <span class="hero-chip">🗓 ${escapeHtml(now.toISOString().slice(0, 10))}</span>
              <span class="hero-chip">🆔 ${escapeHtml(reportId)}</span>
              <span class="hero-chip">🌐 ${ar ? "العربية" : "English"}</span>
            </div>
          </div>
        </div>
        <div class="partners">
          <div class="partner">
            ${partnerSvg("ANAS_AI")}
            <div>
              <div class="partner-name">${escapeHtml(PERSONAL_BRANDS.ANAS_AI.nameEn)}</div>
              <div class="partner-tag">${escapeHtml(PERSONAL_BRANDS.ANAS_AI.mottoEn)}</div>
            </div>
          </div>
          <div class="partner">
            ${partnerSvg("HASIBA_G")}
            <div>
              <div class="partner-name">${escapeHtml(PERSONAL_BRANDS.HASIBA_G.nameEn)}</div>
              <div class="partner-tag">${escapeHtml(PERSONAL_BRANDS.HASIBA_G.mottoEn)}</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="doc-meta">
      <div class="doc-meta-cell">
        <div class="doc-meta-label">${ar ? "التقرير" : "Report"}</div>
        <div class="doc-meta-value">${escapeHtml(title)}</div>
      </div>
      <div class="doc-meta-cell">
        <div class="doc-meta-label">${ar ? "الإصدار" : "Issued"}</div>
        <div class="doc-meta-value">${escapeHtml(nowText)}</div>
      </div>
      <div class="doc-meta-cell">
        <div class="doc-meta-label">${ar ? "الجهة" : "Entity"}</div>
        <div class="doc-meta-value">${escapeHtml(ar ? brand.name : brand.nameEn)}</div>
      </div>
      <div class="doc-meta-cell">
        <div class="doc-meta-label">${ar ? "النظام" : "System"}</div>
        <div class="doc-meta-value">H-Nerve ERP v1.3</div>
      </div>
    </div>

    ${kpiHtml ? `<section class="block">
      <div class="block-head">
        <span class="block-mark"></span>
        <h2>${ar ? "الموجز التنفيذي" : "Executive summary"}</h2>
      </div>
      ${kpiHtml}
      ${commentaryHtml}
    </section>` : ""}

    ${trendHtml}

    ${distHtml}

    <section class="block">
      <div class="block-head">
        <span class="block-mark"></span>
        <h2>${ar ? "البيانات التفصيلية" : "Detailed records"}</h2>
      </div>
      ${content || `<div class="empty">${ar ? "لا توجد سجلات." : "No records."}</div>`}
    </section>

    <footer class="footer">
      <div class="footer-row">
        <div class="footer-block">
          <b>${ar ? "مجموعة الحوراني — نظام داخلي" : "Hourani Group — Internal system"}</b>
          ${ar ? "تقرير سرّي · للقيادة التنفيذية" : "Confidential · For executive leadership"}
        </div>
        <div class="footer-block" style="text-align:${ar ? "left" : "right"}">
          <b>H-Nerve ERP v1.3</b>
          <span class="footer-id">${escapeHtml(reportId)}</span>
        </div>
      </div>
      <div class="footer-bar">
        ${ar ? "بدعم من" : "Powered by"}
        H-Nerve · ${ar ? "أنس م.ك. حصيبة" : "Anas MK Hasiba"} ·
        © ${now.getFullYear()}
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function tableFromRows(headers: string[], rows: Array<Array<{ v: string; num?: boolean }>>): string {
  if (rows.length === 0) return "";
  const headHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyHtml = rows
    .map(
      (r) =>
        `<tr>${r
          .map((c) => `<td${c.num ? ' class="num"' : ""}>${escapeHtml(c.v)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

const NUM = (n: number, d = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(n || 0);

function formatGroupCommentary(
  c: { tx: number; bookings: number; batches: number; farms: number; fc: number; esg: number; projs: number; companies: number },
  ar: boolean,
): string {
  if (ar) {
    return `تقرير شامل يغطي ${c.companies} شركة في مجموعة الحوراني · ${NUM(c.tx)} معاملة مالية، ${NUM(c.bookings)} حجز فندقي، ${NUM(c.batches)} دفعة ألبان، ${NUM(c.farms)} مزرعة، ${NUM(c.fc)} تنبؤ AI نشط، ${NUM(c.esg)} تقييم استدامة، و ${NUM(c.projs)} مشروع في خط الأنابيب. هذه اللقطة تعكس النبض الموحد للنظام العصبي للحوراني.`;
  }
  return `Whole-group view spanning ${c.companies} Hourani business units · ${NUM(c.tx)} financial transactions, ${NUM(c.bookings)} hotel bookings, ${NUM(c.batches)} dairy batches, ${NUM(c.farms)} farms, ${NUM(c.fc)} active AI forecasts, ${NUM(c.esg)} ESG scores, and ${NUM(c.projs)} pipeline projects. This snapshot reflects the unified pulse of Hourani's central nervous system.`;
}

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "ar";
  const ar = locale === "ar";
  const companyCode = url.searchParams.get("company") ?? "HH";
  const type = params.type;

  let title = "Export";
  let subtitle = "";
  let html = "";
  let analytics: ExportAnalytics | null = null;
  let recordCount = 0;

  switch (type) {
    case "finance": {
      title = ar ? "المركز المالي — المعاملات" : "Finance — Transactions";
      const tx = await prisma.transaction.findMany({
        orderBy: { occurredAt: "desc" },
        include: { company: true, createdBy: true },
        take: 500,
      });
      analytics = financeAnalytics(tx as any);
      recordCount = tx.length;
      subtitle = ar
        ? `${tx.length} معاملة · ${analytics.kpis.find((k) => k.label_en === "Revenue")?.value ?? ""}`
        : `${tx.length} transactions · ${analytics.kpis.find((k) => k.label_en === "Revenue")?.value ?? ""}`;
      html = tableFromRows(
        ar
          ? ["مرجع", "تاريخ", "شركة", "نوع", "فئة", "مبلغ", "عملة", "بواسطة"]
          : ["Reference", "Date", "Company", "Kind", "Category", "Amount", "Currency", "By"],
        tx.map((t) => [
          { v: t.reference, num: true },
          { v: t.occurredAt.toISOString().slice(0, 10), num: true },
          { v: t.company.name },
          { v: t.kind },
          { v: t.category },
          { v: NUM(t.amount), num: true },
          { v: t.currency, num: true },
          { v: t.createdBy?.name ?? "—" },
        ]),
      );
      break;
    }
    case "hotels": {
      title = ar ? "الضيافة — الفنادق والحجوزات" : "Hospitality — Hotels & Bookings";
      const bookings = await prisma.booking.findMany({
        orderBy: { checkIn: "desc" },
        include: { hotel: { include: { company: true } } },
        take: 500,
      });
      analytics = hotelsAnalytics(bookings as any);
      recordCount = bookings.length;
      subtitle = ar
        ? `${bookings.length} حجز عبر شبكة الفنادق`
        : `${bookings.length} bookings across the hotel network`;
      html = tableFromRows(
        ar
          ? ["مرجع", "فندق", "ضيف", "غرفة", "وصول", "مغادرة", "إيراد", "حالة"]
          : ["Ref", "Hotel", "Guest", "Room", "Check-in", "Check-out", "Revenue", "Status"],
        bookings.map((b) => [
          { v: b.reference, num: true },
          { v: b.hotel.name },
          { v: b.guestName },
          { v: b.roomType },
          { v: b.checkIn.toISOString().slice(0, 10), num: true },
          { v: b.checkOut.toISOString().slice(0, 10), num: true },
          { v: NUM(b.revenue), num: true },
          { v: b.status },
        ]),
      );
      break;
    }
    case "dairy": {
      title = ar ? "إنتاج الألبان — المها" : "Dairy Production — Maha";
      const batches = await prisma.dairyBatch.findMany({
        orderBy: { productionDate: "desc" },
        take: 500,
      });
      analytics = dairyAnalytics(batches as any);
      recordCount = batches.length;
      subtitle = ar
        ? `${batches.length} دفعة · ${analytics.kpis.find((k) => k.label_en === "Output (L)")?.value ?? ""} لتر`
        : `${batches.length} batches · ${analytics.kpis.find((k) => k.label_en === "Output (L)")?.value ?? ""} L`;
      html = tableFromRows(
        ar
          ? ["دفعة", "منتج", "كمية (لتر)", "جودة", "دهن%", "إنتاج", "صلاحية", "وجهة", "حالة"]
          : ["Batch", "Product", "Quantity (L)", "Quality", "Fat%", "Production", "Expiry", "Destination", "Status"],
        batches.map((b) => [
          { v: b.batchNumber, num: true },
          { v: ar ? b.productAr : b.product },
          { v: NUM(b.quantityLiters), num: true },
          { v: b.qualityGrade },
          { v: b.fatContent.toFixed(1), num: true },
          { v: b.productionDate.toISOString().slice(0, 10), num: true },
          { v: b.expiryDate.toISOString().slice(0, 10), num: true },
          { v: b.destination ?? "—" },
          { v: b.status },
        ]),
      );
      break;
    }
    case "farms": {
      title = ar ? "المزارع والمحاصيل — لوران" : "Farms & Crops — Loran";
      const farms = await prisma.farm.findMany({
        include: { company: true, crops: true },
      });
      analytics = farmsAnalytics(farms as any);
      recordCount = farms.length;
      subtitle = ar
        ? `${farms.length} مزرعة · ${analytics.kpis.find((k) => k.label_en === "Area (du)")?.value ?? ""} دونم`
        : `${farms.length} farms · ${analytics.kpis.find((k) => k.label_en === "Area (du)")?.value ?? ""} dunum`;
      html = tableFromRows(
        ar
          ? ["مزرعة", "شركة", "نوع", "موقع", "مساحة (دونم)", "حرارة°", "رطوبة%", "تربة%", "تنبيه", "محاصيل"]
          : ["Farm", "Company", "Type", "Location", "Area (du)", "Temp°", "Humidity%", "Soil%", "Alert", "Crops"],
        farms.map((f) => [
          { v: f.name },
          { v: f.company.name },
          { v: f.type },
          { v: f.location },
          { v: NUM(f.areaDunum), num: true },
          { v: f.tempC?.toFixed(1) ?? "—", num: true },
          { v: f.humidity?.toFixed(0) ?? "—", num: true },
          { v: f.soilMoisture?.toFixed(0) ?? "—", num: true },
          { v: f.alertLevel },
          { v: NUM(f.crops.length), num: true },
        ]),
      );
      break;
    }
    case "supply-chain": {
      title = ar ? "سلسلة التوريد التنبؤية — جسر AI" : "Predictive Supply Chain — AI Bridge";
      const fc = await prisma.supplyForecast.findMany({
        where: { deletedAt: null },
        orderBy: { periodStart: "asc" },
        include: { source: true, target: true },
      });
      analytics = supplyAnalytics(fc as any);
      recordCount = fc.length;
      subtitle = ar
        ? `${fc.length} تنبؤ · متوسط ثقة ${analytics.kpis.find((k) => k.label_en === "Avg confidence")?.value ?? ""}`
        : `${fc.length} forecasts · ${analytics.kpis.find((k) => k.label_en === "Avg confidence")?.value ?? ""} avg confidence`;
      html = tableFromRows(
        ar
          ? ["من", "إلى", "فئة", "منتج", "طلب", "وحدة", "ثقة", "فترة", "حالة"]
          : ["From", "To", "Category", "Product", "Demand", "Unit", "Confidence", "Period", "Status"],
        fc.map((f) => [
          { v: f.source.name },
          { v: f.target.name },
          { v: f.category },
          { v: f.productLabel },
          { v: NUM(f.predictedDemand), num: true },
          { v: f.unit },
          { v: (f.confidence * 100).toFixed(0) + "%", num: true },
          { v: `${f.periodStart.toISOString().slice(0, 10)} → ${f.periodEnd.toISOString().slice(0, 10)}`, num: true },
          { v: f.status },
        ]),
      );
      break;
    }
    case "sustainability": {
      title = ar ? "الاستدامة و ESG" : "Sustainability & ESG";
      const scores = await prisma.sustainabilityScore.findMany({
        orderBy: [{ year: "asc" }, { period: "asc" }],
        include: { company: true },
      });
      analytics = sustainabilityAnalytics(scores as any);
      recordCount = scores.length;
      subtitle = ar
        ? `${scores.length} تقييم عبر شركات المجموعة`
        : `${scores.length} scores across the group`;
      html = tableFromRows(
        ar
          ? ["شركة", "فترة", "سنة", "بيئي", "اجتماعي", "حوكمة", "شامل", "كربون (طن)", "مياه (م³)", "متجدد %"]
          : ["Company", "Period", "Year", "E", "S", "G", "Overall", "Carbon (t)", "Water (m³)", "Renew %"],
        scores.map((s) => [
          { v: s.company.name },
          { v: s.period },
          { v: s.year.toString(), num: true },
          { v: s.environmentalScore.toFixed(1), num: true },
          { v: s.socialScore.toFixed(1), num: true },
          { v: s.governanceScore.toFixed(1), num: true },
          { v: s.overall.toFixed(1), num: true },
          { v: NUM(s.carbonTons), num: true },
          { v: NUM(s.waterCubicM), num: true },
          { v: s.renewablePct.toFixed(1), num: true },
        ]),
      );
      break;
    }
    case "projects": {
      title = ar ? "خط الأنابيب — المشاريع المستقبلية" : "Pipeline — Future Projects";
      const projs = await prisma.futureProject.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: { company: true },
      });
      analytics = projectsAnalytics(projs as any);
      recordCount = projs.length;
      subtitle = ar
        ? `${projs.length} مشروع · ${analytics.kpis.find((k) => k.label_en === "Total budget")?.value ?? ""}`
        : `${projs.length} projects · ${analytics.kpis.find((k) => k.label_en === "Total budget")?.value ?? ""}`;
      html = tableFromRows(
        ar
          ? ["شركة", "عنوان", "مرحلة", "أولوية", "ميزانية", "بدء", "هدف", "تقدم", "مالك"]
          : ["Company", "Title", "Stage", "Priority", "Budget", "Start", "Target", "Progress", "Owner"],
        projs.map((p) => [
          { v: p.company.name },
          { v: p.title },
          { v: p.stage },
          { v: p.priority },
          { v: NUM(p.budgetJod), num: true },
          { v: p.startQuarter ?? "—" },
          { v: p.targetQuarter ?? "—" },
          { v: p.progressPct.toFixed(0) + "%", num: true },
          { v: p.ownerName ?? "—" },
        ]),
      );
      break;
    }
    case "markets": {
      title = ar ? "الأسواق العالمية — قائمة المتابعة" : "Global Markets — Watchlist";
      const stocks = await prisma.marketStock.findMany({ orderBy: { region: "asc" } });
      analytics = marketsAnalytics(stocks as any);
      recordCount = stocks.length;
      subtitle = ar
        ? `${stocks.length} سهم عبر ${new Set(stocks.map((s) => s.region)).size} منطقة`
        : `${stocks.length} stocks across ${new Set(stocks.map((s) => s.region)).size} regions`;
      html = tableFromRows(
        ar
          ? ["رمز", "اسم", "بورصة", "منطقة", "آخر سعر", "عملة", "تغير %"]
          : ["Ticker", "Label", "Exchange", "Region", "Last", "Currency", "Change %"],
        stocks.map((s) => [
          { v: s.ticker, num: true },
          { v: ar && s.labelAr ? s.labelAr : s.label },
          { v: s.exchange },
          { v: s.region },
          { v: NUM(s.lastPrice, 2), num: true },
          { v: s.currency },
          { v: (s.changePct >= 0 ? "+" : "") + s.changePct.toFixed(2) + "%", num: true },
        ]),
      );
      break;
    }
    case "all": {
      // GROUP PULSE — combined mega-report covering every module in one document.
      title = ar ? "نبض المجموعة — التقرير الشامل" : "Group Pulse — Combined Report";
      subtitle = ar
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

      recordCount = tx.length + bookings.length + batches.length + farms.length +
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

      analytics = {
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

      html = [
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
      break;
    }
    default:
      return new NextResponse("Unknown export type", { status: 400 });
  }

  const body = pageShell({
    title,
    subtitle,
    brandKey: companyCode,
    content: html,
    locale,
    analytics,
    recordCount,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
