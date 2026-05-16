// lib/integrations/catalog.ts — the 24-tile connectors marketplace
// (Phase 13). A mis-categorized or dup-keyed provider breaks the hub grid
// and the connect flow. Pure data + two lookups.

import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  PROVIDERS,
  getProvider,
  providersByCategory,
  type IntegrationCategory,
} from "./catalog";

const CAT_KEYS = Object.keys(CATEGORIES) as IntegrationCategory[];

describe("catalog integrity", () => {
  it("ships exactly 24 providers across 6 categories", () => {
    expect(PROVIDERS).toHaveLength(24);
    expect(CAT_KEYS).toHaveLength(6);
  });
  it("provider keys are unique", () => {
    expect(new Set(PROVIDERS.map((p) => p.key)).size).toBe(PROVIDERS.length);
  });
  it("every provider is in a known category with the required render fields", () => {
    for (const p of PROVIDERS) {
      expect(CAT_KEYS).toContain(p.category);
      expect(p.name).toBeTruthy();
      expect(p.nameAr).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.descriptionAr).toBeTruthy();
      expect(p.glyph).toBeTruthy();
      expect(p.brandColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.scopes.length).toBeGreaterThan(0);
    }
  });
  it("each category has a bilingual label", () => {
    for (const k of CAT_KEYS) {
      expect(CATEGORIES[k].en).toBeTruthy();
      expect(CATEGORIES[k].ar).toBeTruthy();
    }
  });
});

describe("getProvider", () => {
  it("returns the provider for a known key, null otherwise", () => {
    expect(getProvider("slack")?.name).toBe("Slack");
    expect(getProvider("nope")).toBeNull();
  });
});

describe("providersByCategory", () => {
  it("filters to that category only, and the parts sum to the whole", () => {
    let total = 0;
    for (const k of CAT_KEYS) {
      const list = providersByCategory(k);
      for (const p of list) expect(p.category).toBe(k);
      total += list.length;
    }
    expect(total).toBe(PROVIDERS.length);
  });
});
