// useCausalStudio — stateful logic for the CausalStudio shell.
//
// Extracted verbatim from CausalStudio.tsx: owns the what-if simulator
// state (source node + delta) and every derived value the JSX consumes.
// The component stays mostly-rendering.

import { useMemo, useState } from "react";
import type { GNode, GEdge } from "./GraphCanvas";
import { simulateOnSnapshot, primaryMetric } from "@/lib/brain/simulator.bfs";

const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function useCausalStudio({
  nodes,
  edges,
  ar,
}: {
  nodes: GNode[];
  edges: GEdge[];
  ar: boolean;
}) {
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

  const nodeById = useMemo(() => {
    const m = new Map<string, GNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Structural inspect — what drives the selected node (inbound edges) and
  // what it affects (outbound edges). Independent of the slider.
  const drivers = useMemo(() => {
    if (!sourceId) return [];
    return edges
      .filter((e) => e.to === sourceId)
      .map((e) => ({ node: nodeById.get(e.from), edge: e }))
      .filter((x): x is { node: GNode; edge: GEdge } => Boolean(x.node))
      .sort((a, b) => Math.abs(b.edge.weight) - Math.abs(a.edge.weight));
  }, [sourceId, edges, nodeById]);

  const effects = useMemo(() => {
    if (!sourceId) return [];
    return edges
      .filter((e) => e.from === sourceId)
      .map((e) => ({ node: nodeById.get(e.to), edge: e }))
      .filter((x): x is { node: GNode; edge: GEdge } => Boolean(x.node))
      .sort((a, b) => Math.abs(b.edge.weight) - Math.abs(a.edge.weight));
  }, [sourceId, edges, nodeById]);

  // One-paragraph editorial read of the live simulation (stub narrator —
  // fully client-side, no API call).
  const summary = useMemo(() => {
    if (!sourceNode || delta === 0 || rows.length === 0) return null;
    const rising = delta > 0;
    const pct = Math.round(Math.abs(delta) * 100);
    const top = rows[0];
    const topPct = Math.round(Math.abs(top.projectedDelta) * 100);
    let money = 0;
    for (const r of rows) {
      const pm = primaryMetric(r.node as any);
      if (pm && pm.unit === "JOD") money += pm.value * r.projectedDelta;
    }
    const moneyTxt =
      Math.abs(money) >= 1
        ? ar
          ? `، بأثر مالي تقديري يقارب ${money > 0 ? "+" : "−"}${num.format(Math.round(Math.abs(money)))} د.أ`
          : `, with an estimated monetary swing near ${money > 0 ? "+" : "−"}${num.format(Math.round(Math.abs(money)))} JOD`
        : "";
    if (ar) {
      return `${rising ? "ارتفاعٌ" : "انخفاضٌ"} افتراضي بنسبة ${pct}% في «${sourceNode.label}» ينتشر إلى ${rows.length} كيانًا أسفل التيار${moneyTxt}. أوضح أثر يقع على «${top.node.label}» بتغيّر ${top.projectedDelta > 0 ? "+" : "−"}${topPct}%. الأرقام تقديرية تنتشر عبر الحواف السببية المُتعلَّمة وتخفت مع كل قفزة.`;
    }
    return `A hypothetical ${rising ? "rise" : "drop"} of ${pct}% in "${sourceNode.label}" propagates to ${rows.length} downstream ${rows.length === 1 ? "entity" : "entities"}${moneyTxt}. The sharpest landing is on "${top.node.label}" at ${top.projectedDelta > 0 ? "+" : "−"}${topPct}%. Figures are estimates carried along learned causal edges, fading with every hop.`;
  }, [sourceNode, delta, rows, ar]);

  // Scenario presets — resolved against whatever the seeded graph actually
  // contains, so a chip only shows when a matching entity exists.
  const presets = useMemo(() => {
    const firstOf = (kind: string) => sortedNodes.find((n) => n.kind === kind);
    const defs: Array<{ node?: GNode; delta: number; ar: string; en: string }> = [
      { node: firstOf("Hotel"), delta: -0.2, ar: "−20% إشغال", en: "−20% occupancy" },
      { node: firstOf("DairyBatch"), delta: 0.15, ar: "+15% ألبان", en: "+15% dairy yield" },
      {
        node: firstOf("Farm") ?? firstOf("Forecast"),
        delta: -0.1,
        ar: "−10% مزارع",
        en: "−10% farm output",
      },
    ];
    return defs.filter((d): d is { node: GNode; delta: number; ar: string; en: string } =>
      Boolean(d.node)
    );
  }, [sortedNodes]);

  return {
    sourceId,
    setSourceId,
    delta,
    setDelta,
    byKind,
    causalCount,
    structuralCount,
    rows,
    impact,
    sourceNode,
    sortedNodes,
    drivers,
    effects,
    summary,
    presets,
  };
}
