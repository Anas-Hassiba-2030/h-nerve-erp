// simulator.bfs.ts — Weighted-BFS implementation of the Simulator.
//
// Algorithm:
//   - Start at the perturbed node with delta = perturbation.delta (e.g. -0.4 for a 40% drop).
//   - BFS along outgoing edges only (downstream impact).
//   - For each child: child.delta = parent.delta * edge.weight * edge.confidence * attenuation
//     where attenuation = 0.92^depth (so the wave fades over distance even when weights are 1).
//   - Cycles broken by visited set; depth capped to keep results legible.
//   - Confidence on each row is the chained product of edge confidences along the BFS parent path.
//
// This is deliberately pure-functional and graph-agnostic so it can run
// either server-side (against PrismaCausalGraph) or client-side (against
// an in-memory snapshot for live slider scrubbing).
//
// Phase 2 of docs/PHASES-INTELLIGENCE.md.

import type { GraphNode, GraphEdge } from "./graph";
import type { Perturbation, ImpactRow } from "./simulator";

const ATTENUATION_PER_HOP = 0.92;

export type SimGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/** Synchronous in-memory simulator — fast enough for live drag (<2ms for 200 nodes). */
export function simulateOnSnapshot(
  snapshot: SimGraph,
  perturbation: Pick<Perturbation, "nodeId" | "delta">,
  depthCap = 5
): ImpactRow[] {
  // Build adjacency list on outgoing edges only.
  const adj = new Map<string, Array<{ to: string; weight: number; confidence: number }>>();
  const nodeIndex = new Map<string, GraphNode>();
  for (const n of snapshot.nodes) nodeIndex.set(n.id, n);
  for (const e of snapshot.edges) {
    const list = adj.get(e.from) ?? [];
    list.push({ to: e.to, weight: e.weight, confidence: e.confidence });
    adj.set(e.from, list);
  }

  const source = nodeIndex.get(perturbation.nodeId);
  if (!source) return [];

  type Frontier = {
    nodeId: string;
    depth: number;
    delta: number;
    confidence: number;
    parent: string | null;
  };

  // Best-known delta per node (we keep the entry with the largest |delta|).
  const best = new Map<string, Frontier>();
  best.set(source.id, {
    nodeId: source.id,
    depth: 0,
    delta: perturbation.delta,
    confidence: 1,
    parent: null,
  });

  const queue: Frontier[] = [
    { nodeId: source.id, depth: 0, delta: perturbation.delta, confidence: 1, parent: null },
  ];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.depth >= depthCap) continue;
    const out = adj.get(cur.nodeId) ?? [];
    for (const edge of out) {
      // Skip self-loops.
      if (edge.to === cur.nodeId) continue;
      // Edges with very low confidence don't propagate (cuts noise).
      if (edge.confidence < 0.15) continue;

      const nextDelta =
        cur.delta * edge.weight * edge.confidence * ATTENUATION_PER_HOP;
      // Clamp to keep wild compounds in check.
      const clampedDelta = Math.max(-1.5, Math.min(1.5, nextDelta));
      // Stop propagating if effect is below 0.5%.
      if (Math.abs(clampedDelta) < 0.005) continue;

      const chainedConf = cur.confidence * edge.confidence;
      const childDepth = cur.depth + 1;

      const existing = best.get(edge.to);
      if (!existing || Math.abs(existing.delta) < Math.abs(clampedDelta)) {
        const f: Frontier = {
          nodeId: edge.to,
          depth: childDepth,
          delta: clampedDelta,
          confidence: chainedConf,
          parent: cur.nodeId,
        };
        best.set(edge.to, f);
        queue.push(f);
      }
    }
  }

  // Reconstruct path summaries by walking parent pointers.
  const rows: ImpactRow[] = [];
  for (const [id, f] of best) {
    if (id === source.id) continue;
    const node = nodeIndex.get(id);
    if (!node) continue;

    // Walk parent chain to build "A → B → C" summary.
    const labels: string[] = [node.label];
    let cursor: string | null = f.parent;
    let safety = 8;
    while (cursor && safety-- > 0) {
      const p = nodeIndex.get(cursor);
      if (!p) break;
      labels.unshift(p.label);
      cursor = best.get(cursor)?.parent ?? null;
    }
    const pathSummary = labels.join(" → ");

    rows.push({
      node,
      projectedDelta: f.delta,
      confidence: f.confidence,
      hops: f.depth,
      pathSummary,
    });
  }

  // Sort by absolute impact magnitude descending.
  rows.sort((a, b) => Math.abs(b.projectedDelta) - Math.abs(a.projectedDelta));
  return rows;
}

// ─────────────────────────────────────────────────────────────────────
// Helper — pick the "primary numeric metric" for a node by kind.
// Used to display "current → projected" in real currency/units rather
// than abstract percentages.
// ─────────────────────────────────────────────────────────────────────

export function primaryMetric(node: GraphNode): {
  field: string;
  unit: string;
  value: number;
} | null {
  const p = node.payload as Record<string, any>;
  switch (node.kind) {
    case "Hotel": {
      // Use rooms × baseline as a quasi-revenue proxy when occupancy isn't on payload.
      if (typeof p.rooms === "number") return { field: "rooms", unit: "rooms", value: p.rooms };
      return null;
    }
    case "Booking":
      return typeof p.revenue === "number"
        ? { field: "revenue", unit: "JOD", value: p.revenue }
        : null;
    case "DairyBatch":
      return typeof p.liters === "number"
        ? { field: "liters", unit: "L", value: p.liters }
        : null;
    case "Transaction":
      return typeof p.amount === "number"
        ? { field: "amount", unit: "JOD", value: p.amount }
        : null;
    case "Forecast":
      return typeof p.predicted === "number"
        ? { field: "predicted", unit: String(p.unit ?? ""), value: p.predicted }
        : null;
    case "Farm":
      return typeof p.size === "number"
        ? { field: "size", unit: "dunum", value: p.size }
        : null;
    case "Program":
      return typeof p.funding === "number"
        ? { field: "funding", unit: "JOD", value: p.funding }
        : null;
    case "Company":
      return typeof p.employees === "number"
        ? { field: "employees", unit: "staff", value: p.employees }
        : null;
    default:
      return null;
  }
}
