// memory.live.ts — concrete MemoryLake implementation.
//
// Phase RAG-1: recall runs on DENSE embeddings via the pluggable seam in
// ./embeddings (getEmbedder()). New memories are stored as a dense vector
// (vectorVersion 2) in vectorJson and scored with cosineSim in-process;
// when an embedding API key (VOYAGE/OPENAI) is set, getEmbedder() returns a
// real provider and recall becomes truly semantic with zero changes here.
// Legacy bag-of-words rows (vectorVersion 1) still score via the original
// sparse path below, so the upgrade is backward-compatible. (A native
// pgvector column is a later scale optimization; in-process cosine is fine
// for the corpus sizes we have, and stays SQLite-compatible for dev.)
//
// Phase 6 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";
import type { Memory, MemoryLake, RecallQuery } from "./memory";
// Phase RAG-1: recall now runs on dense embeddings via the pluggable seam.
// New memories store a dense vector (vectorVersion 2); legacy sparse rows
// (version 1) still score via the bag-of-words path below.
import { getEmbedder, cosineSim } from "./embeddings";

/** Embed one string into a dense, L2-normalized vector via the active embedder. */
async function embedText(text: string): Promise<number[]> {
  const [v] = await getEmbedder().embed([text || ""]);
  return v ?? [];
}

/** A stored vectorJson is either a dense array (v2) or the legacy {terms,weights} (v1). */
function isDenseJson(json: string | null | undefined): boolean {
  if (!json) return false;
  const t = json.trimStart();
  return t.startsWith("[");
}

// ─────────────────────────────────────────────────────────────────────
// Vectorizer — bag-of-words with sublinear TF and length normalization.
// ─────────────────────────────────────────────────────────────────────

const STOP = new Set([
  "a","an","the","and","or","but","if","then","of","to","for","with","at","on",
  "in","is","are","was","were","be","been","being","by","as","that","this",
  "it","its","from","into","over","under","up","down","not","no","do","does",
  "did","has","have","had","we","i","you","they","he","she","our","your","their",
  "في","من","على","إلى","عن","مع","هذا","هذه","تلك","ذلك","الذي","التي","ما","لا",
  "أن","إن","ثم","قد","كان","كانت","يكون","تكون","كل","بعض","هي","هو","نحن","هم",
]);

const WORD_RE = /[\p{L}\p{N}_]+/gu;

/** Tokenize lowercase; drop stopwords + tokens length<2. */
function tokens(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(WORD_RE) ?? [];
  return matches.filter((t) => t.length >= 2 && !STOP.has(t));
}

/** Sublinear TF + L2 normalize. Returned as Map for cosine math. */
function vectorize(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens(text)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const v = new Map<string, number>();
  let sumSq = 0;
  for (const [t, c] of counts) {
    // sublinear: 1 + log2(c). Punishes runaway repetition.
    const w = 1 + Math.log2(c);
    v.set(t, w);
    sumSq += w * w;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (const [t, w] of v) v.set(t, w / norm);
  return v;
}

/** Cosine similarity between two normalized sparse vectors. */
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  // Walk the smaller map for efficiency.
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) {
    const w2 = big.get(t);
    if (w2) dot += w * w2;
  }
  return dot;
}

// Vector serialization: store as `{terms:[...], weights:[...], v:1}` JSON.
type StoredVector = { terms: string[]; weights: number[]; v: number };

function serialize(map: Map<string, number>): string {
  const terms: string[] = [];
  const weights: number[] = [];
  for (const [t, w] of map) {
    terms.push(t);
    weights.push(Number(w.toFixed(6)));
  }
  const body: StoredVector = { terms, weights, v: 1 };
  return JSON.stringify(body);
}

function deserialize(json: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!json) return out;
  try {
    const v = JSON.parse(json) as StoredVector;
    if (!v || !Array.isArray(v.terms) || !Array.isArray(v.weights)) return out;
    for (let i = 0; i < v.terms.length; i++) {
      out.set(v.terms[i], v.weights[i] ?? 0);
    }
  } catch {
    // ignore — empty map is the safe default
  }
  return out;
}

