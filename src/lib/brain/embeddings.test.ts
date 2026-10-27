// Tests for the RAG embedding seam (Phase RAG-1).
// The local embedder must be deterministic, dense, L2-normalized, and
// cosine-comparable — the contract the real provider will also satisfy.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  localEmbed,
  localEmbedder,
  cosineSim,
  getEmbedder,
  hasEmbeddingProvider,
  embedBackend,
  __setExtractorForTest,
  EMBED_DIM,
  MODEL_DIM,
} from "./embeddings";

describe("localEmbed", () => {
  it(`produces a vector of EMBED_DIM (${EMBED_DIM})`, () => {
    expect(localEmbed("Maha cheese production").length).toBe(EMBED_DIM);
  });

  it("is deterministic — same text, identical vector", () => {
    const a = localEmbed("Arena Sofia occupancy forecast");
    const b = localEmbed("Arena Sofia occupancy forecast");
    expect(a).toEqual(b);
  });

  it("is L2-normalized (magnitude ~1 for non-empty text)", () => {
    const v = localEmbed("dairy margin expiry waste");
    let sumSq = 0;
    for (const x of v) sumSq += x * x;
    expect(Math.sqrt(sumSq)).toBeCloseTo(1, 5);
  });

  it("empty / stopword-only text → zero vector", () => {
    const v = localEmbed("the of and في من");
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("cosineSim", () => {
  it("identical text → ~1.0", () => {
    const a = localEmbed("ramp Maha cheese for Q3 conferences");
    const b = localEmbed("ramp Maha cheese for Q3 conferences");
    expect(cosineSim(a, b)).toBeCloseTo(1, 5);
  });

  it("related text scores higher than unrelated text", () => {
    const q = localEmbed("hotel occupancy dropped at Arena");
    const related = localEmbed("Arena hotel occupancy fell sharply this month");
    const unrelated = localEmbed("greenhouse irrigation moisture sensor reading");
    expect(cosineSim(q, related)).toBeGreaterThan(cosineSim(q, unrelated));
  });

  it("is symmetric", () => {
    const a = localEmbed("loran feed orders");
    const b = localEmbed("feed orders at loran farm");
    expect(cosineSim(a, b)).toBeCloseTo(cosineSim(b, a), 10);
  });
});

describe("getEmbedder / localEmbedder contract", () => {
  it("getEmbedder returns an Embedder with the right dim", () => {
    const e = getEmbedder();
    expect(e.dim).toBe(EMBED_DIM);
    expect(typeof e.name).toBe("string");
  });

  it("embed() batches texts into one vector each", async () => {
    const out = await localEmbedder.embed(["first text here", "second text there"]);
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(EMBED_DIM);
    expect(out[1].length).toBe(EMBED_DIM);
  });
});

describe("local model embedder (transformers.js, pipeline mocked)", () => {
  const ENV = ["EMBED_BACKEND", "EMBED_MODEL"];
  // A fake pooled+normalised 384-dim "model": deterministic, no download.
  const fakeVec = (t: string) => {
    const v = new Array(MODEL_DIM).fill(0);
    v[t.length % MODEL_DIM] = 3; // un-normalised on purpose: the embedder must normalise
    return v;
  };
  const extractor = vi.fn(async (texts: string[]) => texts.map(fakeVec));

  beforeEach(() => {
    extractor.mockClear();
    __setExtractorForTest(extractor);
    process.env.EMBED_BACKEND = "transformers";
  });
  afterEach(() => {
    for (const k of ENV) delete process.env[k];
    __setExtractorForTest(null);
    vi.unstubAllGlobals();
  });

  it("under tests the default is the hash embedder (no model download)", () => {
    delete process.env.EMBED_BACKEND;
    expect(embedBackend()).toBe("hash");
    expect(getEmbedder().name).toBe("local-hash-v1");
    expect(hasEmbeddingProvider()).toBe(false);
  });

  it("EMBED_BACKEND=hash forces the hash embedder", () => {
    process.env.EMBED_BACKEND = "hash";
    expect(getEmbedder().name).toBe("local-hash-v1");
  });

  it("EMBED_BACKEND=transformers → model embedder, 384 dims, multilingual model id", () => {
    const e = getEmbedder();
    expect(e.name).toBe("transformers:Xenova/paraphrase-multilingual-MiniLM-L12-v2");
    expect(e.dim).toBe(MODEL_DIM);
    expect(hasEmbeddingProvider()).toBe(true);
  });

  it("embeds a batch: mean-pooled output is L2-normalised, one vector per text", async () => {
    const out = await getEmbedder().embed(["Maha dairy cold chain", "مبيعات الألبان"]);
    expect(out).toHaveLength(2);
    for (const v of out) {
      expect(v).toHaveLength(MODEL_DIM);
      expect(Math.sqrt(v.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 5);
    }
  });

  it("caches identical strings (the model is not re-run)", async () => {
    const e = getEmbedder();
    await e.embed(["same text"]);
    await e.embed(["same text"]);
    expect(extractor).toHaveBeenCalledTimes(1);
  });

  it("splits large inputs into batches", async () => {
    const texts = Array.from({ length: 70 }, (_, i) => `text number ${i}`);
    const out = await getEmbedder().embed(texts);
    expect(out).toHaveLength(70);
    expect(extractor).toHaveBeenCalledTimes(3); // 32 + 32 + 6
  });

  it("a one-off extractor error falls back to hash for that call only, never throws, and the next call retries", async () => {
    const boom = vi.fn(async () => {
      throw new Error("onnxruntime hiccup");
    });
    __setExtractorForTest(boom);
    process.env.EMBED_BACKEND = "transformers";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const [v] = await getEmbedder().embed(["Maha dairy cold chain"]);
    expect(v).toEqual(localEmbed("Maha dairy cold chain"));
    expect(v.length).toBe(EMBED_DIM);
    // not sticky: the model stays the active backend and the next call tries it again
    expect(hasEmbeddingProvider()).toBe(true);
    await getEmbedder().embed(["again"]);
    expect(boom).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("a partial extractor answer fails the WHOLE batch into hash vectors (uniform dims)", async () => {
    __setExtractorForTest(async (texts) => texts.slice(1).map(fakeVec));
    process.env.EMBED_BACKEND = "transformers";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getEmbedder().embed(["a text", "b text"]);
    expect(out.every((v) => v.length === EMBED_DIM)).toBe(true);
    spy.mockRestore();
  });
});
