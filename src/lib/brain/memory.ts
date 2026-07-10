// memory.ts — the long-term episodic memory.
//
// Every meaningful event is captured as a Memory: a booking spike, a
// quality recall, a leadership decision, a weather anomaly. Memories
// are embedded into a vector space at write time. New situations search
// the memory by semantic similarity to surface analogies.
//
// "Last time bookings spiked like this, we ran out of feta. Here's the
// memory, and here's what we did."
//
// Memories have:
//   - a headline + body (editorial)
//   - structured tags (module, severity, outcome)
//   - the embedding vector
//   - links back to the entities involved (graph nodes)
//   - the ground-truth outcome, written in retrospectively
//
// Memory is also the source for the "Time Machine" (Phase 11) — the
// brain reconstructs the worldview as it was on any past date.
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 6.

export type Memory = {
  id: string;
  ts: Date;
  module: string;
  headline: { ar: string; en: string };
  body: { ar: string; en: string };
  tags: string[];
  entityRefs: string[];
  embedding?: number[];   // 768 or 1536, depending on the embedder
  outcome?: { metric: string; delta: number; lessonLearned?: string };
};

export type RecallQuery = {
  situation: string;
  topK: number;
  filterTags?: string[];
  minSimilarity?: number;
};

export interface MemoryLake {
  remember(m: Memory): Promise<void>;
  recall(q: RecallQuery): Promise<Array<Memory & { similarity: number }>>;
  reconstruct(atDate: Date, scope?: { module?: string }): Promise<Memory[]>;
}
