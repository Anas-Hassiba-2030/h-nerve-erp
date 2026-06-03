// lib/brain/graphrag.live.ts — DB-backed Graph RAG retrieval (Phase RAG-4).
//
// Loads the causal-graph snapshot, seeds a Personalized PageRank from the
// nodes whose labels best match the query, and returns a compact, prompt-ready
// description of the multi-hop relevant subgraph: the related nodes and the
// causal links among them. Council agents / the narrator fold this into their
// context so they reason about second- and third-order effects, not just the
// metrics in front of them.
//
// Read-only. Degrades to an empty result on any DB miss or empty graph, so a
// caller never has to special-case "graph not seeded yet".

import { causalGraph } from "./graph.prisma";
import {
  graphRetrieve,
  seedNodesByText,
  type GraphRetrieveOptions,
  type GraphHit,
} from "./graphrag";
import type { GraphEdge } from "./graph";

export type GraphContext = {
  /** Related nodes, most relevant first ("Hotel · Arena Dead Sea"). */
  nodes: Array<{ id: string; kind: string; label: string; score: number; isSeed: boolean }>;
  /** Causal links among them, rendered for a prompt ("Arena bookings →(+) Maha demand"). */
  links: string[];
};

export type GraphRetrieveLiveOptions = GraphRetrieveOptions & {
  /** How many query-matched nodes to seed PPR from (default 3). */
  topSeeds?: number;
};

/** Render one edge as a short, sign-aware causal phrase using node labels. */
function renderLink(e: GraphEdge, label: (id: string) => string): string {
  const arrow = e.weight >= 0 ? "→(+)" : "→(−)";
  return `${label(e.from)} ${arrow} ${label(e.to)}`;
}

/**
 * Retrieve the causal subgraph most relevant to `query`. Returns related nodes
 * (ranked) plus rendered causal links. Empty query, empty/unseeded graph, or a
 * DB error → { nodes: [], links: [] }.
 */
export async function retrieveGraphContext(
  query: string,
  opts: GraphRetrieveLiveOptions = {},
): Promise<GraphContext> {
  if (!query.trim()) return { nodes: [], links: [] };

  let snapshot: { nodes: any[]; edges: GraphEdge[] };
  try {
    snapshot = await causalGraph().loadAll();
  } catch {
    return { nodes: [], links: [] };
  }
  if (!snapshot.nodes.length) return { nodes: [], links: [] };

  const seeds = await seedNodesByText(snapshot, query, opts.topSeeds ?? 3);
  if (seeds.length === 0) return { nodes: [], links: [] };

  const { nodes, edges } = graphRetrieve(snapshot, seeds, { k: opts.k ?? 8, ...opts });
  if (nodes.length === 0) return { nodes: [], links: [] };

  const labelOf = new Map(nodes.map((n: GraphHit) => [n.id, n.label]));
  const label = (id: string) => labelOf.get(id) ?? id;

  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      score: Number(n.score.toFixed(4)),
      isSeed: n.isSeed,
    })),
    links: edges.slice(0, 12).map((e) => renderLink(e, label)),
  };
}
