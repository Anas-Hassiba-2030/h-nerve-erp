// graph.prisma.ts — Prisma-backed implementation of the CausalGraph interface.
//
// Storage shape: BrainNode + BrainEdge tables (see prisma/schema.prisma).
// All graph traversal happens in-memory after loading the relevant slice;
// for the demo dataset (~50 nodes, ~120 edges) this is comfortably fast.
//
// Phase 1 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import type { CausalGraph, GraphNode, GraphEdge, NodeKind, CausalEdgeKind } from "./graph";

function rowToNode(r: any): GraphNode {
  let payload: GraphNode["payload"] = {};
  try {
    payload = JSON.parse(r.payloadJson ?? "{}");
  } catch {
    payload = {};
  }
  return {
    id: r.id,
    kind: r.kind as NodeKind,
    label: r.label,
    ts: r.ts,
    payload,
  };
}

function rowToEdge(r: any): GraphEdge {
  return {
    from: r.fromId,
    to: r.toId,
    kind: r.kind as CausalEdgeKind,
    weight: r.weight,
    confidence: r.confidence,
    evidenceCount: r.evidenceCount,
  };
}

export class PrismaCausalGraph implements CausalGraph {
  async upsertNode(node: GraphNode): Promise<void> {
    await prisma.brainNode.upsert({
      where: { id: node.id },
      create: {
        id: node.id,
        kind: node.kind,
        label: node.label,
        payloadJson: JSON.stringify(node.payload ?? {}),
        ts: node.ts,
      },
      update: {
        kind: node.kind,
        label: node.label,
        payloadJson: JSON.stringify(node.payload ?? {}),
        ts: node.ts,
      },
    });
  }

  async upsertEdge(edge: GraphEdge): Promise<void> {
    await prisma.brainEdge.upsert({
      where: {
        fromId_toId_kind: {
          fromId: edge.from,
          toId: edge.to,
          kind: edge.kind,
        },
      },
      create: {
        fromId: edge.from,
        toId: edge.to,
        kind: edge.kind,
        weight: edge.weight,
        confidence: edge.confidence,
        evidenceCount: edge.evidenceCount,
      },
      update: {
        weight: edge.weight,
        confidence: edge.confidence,
        evidenceCount: edge.evidenceCount,
      },
    });
  }

  /** All neighbors (incoming + outgoing) of a node, BFS up to `depth`. */
  async neighbors(id: string, depth = 1): Promise<GraphNode[]> {
    const seen = new Set<string>([id]);
    let frontier: string[] = [id];
    for (let d = 0; d < depth; d++) {
      const edges = await prisma.brainEdge.findMany({
        where: {
          OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }],
        },
      });
      const next: string[] = [];
      for (const e of edges) {
        if (!seen.has(e.fromId)) { seen.add(e.fromId); next.push(e.fromId); }
        if (!seen.has(e.toId))   { seen.add(e.toId);   next.push(e.toId); }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    seen.delete(id);
    if (seen.size === 0) return [];
    const rows = await prisma.brainNode.findMany({ where: { id: { in: [...seen] } } });
    return rows.map(rowToNode);
  }

  /** Cheap shortest causal path using BFS on the adjacency matrix. */
  async shortestCausalPath(from: string, to: string): Promise<GraphEdge[]> {
    if (from === to) return [];
    const allEdges = await prisma.brainEdge.findMany({});
    const adj = new Map<string, Array<{ edge: GraphEdge; via: string }>>();
    for (const e of allEdges) {
      const ge = rowToEdge(e);
      const list = adj.get(ge.from) ?? [];
      list.push({ edge: ge, via: ge.to });
      adj.set(ge.from, list);
    }
    const visited = new Set<string>([from]);
    const parent = new Map<string, { from: string; edge: GraphEdge }>();
    const queue: string[] = [from];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === to) break;
      const out = adj.get(cur) ?? [];
      for (const { edge, via } of out) {
        if (visited.has(via)) continue;
        visited.add(via);
        parent.set(via, { from: cur, edge });
        queue.push(via);
      }
    }
    if (!parent.has(to)) return [];
    const path: GraphEdge[] = [];
    let cursor: string | undefined = to;
    while (cursor && cursor !== from) {
      const p = parent.get(cursor);
      if (!p) break;
      path.unshift(p.edge);
      cursor = p.from;
    }
    return path;
  }

  /** A bounded subgraph: BFS from each seed up to `depth`, returning all nodes + edges seen. */
  async subgraph(
    seedIds: string[],
    depth: number
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const seen = new Set<string>(seedIds);
    let frontier: string[] = [...seedIds];
    const allEdges: any[] = [];
    for (let d = 0; d < depth; d++) {
      if (frontier.length === 0) break;
      const edges = await prisma.brainEdge.findMany({
        where: {
          OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }],
        },
      });
      const next: string[] = [];
      for (const e of edges) {
        allEdges.push(e);
        if (!seen.has(e.fromId)) { seen.add(e.fromId); next.push(e.fromId); }
        if (!seen.has(e.toId))   { seen.add(e.toId);   next.push(e.toId); }
      }
      frontier = next;
    }
    if (seen.size === 0) return { nodes: [], edges: [] };
    const nodes = await prisma.brainNode.findMany({ where: { id: { in: [...seen] } } });
    // Dedupe edges by id
    const edgeMap = new Map<string, GraphEdge>();
    for (const e of allEdges) edgeMap.set(e.id, rowToEdge(e));
    return { nodes: nodes.map(rowToNode), edges: [...edgeMap.values()] };
  }

  /** Convenience: load the entire graph (for the visualization page). */
  async loadAll(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const [nodes, edges] = await Promise.all([
      prisma.brainNode.findMany({ orderBy: { kind: "asc" } }),
      prisma.brainEdge.findMany({}),
    ]);
    return { nodes: nodes.map(rowToNode), edges: edges.map(rowToEdge) };
  }
}

let _instance: PrismaCausalGraph | null = null;
export function causalGraph(): PrismaCausalGraph {
  if (!_instance) _instance = new PrismaCausalGraph();
  return _instance;
}
