"use client";

// components/genesis/Constellation.tsx — Phase 21 Genesis preview.
//
// Renders the declarative recipe summary as a grid of sector "constellations":
// each card shows a small pulsing star-map of the entities the seed will
// create, a present/partial/empty status, and an expandable line-by-line diff
// (✓ present · ○ will create). Sleek Operator aesthetic (cyan-on-near-black).
// Pure presentational — all data comes from summarizeGenesis() on the server.

import { useState } from "react";
import type { GenesisSummary, SectorSummary } from "@/lib/genesis/recipes";

const STATUS_LABEL: Record<string, { ar: string; en: string; color: string }> = {
  complete: { ar: "مكتمل", en: "Complete", color: "#4ade80" },
  partial: { ar: "جزئي", en: "Partial", color: "#fbbf24" },
  empty: { ar: "سيُنشأ", en: "Will create", color: "var(--admin-cyan)" },
};

// Deterministic node positions per sector so the star-map is stable across
// renders (no layout jitter). Positions are percentages within the header box.
function nodesFor(n: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [
    [18, 30], [42, 18], [66, 34], [82, 22], [30, 62], [56, 70], [78, 60], [12, 52],
  ];
  return pts.slice(0, Math.max(3, Math.min(pts.length, n + 2)));
}

function SectorCard({ sector, ar, index }: { sector: SectorSummary; ar: boolean; index: number }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_LABEL[sector.status];
  const nodes = nodesFor(sector.lines.length);
  const lit = sector.status !== "empty";

  return (
    // Constellation-drop (C10): a card whose seed has completed (status !== empty,
    // i.e. `gx-lit`) drops into place — a brief brightness spike + a 200ms scale
    // settle from 1.04 → 1.0. Cards stagger by index so they land one after the
    // other, matching the moment the seeded page re-renders. Reduced motion is
    // honoured in CSS (the card simply appears, no scale/brightness).
    <div
      className={"gx-card" + (lit ? " gx-lit gx-drop" : "")}
      style={lit ? ({ "--gx-drop-delay": `${(index * 0.08).toFixed(2)}s` } as React.CSSProperties) : undefined}
    >
      <button
        type="button"
        className="gx-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="gx-map" aria-hidden="true">
          <svg viewBox="0 0 100 80" preserveAspectRatio="none">
            {nodes.map((a, i) =>
              i < nodes.length - 1 ? (
                <line key={"l" + i} x1={a[0]} y1={a[1]} x2={nodes[i + 1][0]} y2={nodes[i + 1][1]} className="gx-link" />
              ) : null,
            )}
            {nodes.map((p, i) => (
              <circle
                key={"c" + i}
                cx={p[0]}
                cy={p[1]}
                r={i === 0 ? 2.4 : 1.6}
                className="gx-node"
                style={{ animationDelay: `${(i * 0.4).toFixed(2)}s` }}
              />
            ))}
          </svg>
        </div>
        <div className="gx-meta">
          <div className="gx-title-row">
            <span className="gx-title">{ar ? sector.ar : sector.en}</span>
            <span className="gx-status" style={{ color: st.color, borderColor: st.color }}>
              {ar ? st.ar : st.en}
            </span>
          </div>
          <span className="gx-sub">{ar ? sector.subAr : sector.subEn}</span>
        </div>
        <span className="gx-chevron" data-open={open}>
          ▾
        </span>
      </button>

      {open && (
        <ul className="gx-lines">
          {sector.lines.map((l) => (
            <li key={l.key} className="gx-line">
              <span className="gx-line-mark" data-present={!l.missing}>
                {l.missing ? "○" : "✓"}
              </span>
              <span className="gx-line-name">{ar ? l.ar : l.en}</span>
              <span className="gx-line-count">
                {l.missing ? (
                  <span className="gx-will">
                    {ar ? "سيُنشئ" : "creates"} {l.approx ? "≈" : ""}
                    {l.target}
                    {l.approx ? "+" : ""}
                  </span>
                ) : (
                  <span className="gx-have">
                    {l.present.toLocaleString("en-US")} {ar ? "موجود" : "present"}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConstellationGrid({ summary, ar }: { summary: GenesisSummary; ar: boolean }) {
  return (
    <div className="gx-wrap">
      <div className="gx-legend">
        <span>
          {ar ? "القطاعات الموجودة" : "Sectors present"}:{" "}
          <b style={{ color: "var(--admin-cyan)" }}>
            {summary.sectorsPresent}/{summary.totalSectors}
          </b>
        </span>
        <span className="gx-legend-hint">
          {ar ? "اضغط على أي قطاع لعرض التفاصيل" : "Click any sector to expand"}
        </span>
      </div>
      <div className="gx-grid">
        {summary.sectors.map((s, i) => (
          <SectorCard key={s.id} sector={s} ar={ar} index={i} />
        ))}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.gx-wrap{margin-top:4px}
.gx-legend{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:12.5px;color:var(--admin-text-muted)}
.gx-legend-hint{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.04em;opacity:.7}
.gx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.gx-card{background:var(--admin-bg-2);border:1px solid var(--admin-rule);border-radius:12px;overflow:hidden;transition:border-color .25s}
.gx-card.gx-lit{border-color:var(--admin-rule-strong)}
/* Constellation-drop (C10): completed sector card settles into place — a brief
   brightness spike + a 200ms ease-out scale from 1.04 → 1.0 (no overshoot below
   1.0, no spring). Staggered per card via --gx-drop-delay. */
.gx-drop{transform-origin:50% 45%;animation:gxDrop 200ms var(--ease-out-quart,cubic-bezier(.25,1,.5,1)) var(--gx-drop-delay,0s) both}
@keyframes gxDrop{from{opacity:0;transform:scale(1.04);filter:brightness(1.6)}to{opacity:1;transform:scale(1);filter:brightness(1)}}
.gx-head{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:12px;width:100%;text-align:start;cursor:pointer;background:none;border:0;padding:14px 16px;color:inherit;font:inherit}
.gx-head:hover{background:rgba(255,255,255,.02)}
.gx-map{width:64px;height:44px;border-radius:8px;background:radial-gradient(ellipse at 50% 40%,rgba(34,211,238,.08),transparent 70%);overflow:hidden}
.gx-map svg{width:100%;height:100%}
.gx-link{stroke:rgba(34,211,238,.28);stroke-width:.5}
.gx-node{fill:var(--admin-cyan);opacity:.5;animation:gxTwinkle 3s ease-in-out infinite}
.gx-card.gx-lit .gx-node{opacity:.9}
@keyframes gxTwinkle{0%,100%{opacity:.35}50%{opacity:1}}
.gx-meta{min-width:0;display:flex;flex-direction:column;gap:3px}
.gx-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gx-title{font-size:14px;font-weight:700;color:var(--admin-text)}
.gx-status{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:1px solid;border-radius:999px;padding:2px 7px;font-family:'JetBrains Mono',ui-monospace,monospace}
.gx-sub{font-size:11.5px;color:var(--admin-text-muted);line-height:1.4;overflow:hidden;text-overflow:ellipsis}
.gx-chevron{color:var(--admin-text-muted);transition:transform .2s;font-size:12px}
.gx-chevron[data-open="true"]{transform:rotate(180deg)}
.gx-lines{list-style:none;margin:0;padding:4px 16px 14px;border-top:1px solid var(--admin-rule)}
.gx-line{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:10px;padding:6px 0;font-size:12.5px}
.gx-line-mark{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;text-align:center}
.gx-line-mark[data-present="true"]{color:#4ade80}
.gx-line-mark[data-present="false"]{color:var(--admin-cyan)}
.gx-line-name{color:var(--admin-text)}
.gx-line-count{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px}
.gx-have{color:#4ade80}
.gx-will{color:var(--admin-text-muted)}
@media (prefers-reduced-motion:reduce){ .gx-node{animation:none!important;opacity:.8} .gx-drop{animation:none!important;opacity:1;transform:none;filter:none} }
`;
