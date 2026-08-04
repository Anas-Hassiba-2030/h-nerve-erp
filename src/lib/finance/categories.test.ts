import { describe, it, expect } from "vitest";
import {
  TRANSACTION_CATEGORIES,
  normalizeCategory,
  isFnbDairySpend,
  categoryLabel,
  getCategory,
} from "./categories";

describe("category registry", () => {
  it("has unique ids", () => {
    const ids = TRANSACTION_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no alias claimed by two categories — an ambiguous fold is a silent miscount", () => {
    const seen = new Map<string, string>();
    for (const c of TRANSACTION_CATEGORIES) {
      for (const a of c.aliases) {
        const key = a.toLowerCase();
        expect(seen.has(key), `alias "${a}" claimed by ${seen.get(key)} and ${c.id}`).toBe(false);
        seen.set(key, c.id);
      }
    }
  });

  it("gives every category both an Arabic and an English label", () => {
    for (const c of TRANSACTION_CATEGORIES) {
      expect(c.labelAr.length, c.id).toBeGreaterThan(0);
      expect(c.labelEn.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe("normalizeCategory", () => {
  it("folds the spelling variants that made aggregation impossible", () => {
    // The exact failure the ceiling test hit: four spellings, one concept.
    for (const raw of ["F&B", "f and b", "food and beverage", "أغذية ومشروبات"]) {
      expect(normalizeCategory(raw), raw).toBe("FNB");
    }
  });

  it("recognises a canonical id passed straight through", () => {
    expect(normalizeCategory("FNB_DAIRY")).toBe("FNB_DAIRY");
  });

  it("is insensitive to case and surrounding whitespace", () => {
    expect(normalizeCategory("  PaYrOlL  ")).toBe("PAYROLL");
  });

  it("collapses runs of internal whitespace", () => {
    expect(normalizeCategory("food   and    beverage")).toBe("FNB");
  });

  it("returns null for unknown text instead of bucketing it into OTHER", () => {
    // Silently bucketing would hide how much of the ledger is untagged.
    expect(normalizeCategory("حجوزات المؤتمرات")).toBeNull();
    expect(normalizeCategory("")).toBeNull();
    expect(normalizeCategory(null)).toBeNull();
    expect(normalizeCategory(undefined)).toBeNull();
  });
});

describe("isFnbDairySpend", () => {
  it("recognises the hotel-side dairy spend the VOAC flow depends on", () => {
    for (const raw of ["FNB_DAIRY", "dairy", "ألبان", "F&B", "DAIRY"]) {
      expect(isFnbDairySpend(raw), raw).toBe(true);
    }
  });

  it("does not treat unrelated spend as dairy", () => {
    for (const raw of ["PAYROLL", "marketing", "tuition", "unknown thing", null]) {
      expect(isFnbDairySpend(raw), String(raw)).toBe(false);
    }
  });
});

describe("categoryLabel", () => {
  it("labels a canonical category in both locales", () => {
    expect(categoryLabel("FNB", "en")).toBe("Food & Beverage");
    expect(categoryLabel("FNB", "ar")).toBe("أغذية ومشروبات");
  });

  it("falls back to the raw string so legacy free text still reads correctly", () => {
    expect(categoryLabel("حجوزات المؤتمرات")).toBe("حجوزات المؤتمرات");
  });

  it("names an empty category rather than rendering a blank cell", () => {
    expect(categoryLabel("", "en")).toBe("Uncategorised");
    expect(categoryLabel(null, "ar")).toBe("غير مصنّف");
  });
});

describe("getCategory", () => {
  it("resolves by canonical id only", () => {
    expect(getCategory("FNB")?.labelEn).toBe("Food & Beverage");
    expect(getCategory("f&b")).toBeUndefined();
  });
});
