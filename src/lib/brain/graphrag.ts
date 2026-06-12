// lib/brain/graphrag.ts — Phase RAG-4: Graph RAG over the causal graph.
//
// The causal graph (BrainNode/BrainEdge) is a knowledge graph: entities are
// nodes, causal relationships are weighted edges. Graph RAG retrieves a
// *multi-hop relevant subgraph* for a query rather than a flat list of
// matches — so the brain can reason about how a question connects to the
// business two and three hops away (HippoRAG, ch. 14).
//
// Method (HippoRAG): seed a Personalized PageRank from the nodes whose labels
// best match the query, let relevance diffuse across the graph along edge
// strengths, and return the top-ranked nodes plus the edges among them.
//
// This file is split into a PURE core (personalizedPageRank, graphRetrieve)
// that unit-tests with no DB/network, and the embedder-backed seed selection.
// The DB-backed entry point lives in graphrag.live.ts.

import type { GraphNode, GraphEdge } from "./graph";
import { rankByRelevance } from "./retriever";

export type GraphSnapshot = { nodes: GraphNode[]; edges: GraphEdge[] };

export type PprOptions = {
  /**
   * Teleport-to-seeds (restart) probability α. Higher = relevance stays nearer
   * the query's seed nodes. Default 0.5 — query-focused retrieval (HippoRAG)
   * wants relevance anchored on the seeds, unlike global PageRank's ~0.15.
   */
  restartProb?: number;
  /** Max power iterations. Default 50. */
  iterations?: number;
  /** Early-stop when the L1 change between iterations drops below this. Default 1e-6. */
  tolerance?: number;
};

/** Edge strength used for diffusion: magnitude × confidence, clamped to ≥0. */
function edgeStrength(e: GraphEdge): number {
  const s = Math.abs(e.weight) * (Number.isFinite(e.confidence) ? e.confidence : 1);
  return s > 0 ? s : 0;
}

/**
 * Personalized PageRank over the causal graph, restarting toward `seeds`.
 *
 * The graph is treated as UNDIRECTED for relevance diffusion: a cause and its
 * effect are mutually relevant when answering "what relates to X". Edge
 * strength = |weight| × confidence. Dangling mass and the case of zero valid
 * seeds both fall back to the personalization (seed) distribution.
 *
 * Returns a score per node (sums to ~1). Empty graph or no in-graph seeds → {}.
 */
export function personalizedPageRank(
  snapshot: GraphSnapshot,
  seeds: string[],
  opts: PprOptions = {},
): Map<string, number> {
  const restart = clamp01(opts.restartProb ?? 0.5);
  const maxIter = Math.max(1, opts.iterations ?? 50);
  const tol = opts.tolerance ?? 1e-6;

  const ids = snapshot.nodes.map((n) => n.id);
  const n = ids.length;
  const out = new Map<string, number>();
  if (n === 0) return out;

  const present = new Set(ids);
  const seedSet = seeds.filter((s) => present.has(s));
  if (seedSet.length === 0) return out;

  // Personalization vector p — uniform over the (in-graph) seeds.
  const p = new Map<string, number>();
  for (const id of ids) p.set(id, 0);
  for (const s of seedSet) p.set(s, (p.get(s) ?? 0) + 1 / seedSet.length);

  // Undirected weighted adjacency + per-node out-strength.
  const adj = new Map<string, Array<{ to: string; w: number }>>();
  const outStrength = new Map<string, number>();
  for (const id of ids) {
    adj.set(id, []);
    outStrength.set(id, 0);
  }
  for (const e of snapshot.edges) {
    if (!present.has(e.from) || !present.has(e.to) || e.from === e.to) continue;
    const w = edgeStrength(e);
    if (w <= 0) continue;
    adj.get(e.from)!.push({ to: e.to, w });
    adj.get(e.to)!.push({ to: e.from, w });
    outStrength.set(e.from, (outStrength.get(e.from) ?? 0) + w);
    outStrength.set(e.to, (outStrength.get(e.to) ?? 0) + w);
  }

  // Power iteration: r' = α·p + (1−α)·(M·r + danglingMass·p)
  let r = new Map<string, number>(p);
  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Map<string, number>();
    for (const id of ids) next.set(id, 0);

    // Mass sitting on dangling nodes (no usable out-edges) teleports via p.
    let dangling = 0;
    for (const id of ids) {
      if ((outStrength.get(id) ?? 0) <= 0) dangling += r.get(id) ?? 0;
    }

    for (const id of ids) {
      const ri = r.get(id) ?? 0;
      const os = outStrength.get(id) ?? 0;
      if (os <= 0 || ri === 0) continue;
      for (const { to, w } of adj.get(id)!) {
        next.set(to, (next.get(to) ?? 0) + (ri * w) / os);
      }
    }

    let delta = 0;
    for (const id of ids) {
      const val =
        restart * (p.get(id) ?? 0) +
        (1 - restart) * ((next.get(id) ?? 0) + dangling * (p.get(id) ?? 0));
      delta += Math.abs(val - (r.get(id) ?? 0));
      next.set(id, val);
    }
    r = next;
    if (delta < tol) break;
  }

  return r;
}

