"use client";

// CausalStudio — the interactive shell around the causal graph.
//
// Owns the what-if simulator state and shares it between the canvas
// (left) and the impact rail (right). The page stays a thin server
// shell; this component is where the graph becomes a tool you drive.
//
// Phase 1 (graph) + Phase 2 (simulator) of docs/PHASES-INTELLIGENCE.md.

import { useMemo, useState } from "react";
import { GraphCanvas, type GNode, type GEdge } from "./GraphCanvas";
import { simulateOnSnapshot, primaryMetric } from "@/lib/brain/simulator.bfs";

type Props = {
  nodes: GNode[];
  edges: GEdge[];
  ar: boolean;
  /** Server-action rebuild form, rendered as-is into the rail. */
  rebuildSlot: React.ReactNode;
};

const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmt = (v: number) =>
  Math.abs(v) >= 1000 ? num.format(Math.round(v)) : v.toFixed(1);

export function CausalStudio({ nodes, edges, ar, rebuildSlot }: Props) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [delta, setDelta] = useState(0); // -0.6 .. 0.6

  // Stats (client-side; cheap).
  const byKind = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of nodes) m[n.kind] = (m[n.kind] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [nodes]);
  const causalCount = edges.filter((e) => e.kind === "causal").length;
  const structuralCount = edges.filter((e) => e.kind !== "causal").length;

  // Run the simulator whenever source or delta changes.
  const rows = useMemo(() => {
    if (!sourceId || delta === 0) return [];
    return simulateOnSnapshot(
      { nodes: nodes as any, edges: edges as any },
      { nodeId: sourceId, delta },
      5
    );
  }, [sourceId, delta, nodes, edges]);

  // Impact map for the canvas: source + every reachable node.
  const impact = useMemo(() => {
    if (!sourceId || delta === 0) return undefined;
    const m = new Map<string, number>();
    m.set(sourceId, delta);
    for (const r of rows) m.set(r.node.id, r.projectedDelta);
    return m;
  }, [rows, sourceId, delta]);

  const sourceNode = nodes.find((n) => n.id === sourceId) ?? null;

  const sortedNodes = useMemo(
    () =>
      [...nodes].sort(
        (a, b) =>
          (b.importance ?? 0) - (a.importance ?? 0) ||
          a.label.localeCompare(b.label)
      ),
    [nodes]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ── Canvas ── */}
      <div className="lg:col-span-9 relative">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          impact={impact}
          onSelectNode={(n) => setSourceId(n ? n.id : null)}
        />

        {/* On-canvas simulator control */}
        <div
          className="absolute z-20"
          style={{
            top: 52,
            insetInlineStart: 16,
            width: 268,
            background: "rgba(14,14,16,0.92)",
            border: "1px solid rgba(245,239,230,0.16)",
            backdropFilter: "blur(6px)",
            padding: "14px 15px",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              fontSize: 9.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#c69345",
              marginBottom: 9,
            }}
          >
            {ar ? "محاكي ماذا-لو" : "What-if simulator"}
          </div>

          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "rgba(245,239,230,0.6)",
              marginBottom: 5,
              fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              letterSpacing: "0.06em",
            }}
          >
            {ar ? "العقدة" : "Node"}
          </label>
          <select
            value={sourceId ?? ""}
            onChange={(e) => setSourceId(e.target.value || null)}
            style={{
              width: "100%",
              background: "#0e0e10",
              color: "#fafaf7",
              border: "1px solid rgba(245,239,230,0.2)",
              padding: "6px 8px",
              fontSize: 11.5,
              fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              marginBottom: 12,
            }}
          >
            <option value="">{ar ? "— اختر عقدة —" : "— pick a node —"}</option>
            {sortedNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} · {n.kind}
              </option>
            ))}
          </select>

          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 4 }}
          >
            <span
              style={{
                fontSize: 10,
                color: "rgba(245,239,230,0.6)",
                fontFamily: "'JetBrains Mono',ui-monospace,monospace",
                letterSpacing: "0.06em",
              }}
            >
              {ar ? "تغيير افتراضي" : "Hypothetical change"}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: delta === 0 ? "rgba(245,239,230,0.5)" : simColor(delta),
                fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              }}
            >
              {delta > 0 ? "+" : ""}
              {Math.round(delta * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={-0.6}
            max={0.6}
            step={0.05}
            value={delta}
            onChange={(e) => setDelta(parseFloat(e.target.value))}
            disabled={!sourceId}
            style={{ width: "100%", accentColor: "#c69345", cursor: sourceId ? "pointer" : "not-allowed" }}
          />

          {sourceId ? (
            <button
              onClick={() => {
                setDelta(0);
                setSourceId(null);
              }}
              style={{
                marginTop: 10,
                fontSize: 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(245,239,230,0.6)",
                background: "none",
                border: "1px solid rgba(245,239,230,0.18)",
                padding: "5px 10px",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              }}
            >
              {ar ? "إعادة ضبط" : "Reset"}
            </button>
          ) : (
            <p
              style={{
                marginTop: 10,
                fontSize: 10,
                lineHeight: 1.5,
                color: "rgba(245,239,230,0.45)",
              }}
            >
              {ar
                ? "اختر عقدة أو اضغط عليها في الرسم، ثم اسحب الشريط."
                : "Pick a node — or click one in the graph — then drag the slider."}
            </p>
          )}
        </div>
      </div>

      {/* ── Right rail ── */}
      <div className="lg:col-span-3 space-y-4">
        {/* Impact list */}
        <Panel
          eyebrow={ar ? "محاكاة" : "Simulation"}
          title={ar ? "الأثر المتوقع" : "Projected impact"}
          aside={
            sourceNode
              ? ar
                ? `إذا تغيّر «${sourceNode.label}» بنسبة ${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`
                : `If "${sourceNode.label}" changes by ${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`
              : ar
                ? "اسحب الشريط لرؤية الأثر ينتشر عبر الرسم."
                : "Drag the slider to watch the impact propagate."
          }
        >
          {rows.length === 0 ? (
            <p style={{ fontSize: 11.5, color: "var(--heri-ink-3)", lineHeight: 1.55 }}>
              {ar
                ? "لا أثر بعد. اختر عقدة وحرّك الشريط."
                : "No impact yet. Pick a node and move the slider."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {rows.slice(0, 12).map((r) => {
                const pm = primaryMetric(r.node as any);
                const sign = r.projectedDelta > 0 ? "+" : "";
                return (
                  <li
                    key={r.node.id}
                    style={{ borderTop: "1px solid var(--heri-rule)", paddingTop: 8 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--heri-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.node.label}
                      >
                        {r.node.label}
                      </span>
                      <span
                        className="heri-number-mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: simColor(r.projectedDelta),
                          fontVariantNumeric: "tabular-nums",
                          flex: "none",
                        }}
                      >
                        {sign}
                        {Math.round(r.projectedDelta * 100)}%
                      </span>
                    </div>
                    {pm ? (
                      <div
                        className="heri-number-mono"
                        style={{ fontSize: 10.5, color: "var(--heri-ink-2)", marginTop: 2 }}
                      >
                        {fmt(pm.value)} → {fmt(pm.value * (1 + r.projectedDelta))} {pm.unit}
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "var(--heri-ink-3)",
                        marginTop: 2,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ar ? "ثقة" : "conf"} {Math.round(r.confidence * 100)}% · {r.hops}{" "}
                      {ar ? "قفزات" : "hops"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Graph composition */}
        <Panel
          eyebrow={ar ? "إحصاءات" : "Stats"}
          title={ar ? "تكوين الرسم" : "Graph composition"}
        >
          <div className="space-y-2">
            <StatRow label={ar ? "العقد" : "Nodes"} value={nodes.length} />
            <StatRow label={ar ? "حواف هيكلية" : "Structural edges"} value={structuralCount} />
            <StatRow label={ar ? "حواف سببية" : "Causal edges"} value={causalCount} ochre />
          </div>
          <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid var(--heri-rule)" }}>
            <div className="heri-eyebrow heri-eyebrow-ink mb-2">
              {ar ? "حسب النوع" : "By kind"}
            </div>
            <ul className="space-y-1.5">
              {byKind.map(([kind, count]) => (
                <li key={kind} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--heri-ink-2)" }}>{kind}</span>
                  <span
                    className="heri-number-mono"
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--heri-ink)" }}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* How to read this (IA-1 explanations) */}
        <Panel
          eyebrow={ar ? "دليل" : "Guide"}
          title={ar ? "كيف تقرأ هذا" : "How to read this"}
        >
          <ul className="space-y-2.5" style={{ fontSize: 11.5, color: "var(--heri-ink-2)", lineHeight: 1.5 }}>
            <Explain
              term={ar ? "العقدة" : "Node"}
              body={
                ar
                  ? "كل عقدة كيان حقيقي: شركة، فندق، حجز، معاملة، دفعة ألبان، توقّع. حجمها يعكس أهميتها."
                  : "Each node is a real entity — a company, hotel, booking, transaction, dairy batch, forecast. Its size reflects importance."
              }
            />
            <Explain
              term={ar ? "حافة هيكلية" : "Structural edge"}
              body={
                ar
                  ? "خط متقطّع: علاقة انتماء ثابتة (الحجز ينتمي للفندق). تصف البنية، لا السبب."
                  : "Dashed line: a fixed belongs-to link (a booking belongs to a hotel). Describes structure, not cause."
              }
            />
            <Explain
              term={ar ? "حافة سببية" : "Causal edge"}
              body={
                ar
                  ? "خط نحاسي متّصل: علاقة سبب→أثر تعلّمها الدماغ، لها وزن وثقة. هذه ما يسري عليها المحاكي."
                  : "Solid copper line: a learned cause→effect with a weight and confidence. This is what the simulator propagates along."
              }
            />
            <Explain
              term={ar ? "اضغط عقدة" : "Click a node"}
              body={
                ar
                  ? "يُضيء كل ما يقع أسفلها في التيار — موجة صدمة تكشف ما تؤثر فيه."
                  : "Lights up everything downstream — a shockwave revealing what it influences."
              }
            />
            <Explain
              term={ar ? "المحاكي" : "Simulator"}
              body={
                ar
                  ? "اختر عقدة، اسحب الشريط لقيمة افتراضية، وشاهد الأثر يتدرّج عبر الرسم ويُرتَّب أعلاه."
                  : "Pick a node, drag the slider to a hypothetical value, and watch the impact ripple through the graph and rank above."
              }
            />
          </ul>
        </Panel>

        {/* Rebuild (server-action form passed in) */}
        <Panel
          eyebrow={ar ? "صيانة" : "Maintenance"}
          title={ar ? "إعادة بناء الرسم" : "Rebuild graph"}
          aside={
            ar
              ? "يمسح الدماغ كل الكيانات ويُنشئ عقدًا وحوافًا جديدة."
              : "The brain scans every entity and produces fresh nodes and edges."
          }
        >
          {rebuildSlot}
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--heri-ink-3)", lineHeight: 1.5 }}>
            {ar
              ? "آمن للتشغيل في أي وقت. لا يكسر الحواف المُتعلَّمة."
              : "Safe to run anytime. Doesn't clobber learned edges."}
          </p>
        </Panel>
      </div>
    </div>
  );
}

function simColor(d: number): string {
  return d < 0 ? "var(--heri-terracotta, #b85c38)" : "var(--heri-teal, #1f4e4a)";
}

function Panel({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--heri-rule)",
        background: "var(--heri-cream-2)",
        padding: "15px 17px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ marginBottom: 3 }}>
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--heri-ink)",
          marginBottom: aside ? 4 : 10,
        }}
      >
        {title}
      </div>
      {aside ? (
        <p style={{ fontSize: 11, color: "var(--heri-ink-3)", lineHeight: 1.5, marginBottom: 11 }}>
          {aside}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function StatRow({ label, value, ochre }: { label: string; value: number; ochre?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: "var(--heri-ink-2)" }}>{label}</span>
      <span
        className="heri-number"
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: ochre ? "var(--heri-ochre-2)" : "var(--heri-ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Explain({ term, body }: { term: string; body: string }) {
  return (
    <li>
      <span style={{ color: "var(--heri-ink)", fontWeight: 600 }}>{term}.</span> {body}
    </li>
  );
}
