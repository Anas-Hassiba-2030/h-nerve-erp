// lib/exportRender.ts — turns analytics into inline HTML/SVG for branded
// exports + print-to-PDF. escapeHtml is the injection guard on every value
// that reaches an exported document. Pure string output, no IO.

import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  renderKpiGrid,
  renderTrendChart,
  renderDistribution,
} from "./exportRender";

describe("escapeHtml — the export injection guard", () => {
  it("null / undefined collapse to empty string (no 'null' in the PDF)", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
  it("escapes & < > and double-quote, & first (no double-encoding)", () => {
    expect(escapeHtml('<b>&"')).toBe("&lt;b&gt;&amp;&quot;");
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });
  it("coerces non-strings", () => {
    expect(escapeHtml(42)).toBe("42");
  });
  it("escapes single quotes to &#39; (safe in single-quoted attributes)", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
    expect(escapeHtml("a'b\"c")).toBe("a&#39;b&quot;c");
  });
});

describe("renderKpiGrid", () => {
  it("empty list → empty string (no stray grid div)", () => {
    expect(renderKpiGrid([], false)).toBe("");
  });
  it("renders the locale-correct label and the value", () => {
    const k = [{ label_ar: "إيراد", label_en: "Revenue", value: "JOD 10" }];
    expect(renderKpiGrid(k, false)).toContain("Revenue");
    expect(renderKpiGrid(k, true)).toContain("إيراد");
    expect(renderKpiGrid(k, false)).toContain("JOD 10");
  });
  it("delta direction uses ▲ for positive, ▼ for negative", () => {
    const up = renderKpiGrid([{ label_ar: "a", label_en: "a", value: "1", delta: { pct: 0.25, positive: true } }], false);
    const dn = renderKpiGrid([{ label_ar: "a", label_en: "a", value: "1", delta: { pct: 0.1, positive: false } }], false);
    expect(up).toContain("▲");
    expect(up).toContain("25.0%");
    expect(dn).toContain("▼");
  });
});

describe("renderTrendChart", () => {
  it("no series, or an empty series, → empty string", () => {
    expect(renderTrendChart([], false)).toBe("");
    expect(
      renderTrendChart([{ label_ar: "a", label_en: "a", values: [], xLabels: [], color: "#000" }], false),
    ).toBe("");
  });
  it("real series → inline <svg> carrying the legend label", () => {
    const out = renderTrendChart(
      [{ label_ar: "إيراد", label_en: "Rev", values: [1, 2, 3], xLabels: ["Jan", "Feb", "Mar"], color: "#0a7c4a" }],
      false,
    );
    expect(out).toContain("<svg");
    expect(out).toContain("Rev");
  });
});

describe("renderDistribution", () => {
  it("empty → empty string", () => {
    expect(renderDistribution([], false)).toBe("");
  });
  it("renders label, a 2-dp negative value, and a share %", () => {
    const out = renderDistribution(
      [
        { label: "Profit", value: 75, color: "#0a7c4a" },
        { label: "Loss", value: -25, color: "#b91c1c" },
      ],
      false,
    );
    expect(out).toContain("Profit");
    expect(out).toContain("-25.00"); // negative branch keeps 2 decimals
    expect(out).toMatch(/%/); // share percentage rendered
  });
});
