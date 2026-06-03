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
// Anthropic has no embeddings API, so the real provider is Google Gemini,
// OpenAI, or Voyage AI — set GEMINI_API_KEY (or GOOGLE_API_KEY), OPENAI_API_KEY,
// or VOYAGE_API_KEY on Railway to light it up (Gemini takes precedence). On any
// API error the embedder falls back to local, so a bad key never crashes the
// brain; until a key is set the local embedder keeps recall working offline.
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

/** L2-normalize a vector (returns a new array) so cosineSim == dot product. */
function l2normalize(v: number[]): number[] {
  let sumSq = 0;
  for (const x of v) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  return v.map((x) => x / norm);
}

/** True if a real embedding provider key is configured. */
export function hasEmbeddingProvider(): boolean {
  return !!(
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.VOYAGE_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.EMBEDDING_API_KEY?.trim()
  );
}

// ─────────────────────────────────────────────────────────────────────
// Real provider embedders. Each calls its HTTP API, L2-normalizes the
// result (so cosineSim == dot holds), and FALLS BACK to the local embedder
// on any error — a bad key or network blip degrades retrieval quality
// instead of crashing the brain. A small in-process cache avoids
// re-embedding identical strings (the council re-embeds node labels every
// convene); pgvector is the durable cache, this is the cheap in-memory one.
// ─────────────────────────────────────────────────────────────────────

const CACHE = new Map<string, number[]>();
const CACHE_CAP = 4000;

function cacheSet(key: string, v: number[]) {
  if (CACHE.size >= CACHE_CAP) {
    let n = Math.ceil(CACHE_CAP * 0.1);
    for (const k of CACHE.keys()) {
      CACHE.delete(k);
      if (--n <= 0) break;
    }
  }
  CACHE.set(key, v);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let _warned = false;
function warnOnce(provider: string, err: unknown) {
  if (_warned) return;
  _warned = true;
  console.error(`[embeddings] ${provider} failed — falling back to local embedder:`, String(err));
}

/**
 * Build a real Embedder from a batch-embed function. Handles caching, the
 * empty-string edge, and per-batch fallback to localEmbed on any failure.
 */
function makeRemoteEmbedder(
  name: string,
  batchSize: number,
  call: (texts: string[]) => Promise<number[][]>,
): Embedder {
  return {
    name,
    // Provider-native dim (e.g. Gemini 768). cosineSim compares same-provider
    // vectors, so the absolute size doesn't matter; 0 signals "variable".
    dim: 0,
    async embed(texts: string[]): Promise<number[][]> {
      const out: (number[] | null)[] = texts.map((t) => CACHE.get(`${name}:${t}`) ?? null);
      const missing = out.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
      if (missing.length === 0) return out as number[][];

      const toEmbed = missing.map((i) => texts[i] || " ");
      try {
        const vecs: number[][] = [];
        for (const part of chunk(toEmbed, batchSize)) {
          for (const v of await call(part)) vecs.push(l2normalize(v));
        }
        missing.forEach((origIdx, j) => {
          const v = vecs[j] ?? localEmbed(texts[origIdx]);
          cacheSet(`${name}:${texts[origIdx]}`, v);
          out[origIdx] = v;
        });
      } catch (err) {
        warnOnce(name, err);
        missing.forEach((origIdx) => {
          out[origIdx] = localEmbed(texts[origIdx]);
        });
      }
      return out as number[][];
    },
  };
}

function geminiEmbedder(key: string): Embedder {
  // gemini-embedding-001 is the current GA model (text-embedding-004 is retired
  // for newer keys). It defaults to 3072 dims; we request a lighter 1536 to
  // keep stored memory vectors compact — makeRemoteEmbedder L2-normalizes,
  // which Google requires for any reduced dimensionality. Both overridable.
  const model = process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001";
  const outputDimensionality = Number(process.env.GEMINI_EMBED_DIM) || 1536;
  return makeRemoteEmbedder(`gemini:${model}`, 96, async (texts) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: `models/${model}`,
            content: { parts: [{ text: t }] },
            outputDimensionality,
          })),
        }),
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
    return json.embeddings.map((e) => e.values);
  });
}

function openaiEmbedder(key: string): Embedder {
  const model = process.env.OPENAI_EMBED_MODEL?.trim() || "text-embedding-3-small";
  return makeRemoteEmbedder(`openai:${model}`, 128, async (texts) => {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, input: texts }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  });
}

function voyageEmbedder(key: string): Embedder {
  const model = process.env.VOYAGE_EMBED_MODEL?.trim() || "voyage-3";
  return makeRemoteEmbedder(`voyage:${model}`, 128, async (texts) => {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, input: texts }),
    });
    if (!res.ok) throw new Error(`voyage ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((d) => d.embedding);
  });
}

// Memoize the active embedder per process so the cache + factory are shared,
// re-deriving only if the configured key class changes.
let _embedder: Embedder | null = null;
let _embedderSig = "";

/**
 * Return the active embedder. Picks a real provider when its key is set
 * (Gemini → OpenAI → Voyage precedence), else the deterministic local one.
 * Set GEMINI_API_KEY (or GOOGLE_API_KEY) — or OPENAI_API_KEY / VOYAGE_API_KEY —
 * on Railway to light up real semantic search with zero other changes.
 */
export function getEmbedder(): Embedder {
  const gemini = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const voyage = process.env.VOYAGE_API_KEY?.trim();
  const sig = gemini ? "g" : openai ? "o" : voyage ? "v" : "local";
  if (_embedder && _embedderSig === sig) return _embedder;

  _embedderSig = sig;
  if (gemini) _embedder = geminiEmbedder(gemini);
  else if (openai) _embedder = openaiEmbedder(openai);
  else if (voyage) _embedder = voyageEmbedder(voyage);
  else _embedder = localEmbedder;
  return _embedder;
}
