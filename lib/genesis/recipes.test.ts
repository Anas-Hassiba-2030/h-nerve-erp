// Tests for the Genesis recipe catalog + diff. The contract:
//   • a blank database summarizes to isEmpty + every sector "empty",
//   • a fully-seeded database summarizes to every sector "complete",
//   • partial presence is detected per sector,
//   • requiredCountKeys() covers every key the recipes reference.

import { describe, it, expect } from "vitest";
import {
  GENESIS_RECIPES,
  summarizeGenesis,
  requiredCountKeys,
} from "./recipes";

const blank: Record<string, number> = {};

// A spread that lights up every presence + line key.
const full: Record<string, number> = {
  hotels: 3,
  bookings: 120,
  dairyBatches: 30,
  supplyForecasts: 24,
  farms: 4,
  crops: 12,
  programs: 8,
  brainEdges: 40,
  insights: 18,
  documents: 6,
  users: 4,
  companies: 4,
};

describe("summarizeGenesis", () => {
  it("blank DB → isEmpty and every sector empty", () => {
    const s = summarizeGenesis(blank);
    expect(s.isEmpty).toBe(true);
    expect(s.sectorsPresent).toBe(0);
    expect(s.sectors.every((x) => x.status === "empty")).toBe(true);
    expect(s.totalSectors).toBe(GENESIS_RECIPES.length);
  });

  it("fully seeded DB → not empty and every sector complete", () => {
    const s = summarizeGenesis(full);
    expect(s.isEmpty).toBe(false);
    expect(s.sectorsPresent).toBe(s.totalSectors);
    expect(s.sectors.every((x) => x.status === "complete")).toBe(true);
  });

  it("detects a partial sector (some lines present, some missing)", () => {
    // hospitality has hotels present but no bookings → partial
    const s = summarizeGenesis({ hotels: 3 });
    const hosp = s.sectors.find((x) => x.id === "hospitality")!;
    expect(hosp.status).toBe("partial");
    expect(hosp.lines.find((l) => l.countKey === "bookings")!.missing).toBe(true);
    expect(hosp.lines.find((l) => l.countKey === "hotels")!.missing).toBe(false);
  });

  it("negative / fractional counts are clamped to whole non-negative present", () => {
    const s = summarizeGenesis({ users: -5, companies: 2.9 });
    const ppl = s.sectors.find((x) => x.id === "people")!;
    expect(ppl.lines.find((l) => l.key === "ppl-users")!.present).toBe(0);
    expect(ppl.lines.find((l) => l.key === "ppl-companies")!.present).toBe(2);
  });

  it("each sector's target is the sum of its line targets", () => {
    const s = summarizeGenesis(blank);
    for (const sec of s.sectors) {
      const recipe = GENESIS_RECIPES.find((r) => r.id === sec.id)!;
      expect(sec.target).toBe(recipe.lines.reduce((a, l) => a + l.target, 0));
    }
  });
});

describe("requiredCountKeys", () => {
  it("covers every presence key and line countKey, de-duplicated", () => {
    const keys = requiredCountKeys();
    const set = new Set(keys);
    expect(set.size).toBe(keys.length); // no dupes
    for (const r of GENESIS_RECIPES) {
      expect(set.has(r.presenceKey)).toBe(true);
      for (const l of r.lines) expect(set.has(l.countKey)).toBe(true);
    }
  });
});
