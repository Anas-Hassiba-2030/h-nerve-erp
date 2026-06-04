"use client";

// Scenario — the live what-if simulator, in the ORIGINAL "Claude Design"
// night register (docs/design/system/sections/whatif.html + whatif.js).
//
// Visual structure (faithful to the reference):
//   ┌── ribbon ─────────────────────────────────────────────────────────┐
//   │  [title box "ماذا لو"]  │  brain-read note (live narrative)          │
//   ├── grid ────────────────────────────────────────────────────────────┤
//   │  LEVERS panel   │   FLOW (in → brain hub → out + causal wires)  │ KPIs │
//   │  · source lever │   source ──▶ ◉ ──▶ top downstream impacts     │ net  │
//   │  · perturbation │                                               │ ...  │
//   └──────────────────────────────────────────────────────────────────────┘
//
// IMPORTANT: the simulation ENGINE is unchanged. We still run the real
// causal-graph weighted-BFS (`simulateOnSnapshot`) over the live graph
// snapshot, driven by a chosen source node + a signed perturbation delta.
// Every number on screen (impacts, KPIs, risk, narrative) is derived from
// that engine's `ImpactRow[]` output — nothing is fabricated. The reference
// `.js` behaviour (causal wave, flinch, count-ups, the room reacting, an
// auto-solve that animates the lever, reset) is translated into React
// state/effects below.
//
// Phase 2 of docs/PHASES-INTELLIGENCE.md.

import type { GraphNode, GraphEdge } from "@/lib/brain/graph";
import { useScenario } from "./useScenario";

// number formatting (Arabic-Indic digits when ar, grouped thousands)
function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}
function fmtInt(n: number, ar: boolean): string {
  const s = Math.round(n).toLocaleString("en-US");
  return ar ? toArabicDigits(s) : s;
}
function fmtPct(n: number, ar: boolean): string {
  // signed percentage, one decimal — uses the reference's − glyph for ar
  const sign = n >= 0 ? "+" : ar ? "−" : "-";
  const body = Math.abs(n).toFixed(1) + (ar ? "٪" : "%");
  return sign + (ar ? toArabicDigits(body) : body);
}