export type GraphHit = GraphNode & { score: number; isSeed: boolean };

export type GraphRetrieveResult = {
  nodes: GraphHit[];
  /** Edges among the returned nodes — the induced relevant subgraph. */
  edges: GraphEdge[];
};

export type GraphRetrieveOptions = PprOptions & {
  /** Max nodes to return (default 8). */
  k?: number;
  /** Keep the seed nodes in the result even if a non-seed outranks them (default true). */
  includeSeeds?: boolean;
  /** Drop nodes scoring below this fraction of the top score (default 0 = keep top-k). */
  minScoreRatio?: number;
};

/**
 * Retrieve the multi-hop relevant subgraph for a set of seed nodes: run PPR,
 * rank nodes high→low, take the top-k, and induce the edges among them.
 */
export function graphRetrieve(
  snapshot: GraphSnapshot,
  seeds: string[],
  opts: GraphRetrieveOptions = {},
): GraphRetrieveResult {
  const k = Math.max(1, opts.k ?? 8);
  const includeSeeds = opts.includeSeeds ?? true;
  const minScoreRatio = clamp01(opts.minScoreRatio ?? 0);

  const scores = personalizedPageRank(snapshot, seeds, opts);
  if (scores.size === 0) return { nodes: [], edges: [] };

  const seedSet = new Set(seeds);
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));

  const ranked: GraphHit[] = [...scores.entries()]
    .map(([id, score]) => {
      const node = byId.get(id)!;
      return { ...node, score, isSeed: seedSet.has(id) };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]?.score ?? 0;
  const threshold = top * minScoreRatio;

  const chosen: GraphHit[] = [];
  const chosenIds = new Set<string>();
  for (const hit of ranked) {
    if (chosen.length >= k) break;
    if (hit.score < threshold && !(includeSeeds && hit.isSeed)) continue;
    chosen.push(hit);
    chosenIds.add(hit.id);
  }
  // Make sure seeds survive truncation when requested.
  if (includeSeeds) {
    for (const hit of ranked) {
      if (hit.isSeed && !chosenIds.has(hit.id)) {
        chosen.push(hit);
        chosenIds.add(hit.id);
      }
    }
  }

  const edges = snapshot.edges.filter(
    (e) => chosenIds.has(e.from) && chosenIds.has(e.to) && e.from !== e.to,
  );

  return { nodes: chosen, edges };
}

/**
 * Find the graph nodes whose labels best match a free-text query, to seed PPR.
 * Uses the embedding seam via rankByRelevance — so it's semantic, not keyword.
 * Returns the top seed node ids (empty for an empty query/graph).
 */
export async function seedNodesByText(
  snapshot: GraphSnapshot,
  query: string,
  topSeeds = 3,
): Promise<string[]> {
  if (!query.trim() || snapshot.nodes.length === 0) return [];
  const items = snapshot.nodes.map((node) => ({
    id: node.id,
    text: `${node.kind} ${node.label}`,
  }));
  const hits = await rankByRelevance(query, items, { k: Math.max(1, topSeeds), minScore: 0.04 });
  return hits.map((h) => h.id);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
