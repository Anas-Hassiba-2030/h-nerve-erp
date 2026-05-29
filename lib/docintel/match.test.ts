// lib/docintel/match.test.ts — Phase NS-8 entity matcher.
// Pure unit tests (no DB, no network) — fits the lib/**/*.test.ts suite.

import { describe, it, expect } from "vitest";
import {
  normalizeName,
  tokenize,
  scoreMatch,
  matchEntity,
  extractEntityNames,
  matchDocumentEntities,
} from "./match";

describe("normalizeName", () => {
  it("lowercases, strips punctuation, and drops company suffixes", () => {
    expect(normalizeName("MENA Pack Ltd.")).toBe("mena pack");
    expect(normalizeName("Rijk Zwaan B.V.")).toBe("rijk zwaan");
    expect(normalizeName("  ACME,  Inc.  ")).toBe("acme");
  });
  it("folds Arabic alef/ya/ta-marbuta variants and drops شركة", () => {
    expect(normalizeName("شركة المها للألبان")).toBe(normalizeName("المها للالبان"));
    expect(normalizeName("إنتاج")).toBe(normalizeName("انتاج"));
  });
  it("returns empty string for blank input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits the normalized name into tokens", () => {
    expect(tokenize("MENA Pack Ltd.")).toEqual(["mena", "pack"]);
  });
});

describe("scoreMatch", () => {
  it("scores exact (normalized) equality as 1", () => {
    expect(scoreMatch("MENA Pack Ltd.", "MENA Pack")).toBe(1);
  });
  it("scores full containment of a shorter name highly", () => {
    expect(scoreMatch("MENA Pack Solutions", "MENA Pack")).toBeGreaterThanOrEqual(0.9);
  });
  it("scores disjoint names 0", () => {
    expect(scoreMatch("MENA Pack", "Loran Farms")).toBe(0);
  });
  it("scores empty input 0", () => {
    expect(scoreMatch("", "MENA Pack")).toBe(0);
  });
});

describe("matchEntity", () => {
  const suppliers = [
    { id: "s1", name: "MENA Pack" },
    { id: "s2", name: "Rijk Zwaan B.V." },
    { id: "s3", name: "JIDCO Labs" },
  ];
  it("returns the best match above threshold", () => {
    const m = matchEntity("MENA Pack Ltd.", suppliers);
    expect(m).not.toBeNull();
    expect(m?.id).toBe("s1");
    expect(m?.score).toBe(1);
  });
  it("returns null when nothing clears the threshold", () => {
    expect(matchEntity("Completely Unrelated Vendor", suppliers)).toBeNull();
  });
  it("picks the highest-scoring candidate", () => {
    const m = matchEntity("Rijk Zwaan", suppliers);
    expect(m?.id).toBe("s2");
  });
});

describe("extractEntityNames", () => {
  it("pulls vendor + parties + lab and de-dupes", () => {
    const names = extractEntityNames({
      vendor: "MENA Pack Ltd.",
      parties: ["مزارع لوران", "Rijk Zwaan B.V."],
      lab: "JIDCO",
      irrelevant: 42,
    });
    expect(names).toContain("MENA Pack Ltd.");
    expect(names).toContain("Rijk Zwaan B.V.");
    expect(names).toContain("مزارع لوران");
    expect(names).toContain("JIDCO");
  });
  it("returns [] for null/empty fields", () => {
    expect(extractEntityNames(null)).toEqual([]);
    expect(extractEntityNames({})).toEqual([]);
  });
});

describe("matchDocumentEntities", () => {
  const suppliers = [
    { id: "sup-mena", name: "MENA Pack" },
    { id: "sup-rijk", name: "Rijk Zwaan" },
  ];
  const customers = [{ id: "cust-arena", name: "Arena Space" }];

  it("links an invoice's vendor to the matching supplier", () => {
    const r = matchDocumentEntities(
      { vendor: "MENA Pack Ltd.", total: 23420 },
      suppliers,
      customers,
    );
    expect(r.supplier?.id).toBe("sup-mena");
    expect(r.customer).toBeNull();
  });
  it("links a contract party to a supplier", () => {
    const r = matchDocumentEntities(
      { parties: ["مزارع لوران للاستثمار الزراعي", "Rijk Zwaan B.V."] },
      suppliers,
      customers,
    );
    expect(r.supplier?.id).toBe("sup-rijk");
  });
  it("returns nulls when no entity matches", () => {
    const r = matchDocumentEntities({ vendor: "Nobody Ltd." }, suppliers, customers);
    expect(r.supplier).toBeNull();
    expect(r.customer).toBeNull();
  });
});
