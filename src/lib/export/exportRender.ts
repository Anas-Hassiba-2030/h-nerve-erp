// SVG chart renderers for HTML exports — inline so PDFs print without
// external dependencies. Pure string outputs.

import type { KpiCard, TrendSeries, DistributionBucket } from "@/lib/export/exportAnalytics";

const TONE_BG: Record<string, string> = {
  emerald: "#ecfdf5",
  amber: "#fef3c7",
  rose: "#fff1f2",
  blue: "#eff6ff",
  violet: "#f5f3ff",
  slate: "#f8fafc",
};
const TONE_FG: Record<string, string> = {
  emerald: "#047857",
  amber: "#b45309",
  rose: "#be123c",
  blue: "#1d4ed8",
  violet: "#6d28d9",
  slate: "#475569",
};
const TONE_BORDER: Record<string, string> = {
  emerald: "#a7f3d0",
  amber: "#fde68a",
  rose: "#fecdd3",
  blue: "#bfdbfe",
  violet: "#ddd6fe",
  slate: "#e2e8f0",
};

export function escapeHtml(s: any): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderKpiGrid(kpis: KpiCard[], ar: boolean): string {
  if (kpis.length === 0) return "";
  return `<div class="kpi-grid">${kpis
    .map((k) => {
      const tone = k.tone ?? "slate";
      const bg = TONE_BG[tone];
      const fg = TONE_FG[tone];
      const bd = TONE_BORDER[tone];
      const deltaHtml = k.delta
        ? `<span class="kpi-delta" style="color:${k.delta.positive ? "#047857" : "#be123c"}">${k.delta.positive ? "▲" : "▼"} ${(Math.abs(k.delta.pct) * 100).toFixed(1)}%</span>`
        : "";
      return `<div class="kpi-card" style="background:${bg};border-color:${bd}">
        <div class="kpi-label" style="color:${fg}">${escapeHtml(ar ? k.label_ar : k.label_en)}</div>
        <div class="kpi-value" style="color:${fg}">${escapeHtml(k.value)}</div>
        ${deltaHtml}
      </div>`;
    })
    .join("")}</div>`;
}

// Multi-series area+line chart, returns inline SVG.
export function renderTrendChart(series: TrendSeries[], ar: boolean): string {
  if (series.length === 0 || series[0].values.length === 0) return "";
  const W = 880;
  const H = 240;
  const PAD_L = 60;
  const PAD_R = 16;
  const PAD_T = 24;
  const PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = series[0].values.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  const xLabels = series[0].xLabels;

  // Y grid
  const ySteps = 4;
  const yGrid: string[] = [];
  for (let i = 0; i <= ySteps; i++) {
    const v = (max / ySteps) * (ySteps - i);
    const y = PAD_T + (innerH / ySteps) * i;
    yGrid.push(
      `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="#e6e2d3" stroke-width="1" stroke-dasharray="${i === ySteps ? "0" : "3,3"}"/>`,
      `<text x="${PAD_L - 8}" y="${y + 3}" text-anchor="end" font-size="9" font-family="Inter,system-ui,sans-serif" font-weight="700" fill="#94a3b8">${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}</text>`,
    );
  }

  // X labels
  const xAxis: string[] = [];
  const labelEvery = Math.max(1, Math.floor(n / 8));
  for (let i = 0; i < n; i++) {
    if (i % labelEvery !== 0 && i !== n - 1) continue;
    const x = PAD_L + i * stepX;
    xAxis.push(
      `<text x="${x}" y="${H - PAD_B + 14}" text-anchor="middle" font-size="9" font-family="Inter,system-ui,sans-serif" font-weight="700" fill="#94a3b8">${escapeHtml(xLabels[i] ?? "")}</text>`,
    );
  }

  // Series rendering
  const seriesSvg = series
    .map((s, idx) => {
      const points = s.values.map((v, i) => {
        const x = PAD_L + i * stepX;
        const y = PAD_T + innerH - (v / max) * innerH;
        return [x, y] as const;
      });
      const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
      const fillPath =
        idx === 0
          ? `${path} L${PAD_L + (n - 1) * stepX},${PAD_T + innerH} L${PAD_L},${PAD_T + innerH} Z`
          : "";
      const dots = points
        .map(
          (p) =>
            `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="white" stroke="${s.color}" stroke-width="1.5"/>`,
        )
        .join("");
      return `
        <defs>
          <linearGradient id="trend-grad-${idx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${s.color}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${fillPath ? `<path d="${fillPath}" fill="url(#trend-grad-${idx})"/>` : ""}
        <path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
      `;
    })
    .join("");

  // Legend
  const legend = series
    .map(
      (s) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(ar ? s.label_ar : s.label_en)}</span>`,
    )
    .join("");

  return `
    <div class="chart-card">
      <div class="chart-legend">${legend}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
        ${yGrid.join("")}
        ${seriesSvg}
        ${xAxis.join("")}
      </svg>
    </div>
  `;
}

// Horizontal bar chart for distribution buckets.
export function renderDistribution(buckets: DistributionBucket[], ar: boolean): string {
  if (buckets.length === 0) return "";
  const max = Math.max(1, ...buckets.map((b) => Math.abs(b.value)));
  const total = buckets.reduce((a, b) => a + Math.abs(b.value), 0);

  const rows = buckets
    .map((b) => {
      const pct = total > 0 ? (Math.abs(b.value) / total) * 100 : 0;
      const widthPct = (Math.abs(b.value) / max) * 100;
      // Negatives keep two decimals (a precise debit), non-negatives use the
      // grouped integer format. (The old `b.value < 0 ? … : "+"` inner branch
      // was dead — `isNeg` already guaranteed the value was negative.)
      const valueStr =
        b.value < 0
          ? b.value.toFixed(2)
          : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(b.value);
      return `
        <div class="dist-row">
          <span class="dist-label">${escapeHtml(b.label)}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar" style="width:${widthPct.toFixed(1)}%;background:${b.color}"></div>
          </div>
          <span class="dist-value">${valueStr}</span>
          <span class="dist-pct">${pct.toFixed(1)}%</span>
        </div>
      `;
    })
    .join("");

  return `<div class="dist-grid">${rows}</div>`;
}