/** Combine the editorial fields of a memory into a single string for vectorizing. */
function memoryCorpus(m: {
  headlineEn: string;
  bodyEn: string;
  lessonEn: string | null | undefined;
  tags?: string[];
  module?: string;
}): string {
  return [
    m.headlineEn,
    m.bodyEn,
    m.lessonEn ?? "",
    (m.tags ?? []).join(" "),
    m.module ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// MemoryLake implementation
// ─────────────────────────────────────────────────────────────────────

class LiveMemoryLake implements MemoryLake {
  async remember(m: Memory): Promise<void> {
    const tags = Array.isArray(m.tags) ? m.tags : [];
    const headlineEn = m.headline.en;
    const headlineAr = m.headline.ar;
    const bodyEn = m.body.en;
    const bodyAr = m.body.ar;
    const lessonEn = m.outcome?.lessonLearned ?? null;
    const corpus = memoryCorpus({
      headlineEn,
      bodyEn,
      lessonEn,
      tags,
      module: m.module,
    });
    const dense = await embedText(corpus);
    const vectorJson = JSON.stringify(dense);

    await prisma.memory.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        occurredAt: m.ts,
        module: m.module,
        headlineAr,
        headlineEn,
        bodyAr,
        bodyEn,
        lessonAr: null,
        lessonEn,
        tagsJson: JSON.stringify(tags),
        entityRefsJson: JSON.stringify(m.entityRefs ?? []),
        outcomeMetric: m.outcome?.metric ?? null,
        outcomeDelta: m.outcome?.delta ?? null,
        vectorJson,
        vectorVersion: 2,
      },
      update: {
        module: m.module,
        headlineAr,
        headlineEn,
        bodyAr,
        bodyEn,
        lessonEn,
        tagsJson: JSON.stringify(tags),
        entityRefsJson: JSON.stringify(m.entityRefs ?? []),
        outcomeMetric: m.outcome?.metric ?? null,
        outcomeDelta: m.outcome?.delta ?? null,
        vectorJson,
        vectorVersion: 2,
      },
    });
  }

  async recall(q: RecallQuery): Promise<Array<Memory & { similarity: number }>> {
    const top = Math.max(1, Math.min(20, q.topK ?? 5));
    const minSim = q.minSimilarity ?? 0.05;
    const filterTags = q.filterTags ?? [];

    // Dense query embedding (Phase RAG-1). Keep a lazy sparse vector too so
    // any legacy (v1) rows still score via the old bag-of-words path.
    const queryDense = await embedText(q.situation);
    const queryDenseEmpty = queryDense.every((x) => x === 0);
    let querySparse: Map<string, number> | null = null;

    // Pull the candidate set. For small corpora this is fine. When the
    // table grows, prune by tag/module first.
    const where: any = {};
    if (filterTags.length > 0) {
      // Best-effort: at least one tag must appear in the JSON string.
      // Keeps SQLite happy without needing JSON1 functions.
      where.OR = filterTags.map((t) => ({
        tagsJson: { contains: `"${t}"` },
      }));
    }

    const rows = await prisma.memory.findMany({ where, take: 800 });

    const scored: Array<{ row: any; similarity: number }> = [];
    for (const r of rows) {
      let sim: number;
      if (isDenseJson(r.vectorJson)) {
        // v2 dense embedding path
        if (queryDenseEmpty) continue;
        let stored: number[];
        try { stored = JSON.parse(r.vectorJson); } catch { continue; }
        if (!Array.isArray(stored) || stored.length === 0) continue;
        sim = cosineSim(queryDense, stored);
      } else {
        // legacy v1 sparse bag-of-words path
        if (!querySparse) querySparse = vectorize(q.situation);
        if (querySparse.size === 0) continue;
        const v = deserialize(r.vectorJson);
        if (v.size === 0) continue;
        sim = cosine(querySparse, v);
      }
      // Mild boost for tag overlap.
      if (filterTags.length > 0) {
        const tags = safeStringArray(r.tagsJson);
        const overlap = tags.filter((t) => filterTags.includes(t)).length;
        if (overlap > 0) sim *= 1 + 0.1 * overlap;
      }
      if (sim >= minSim) scored.push({ row: r, similarity: sim });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, top).map(({ row, similarity }) => rowToMemory(row, similarity));
  }

  async reconstruct(atDate: Date, scope?: { module?: string }): Promise<Memory[]> {
    const where: any = { occurredAt: { lte: atDate } };
    if (scope?.module) where.module = scope.module;
    const rows = await prisma.memory.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
    return rows.map((row) => rowToMemory(row));
  }
}

function rowToMemory(row: any, similarity?: number): Memory & { similarity: number; lesson?: { ar?: string | null; en?: string | null } } {
  return {
    id: row.id,
    ts: row.occurredAt,
    module: row.module,
    headline: { ar: row.headlineAr, en: row.headlineEn },
    body: { ar: row.bodyAr, en: row.bodyEn },
    tags: safeStringArray(row.tagsJson),
    entityRefs: safeStringArray(row.entityRefsJson),
    outcome:
      row.outcomeMetric != null
        ? {
            metric: row.outcomeMetric,
            delta: row.outcomeDelta ?? 0,
            lessonLearned: row.lessonEn ?? undefined,
          }
        : undefined,
    // Extra fields the UI uses — separate from the canonical Memory shape.
    lesson: { ar: row.lessonAr ?? null, en: row.lessonEn ?? null },
    similarity: similarity ?? 0,
  } as any;
}

let _instance: LiveMemoryLake | null = null;
export function memoryLake(): LiveMemoryLake {
  if (!_instance) _instance = new LiveMemoryLake();
  return _instance;
}

// ─────────────────────────────────────────────────────────────────────

function safeStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Re-export for convenience.
export { vectorize, cosine, serialize, deserialize };
