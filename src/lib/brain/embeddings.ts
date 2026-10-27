// lib/brain/embeddings.ts — the RAG embedding seam (Phase RAG-1).
//
// getEmbedder() returns ONE of two embedders. There is no embeddings API and no
// provider key anywhere (Anthropic has none; Gemini/OpenAI/Voyage were removed):
//
//   transformers  a LOCAL model run in-process with @huggingface/transformers
//                 (feature-extraction, mean pooling, L2-normalised, 384 dims).
//                 Multilingual (Arabic + English) because the data is bilingual:
//                 Xenova/paraphrase-multilingual-MiniLM-L12-v2. Lazy-loaded
//                 singleton; the model downloads once into the HF cache on first
//                 use. Node server runtime ONLY.
//   local-hash-v1 a deterministic feature-hashing embedder (256 dims). Needs
//                 nothing, so it is the default under tests, on the browser, and
//                 the honest fallback when the model cannot load.
//
// ⚠️ CLOUDFLARE WORKERS CANNOT RUN transformers.js: it needs onnxruntime-node
// (native) or a WASM + filesystem model cache that workerd does not provide.
// Production here is a Worker (wrangler.jsonc), so on Workers getEmbedder()
// resolves to the hash embedder. Semantic (transformers) vectors therefore come
// from a Node deployment (self-hosted / Railway-style) or from the offline
// re-index script, NOT from the Worker. Vectors of different dims are never
// compared: memory.live.ts skips stored vectors whose length differs from the
// query vector's, so a mixed corpus degrades to misses, never to noise.
//
// Pure + dependency-free at import time (no Prisma, no network, the model
// package is imported lazily) so it unit-tests with no DB and no model.

export const EMBED_DIM = 256; // the hash embedder
export const MODEL_DIM = 384; // MiniLM-L12 multilingual
export const DEFAULT_EMBED_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

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
// it is a correct, dense, cosine-comparable vector that needs no API.
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

// ─────────────────────────────────────────────────────────────────────
// Local MODEL embedder (transformers.js)
// ─────────────────────────────────────────────────────────────────────

/** Batch embed function: texts → raw (pooled) vectors. Injected in tests. */
export type ExtractFn = (texts: string[]) => Promise<number[][]>;

let _extract: ExtractFn | null = null; // loaded singleton (or test injection)
let _loading: Promise<ExtractFn> | null = null;
let _failed = false; // sticky: do not retry a load that cannot work here

/** Test seam: inject (or clear with null) the model extractor and reset state. */
export function __setExtractorForTest(fn: ExtractFn | null): void {
  _extract = fn;
  _loading = null;
  _failed = false;
  MODEL_CACHE.clear();
  _embedder = null;
  _embedderSig = "";
}

function modelId(): string {
  return process.env.EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL;
}

function onWorkers(): boolean {
  const nav = (globalThis as { navigator?: { userAgent?: string } }).navigator;
  return nav?.userAgent === "Cloudflare-Workers";
}

/** Which backend should be tried: "transformers" or "hash". */
export function embedBackend(): "transformers" | "hash" {
  const forced = process.env.EMBED_BACKEND?.trim().toLowerCase();
  if (forced === "hash") return "hash";
  if (typeof window !== "undefined") return "hash"; // server-only
  if (onWorkers()) return "hash"; // workerd cannot run onnxruntime
  if (forced === "transformers") return "transformers";
  // Default: the model on a Node server, hash under tests (no 100+ MB download).
  if (process.env.VITEST || process.env.NODE_ENV === "test") return "hash";
  return "transformers";
}

async function loadExtractor(): Promise<ExtractFn> {
  if (_extract) return _extract;
  if (!_loading) {
    _loading = (async () => {
      // Variable specifier + webpackIgnore: bundlers (Next, OpenNext/esbuild)
      // must not try to resolve the native onnxruntime tree at build time.
      const spec = "@huggingface/transformers";
      const mod: any = await import(/* webpackIgnore: true */ /* @vite-ignore */ spec);
      const pipe = await mod.pipeline("feature-extraction", modelId(), { dtype: "q8" });
      const fn: ExtractFn = async (texts) => {
        const out = await pipe(texts, { pooling: "mean", normalize: true });
        return out.tolist() as number[][];
      };
      _extract = fn;
      return fn;
    })();
  }
  return _loading;
}

const MODEL_CACHE = new Map<string, number[]>();
const CACHE_CAP = 4000;
const BATCH = 32;
const MAX_CHARS = 2000; // the model truncates to its window anyway; bound the work

function cacheSet(key: string, v: number[]) {
  if (MODEL_CACHE.size >= CACHE_CAP) {
    let n = Math.ceil(CACHE_CAP * 0.1);
    for (const k of MODEL_CACHE.keys()) {
      MODEL_CACHE.delete(k);
      if (--n <= 0) break;
    }
  }
  MODEL_CACHE.set(key, v);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let _warned = false;
function warnOnce(err: unknown) {
  if (_warned) return;
  _warned = true;
  console.error(
    "[embeddings] local model unavailable — falling back to the hash embedder:",
    String((err as Error)?.message ?? err).slice(0, 300),
  );
}

function modelEmbedder(): Embedder {
  const name = `transformers:${modelId()}`;
  return {
    name,
    // Honest dim: 384 while the model works, 256 once we have fallen back.
    get dim() {
      return _failed ? EMBED_DIM : MODEL_DIM;
    },
    async embed(texts: string[]): Promise<number[][]> {
      if (_failed) return texts.map((t) => localEmbed(t));
      const out: (number[] | null)[] = texts.map((t) => MODEL_CACHE.get(`${name}:${t}`) ?? null);
      const missing = out.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
      if (missing.length === 0) return out as number[][];

      const toEmbed = missing.map((i) => (texts[i] || " ").slice(0, MAX_CHARS));
      try {
        const extract = await loadExtractor();
        const vecs: number[][] = [];
        for (const part of chunk(toEmbed, BATCH)) {
          for (const v of await extract(part)) vecs.push(l2normalize(v));
        }
        // A partial answer would mix 384-dim vectors with 256-dim fallbacks in
        // one result; fail the WHOLE batch into the fallback instead.
        if (vecs.length !== toEmbed.length) {
          throw new Error(`extractor returned ${vecs.length}/${toEmbed.length} vectors`);
        }
        missing.forEach((origIdx, j) => {
          cacheSet(`${name}:${texts[origIdx]}`, vecs[j]);
          out[origIdx] = vecs[j];
        });
      } catch (err) {
        warnOnce(err);
        _failed = true; // sticky for this process (e.g. Workers, model not downloadable)
        _loading = null;
        // Whole result falls back, including cache hits, so dims stay uniform.
        return texts.map((t) => localEmbed(t));
      }
      return out as number[][];
    },
  };
}

/** True when the local MODEL embedder is the active one (not the hash fallback). */
export function hasEmbeddingProvider(): boolean {
  return embedBackend() === "transformers" && !_failed;
}

// Memoize the active embedder per process so the cache + factory are shared,
// re-deriving only if the backend selection changes.
let _embedder: Embedder | null = null;
let _embedderSig = "";

/**
 * Return the active embedder: the local MiniLM model on a Node server, else the
 * deterministic hash embedder (tests, browser, Workers, or after a load failure).
 */
export function getEmbedder(): Embedder {
  const useModel = embedBackend() === "transformers" && !_failed;
  const sig = useModel ? `m:${modelId()}` : "hash";
  if (_embedder && _embedderSig === sig) return _embedder;
  _embedderSig = sig;
  _embedder = useModel ? modelEmbedder() : localEmbedder;
  return _embedder;
}