export function Scenario({
  nodes,
  edges,
  ar,
  defaultSourceId,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ar: boolean;
  defaultSourceId?: string;
}) {
  const {
    hubs,
    sourceId,
    setSourceId,
    delta,
    setDelta,
    source,
    totalAffected,
    top3,
    topExposure,
    avgConf,
    riskIndex,
    narrative,
    hubIntense,
    litSource,
    flinching,
    solving,
    flowRef,
    svgRef,
    vignetteOpacity,
    rewardOpacity,
    spinSeconds,
    handleSolve,
    handleReset,
    saved,
    handleSave,
    inNodes,
    outNodes,
    wires,
    sliderFill,
  } = useScenario({ nodes, edges, ar, defaultSourceId });

  return (
    <div className="wi-wrap" dir={ar ? "rtl" : "ltr"}>
      <div className="wi-vignette" style={{ opacity: vignetteOpacity }} aria-hidden />
      <div className="wi-reward" style={{ opacity: rewardOpacity }} aria-hidden />

      {/* ── ribbon: title box + brain-read note ───────────────────────── */}
      <div className="wi-ribbon">
        <div className="wi-title-box">
          <span className="eb">
            <span className="tick" />
            {ar ? "محاكاة سببية" : "Causal simulation"}
          </span>
          <h1>{ar ? "ماذا لو" : "What if"}</h1>
        </div>
        <div className="wi-note">
          <div className="eyebrow">
            <span className="pulse" />
            {ar ? "قراءة الدماغ" : "Brain read"}
          </div>
          <div className="narr">
            {!narrative || !source ? (
              ar
                ? "حرّك أيّ رافعة لتبدأ المحاكاة — أو دع الدماغ يحسب الأثر الأكبر."
                : "Move a lever to begin — or let the Brain probe the largest impact."
            ) : ar ? (
              <>
                لو <b>{narrative.direction} {source.label}</b> بنسبة{" "}
                <b>{toArabicDigits(narrative.pctAbs)}٪</b>، تصل الموجة إلى{" "}
                <b>{fmtInt(totalAffected, ar)}</b> كياناً.
                {top3.length > 0 ? (
                  <>
                    {" "}الأكبر تعرّضاً:{" "}
                    {top3.map((r, i) => (
                      <span key={r.node.id}>
                        <em>{r.node.label}</em>{" "}
                        <span className={r.projectedDelta < 0 ? "down" : "up"}>
                          ({narrative.dirTop(r)} {fmtPct(r.projectedDelta * 100, ar)})
                        </span>
                        {i < top3.length - 1 ? "، " : "."}
                      </span>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                If <b>{source.label} {narrative.direction}</b> by{" "}
                <b>{narrative.pctAbs}%</b>, the ripple reaches{" "}
                <b>{fmtInt(totalAffected, ar)}</b> connected entities.
                {top3.length > 0 ? (
                  <>
                    {" "}Top exposures:{" "}
                    {top3.map((r, i) => (
                      <span key={r.node.id}>
                        <em>{r.node.label}</em>{" "}
                        <span className={r.projectedDelta < 0 ? "down" : "up"}>
                          ({narrative.dirTop(r)} {fmtPct(r.projectedDelta * 100, ar)})
                        </span>
                        {i < top3.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── grid: levers · flow · KPIs ───────────────────────────────── */}
      <div className="wi-grid">
        {/* LEVERS */}
        <div className="wi-panel">
          <h2>{ar ? "الروافع" : "Levers"}</h2>
          <div className="sub">{ar ? "حرّكها لتغيّر مصير المجموعة" : "Move them to change the group's fate"}</div>

          {/* source lever (what to perturb) */}
          <div className="lever">
            <div className="lever-top">
              <span className="lever-name">{ar ? "المصدر" : "Source"}</span>
              <span className="lever-val" style={{ fontSize: 13 }}>
                <span className="unit">{source?.kind ?? "—"}</span>
              </span>
            </div>
            <SourcePicker hubs={hubs} value={sourceId} onChange={setSourceId} ar={ar} />
          </div>

          {/* perturbation lever (the hero slider — drives the engine) */}
          <div className={"lever" + (solving ? " brain-moving" : "")}>
            <div className="lever-top">
              <span className="lever-name">{ar ? "التغيير" : "Perturbation"}</span>
              <span className="lever-val">
                {fmtPct(delta * 100, ar)}
                <span
                  className={
                    "delta " + (Math.abs(delta) < 0.005 ? "zero" : delta > 0 ? "up" : "down")
                  }
                >
                  {Math.abs(delta) < 0.005 ? "●" : delta > 0 ? "▲" : "▼"}
                </span>
              </span>
            </div>
            <input
              type="range"
              className="wi-range"
              min={-1}
              max={1}
              step={0.01}
              value={delta}
              onChange={(e) => { if (!solving) setDelta(parseFloat(e.target.value)); }}
              style={{ ["--fill" as any]: sliderFill + "%" }}
              aria-label={ar ? "نسبة التغيير" : "perturbation"}
            />
          </div>

          {source ? (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid rgba(194,163,90,.14)",
              }}
            >
              <div className="sub" style={{ marginBottom: 4 }}>
                {ar ? "العقدة المختارة" : "Selected node"}
              </div>
              <div className="lever-val" style={{ fontSize: 18 }}>
                {source.label}
              </div>
            </div>
          ) : null}
        </div>

        {/* FLOW */}
        <div className="wi-panel wi-flow" ref={flowRef}>
          <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none">
            {wires.map((w) => (
              <path
                key={w.id}
                data-grp={w.grp}
                d={w.d}
                fill="none"
                stroke="#C2A35A"
                strokeWidth={w.grp === "in" ? (litSource ? 1.3 : 0.7) : 0.9}
                opacity={Math.abs(delta) > 0.005 ? 0.55 : 0.16}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="flow-cols">
            <div className="flow-side in">
              {inNodes.length === 0 ? (
                <div className="node dim">
                  <span className="nd" />
                  {ar ? "اختر مصدراً" : "Pick a source"}
                </div>
              ) : (
                inNodes.map((n) => (
                  <div key={n.id} className={"node" + (litSource ? " lit" : "")}>
                    <span className="nd" />
                    {n.label}
                  </div>
                ))
              )}
            </div>

            <div className={"brain-hub" + (hubIntense ? " intense" : "")} style={{ ["--spin" as any]: spinSeconds + "s" }}>
              <div className="bi">
                {ar ? "كيانات" : "entities"}
                <b>{fmtInt(totalAffected, ar)}</b>
                {ar ? "متأثّرة" : "affected"}
              </div>
            </div>

            <div className="flow-side out">
              {outNodes.length === 0 ? (
                <div className="node out dim">
                  <span className="nlbl">{ar ? "لا أثر" : "no effect"}</span>
                  <span className="nval">—</span>
                </div>
              ) : (
                outNodes.map((r) => {
                  const neg = r.projectedDelta < 0;
                  const f = flinching[r.node.id] ?? 0;
                  return (
                    <div
                      // include the flinch counter in the key so the element
                      // remounts on each wave — this restarts the CSS animation
                      // (React's equivalent of the reference's `void offsetWidth`).
                      key={r.node.id + ":" + f}
                      className={"node out" + (f ? " flinch" : "")}
                      title={r.pathSummary}
                    >
                      <span className="nlbl">{r.node.label}</span>
                      <span className={"nval " + (neg ? "down" : "up")}>
                        {fmtPct(r.projectedDelta * 100, ar)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* KPIS */}
        <div className="wi-panel">
          <h2>{ar ? "الأثر" : "Impact"}</h2>
          <div className="sub">{ar ? "يتحدّث لحظياً" : "Updates live"}</div>

          <button className="wi-btn wi-btn-primary wi-solve" onClick={handleSolve} disabled={solving}>
            {solving
              ? ar ? "الدماغ يحسب…" : "Brain solving…"
              : ar ? "✦ دع الدماغ يحسب الأثر" : "✦ Let the Brain probe"}
          </button>

          <div
            key={"kpi_aff:" + (flinching[top3[0]?.node.id ?? ""] ?? 0)}
            className={"wi-kpi" + (flinching[top3[0]?.node.id ?? ""] ? " flinch" : "")}
          >
            <div className="k">{ar ? "كيانات متأثّرة" : "Affected entities"}</div>
            <div className="v">
              <span>{fmtInt(totalAffected, ar)}</span>
            </div>
            <div className="bar">
              <span style={{ width: Math.min(100, totalAffected * 6) + "%" }} />
            </div>
          </div>

          <div className="wi-kpi">
            <div className="k">{ar ? "أكبر تعرّض" : "Top exposure"}</div>
            <div className="v">
              <span>{fmtInt(topExposure * 100, ar)}</span>
              <span className="u">{ar ? "٪" : "%"}</span>
            </div>
            <div className="bar">
              <span style={{ width: Math.min(100, topExposure * 100) + "%" }} />
            </div>
          </div>

          <div className="wi-kpi">
            <div className="k">{ar ? "متوسط الثقة" : "Avg. confidence"}</div>
            <div className="v">
              <span>{fmtInt(avgConf * 100, ar)}</span>
              <span className="u">{ar ? "٪" : "%"}</span>
            </div>
            <div className="bar">
              <span style={{ width: Math.round(avgConf * 100) + "%" }} />
            </div>
          </div>

          <div className="wi-kpi risk">
            <div className="k">{ar ? "مؤشر المخاطرة" : "Risk index"}</div>
            <div className="v">
              <span>{fmtInt(riskIndex, ar)}</span>
            </div>
            <div className="bar">
              <span style={{ width: riskIndex + "%" }} />
            </div>
          </div>

          <div className="wi-actions">
            <button className="wi-btn wi-btn-secondary" onClick={handleReset} disabled={solving}>
              {ar ? "إعادة الضبط" : "Reset"}
            </button>
            <button
              className="wi-btn wi-btn-primary"
              onClick={handleSave}
              disabled={!source || totalAffected === 0}
            >
              {saved ? (ar ? "✓ نُسخ" : "✓ Copied") : ar ? "انسخ السيناريو" : "Copy scenario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Source picker — grouped-by-kind select, styled as a lever control.
// ─────────────────────────────────────────────────────────────────────────

function SourcePicker({
  hubs,
  value,
  onChange,
  ar,
}: {
  hubs: GraphNode[];
  value: string;
  onChange: (id: string) => void;
  ar: boolean;
}) {
  return (
    <select
      className="wi-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ar ? "اختيار المصدر" : "select source"}
    >
      {groupBy(hubs, (n) => n.kind).map(([kind, list]) => (
        <optgroup key={kind} label={kind.toUpperCase()}>
          {list.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Array<[K, T[]]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return [...m.entries()];
}
