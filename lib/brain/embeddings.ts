// lib/brain/embeddings.ts — the RAG embedding seam (Phase RAG-1).
//
// The brain's memory recall (memory.live.ts) currently uses a bag-of-words
// vectorizer. The RAG roadmap (docs/RE-INFRASTRUCTURE-PLAN.md §2) upgrades
// recall to real dense embeddings + pgvector. This file is the *seam* that
// makes that swap a one-line config change:
//
//   getEmbedder() → a real API embedder when an embedding key is set
//                 → otherwise a deterministic LOCAL embedder (works offline,
//                   in tests, and in unauthenticated demos)
//
// Anthropic has no embeddings API, so the real provider is Voyage AI or
// OpenAI — set VOYAGE_API_KEY or OPENAI_API_KEY on Railway to light it up.
// Until then the local embedder keeps recall working with zero external deps.
//
// Pure + dependency-free (no Prisma, no network at import time) so it unit-tests
// with no DB and no API.

export const EMBED_DIM = 256;

export type Embedder = {
  readonly name: string;
  readonly dim: number;
  /** Embed a batch of texts → one dense, L2-normalized vector each. */
  embed(texts: string[]): Promise<number[][]>;
};

// ─────────────────────────────────────────────────────────────────────
// Local deterministic embedder — feature-hashing over token unigrams +
// bigrams into a fixed EMBED_DIM space, then L2-normalized. Same text →
// same vector, always. Not as semantically rich as a trained model, but
// it is a correct, dense, cosine-comparable vector that needs no API and
// keeps the public contract identical to the real provider.
// ─────────────────────────────────────────────────────────────────────

const WORD_RE = /[\p{L}\p{N}_]+/gu;
const STOP = new Set([
  "the","and","or","of","to","for","with","at","on","in","is","are","a","an",
  "في","من","على","إلى","عن","مع","هذا","هذه","ما","أن","قد","كل","هو","هي",
]);

function tokens(text: string): string[] {
  if (!text) return [];
  return (text.toLowerCase().match(WORD_RE) ?? []).filter(
    (t) => t.length >= 2 && !STOP.has(t),
  );
}

// FNV-1a 32-bit hash → stable bucket index + sign.
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function localEmbed(text: string, dim = EMBED_DIM): number[] {
  const v = new Array(dim).fill(0);
  const toks = tokens(text);
  const feats: string[] = [...toks];
  for (let i = 0; i < toks.length - 1; i++) feats.push(toks[i] + "_" + toks[i + 1]);
  for (const f of feats) {
    const h = hash32(f);
    const idx = h % dim;
    const sign = (h & 0x80000000) ? -1 : 1;
    // sublinear-ish: each hit adds a unit (sign), magnitude grows slowly
    v[idx] += sign;
  }
  // L2 normalize
  let sumSq = 0;
  for (const x of v) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dim; i++) v[i] = v[i] / norm;
  return v;
}

export const localEmbedder: Embedder = {
  name: "local-hash-v1",
  dim: EMBED_DIM,
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => localEmbed(t));
  },
};

/** Cosine similarity for two dense, equal-length vectors. */
export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // inputs are L2-normalized → dot == cosine
}

/** True if a real embedding provider key is configured. */
export function hasEmbeddingProvider(): boolean {
  return !!(
    process.env.VOYAGE_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.EMBEDDING_API_KEY?.trim()
  );
}

// The real provider is wired in a follow-up (it needs the key + a fetch call).
// getEmbedder returns the local embedder until then, so callers code against
// the Embedder contract today and gain real embeddings with zero changes.
export function getEmbedder(): Embedder {
  // Future: if (hasEmbeddingProvider()) return voyageEmbedder() / openaiEmbedder();
  return localEmbedder;
}
