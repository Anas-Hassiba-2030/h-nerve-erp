// lib/brain/retriever.ts — Phase RAG-2: the general retrieval core.
//
// Given a query and a set of {id, text} items, embed everything via the
// pluggable seam (./embeddings) and return the top-k by cosine similarity.
// Pure + dependency-free (no Prisma, no network at import) so it unit-tests
// with no DB. The DB-backed document retriever (documents.retrieve.ts) and
// any future corpus retriever build on this.
//
// This is the "retrieve" half of retrieve-augment-generate: callers take the
// hits, format them into the prompt (augment), and the narrator/council
// generate grounded, cited answers.

import { getEmbedder, cosineSim } from "./embeddings";

export type Retrievable = { id: string; text: string; meta?: Record<string, unknown> };
export type RetrievalHit<T extends Retrievable = Retrievable> = T & { score: number };

export type RankOptions = {
  /** Max hits to return (default 5). */
  k?: number;
  /** Drop hits below this cosine score (default 0.05). */
  minScore?: number;
};

/**
 * Rank `items` by semantic relevance to `query`. Embeds the query and all
 * item texts with the active embedder (local hash today, a real provider
 * when an embedding key is set) and scores by cosine. Returns hits sorted
 * high→low, filtered by minScore, capped at k. Empty query or items → [].
 */
export async function rankByRelevance<T extends Retrievable>(
  query: string,
  items: T[],
  opts: RankOptions = {},
): Promise<RetrievalHit<T>[]> {
  const k = Math.max(1, opts.k ?? 5);
  const minScore = opts.minScore ?? 0.05;
  if (!query.trim() || items.length === 0) return [];

  const embedder = getEmbedder();
  const [qVec] = await embedder.embed([query]);
  if (!qVec || qVec.every((x) => x === 0)) return [];

  const docVecs = await embedder.embed(items.map((i) => i.text || ""));
  const scored: RetrievalHit<T>[] = items.map((item, i) => ({
    ...item,
    score: cosineSim(qVec, docVecs[i] ?? []),
  }));

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
