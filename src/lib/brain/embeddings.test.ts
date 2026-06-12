// Tests for the RAG embedding seam (Phase RAG-1).
// The local embedder must be deterministic, dense, L2-normalized, and
// cosine-comparable — the contract the real provider will also satisfy.

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  localEmbed,
  localEmbedder,
  cosineSim,
  getEmbedder,
  hasEmbeddingProvider,
  EMBED_DIM,
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

describe("real provider selection (Gemini / OpenAI / Voyage)", () => {
  const KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY", "VOYAGE_API_KEY", "EMBEDDING_API_KEY"];
  afterEach(() => {
    for (const k of KEYS) delete process.env[k];
    vi.unstubAllGlobals();
  });

  it("no key → local embedder", () => {
    expect(getEmbedder().name).toBe("local-hash-v1");
    expect(hasEmbeddingProvider()).toBe(false);
  });

  it("GEMINI_API_KEY → gemini embedder, and hasEmbeddingProvider is true", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(getEmbedder().name).toMatch(/^gemini:/);
    expect(hasEmbeddingProvider()).toBe(true);
  });

  it("OPENAI_API_KEY → openai embedder", () => {
    process.env.OPENAI_API_KEY = "test-key";
    expect(getEmbedder().name).toMatch(/^openai:/);
  });

  it("VOYAGE_API_KEY → voyage embedder", () => {
    process.env.VOYAGE_API_KEY = "test-key";
    expect(getEmbedder().name).toMatch(/^voyage:/);
  });

  it("Gemini takes precedence when several keys are set", () => {
    process.env.OPENAI_API_KEY = "o";
    process.env.VOYAGE_API_KEY = "v";
    process.env.GEMINI_API_KEY = "g";
    expect(getEmbedder().name).toMatch(/^gemini:/);
  });

  it("a real provider falls back to local vectors when the API call fails", async () => {
    process.env.GEMINI_API_KEY = "bad-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const [v] = await getEmbedder().embed(["Maha dairy cold chain"]);
    // Fallback returns a local EMBED_DIM vector — retrieval degrades, never crashes.
    expect(v.length).toBe(EMBED_DIM);
    expect(v).toEqual(localEmbed("Maha dairy cold chain"));
  });
});
