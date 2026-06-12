// lib/protocol/clauses.test.ts — Phase 20 constitution seed integrity.
// The five clauses are a public, pitch-facing artifact; a drift (missing
// vertical, broken bilingual pair, duplicate key) is a visible bug. Pure data.

import { describe, it, expect } from "vitest";
import { DEFAULT_PROTOCOL_CLAUSES } from "./clauses";

describe("DEFAULT_PROTOCOL_CLAUSES", () => {
  it("ships exactly the five mandated clauses", () => {
    expect(DEFAULT_PROTOCOL_CLAUSES).toHaveLength(5);
    expect(DEFAULT_PROTOCOL_CLAUSES.map((c) => c.key).sort()).toEqual(
      ["crisis", "data-governance", "hospitality", "procurement", "supplier"],
    );
  });

  it("has unique keys", () => {
    const keys = DEFAULT_PROTOCOL_CLAUSES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every clause is fully bilingual and non-empty", () => {
    for (const c of DEFAULT_PROTOCOL_CLAUSES) {
      for (const f of ["title", "titleEn", "body", "bodyEn"] as const) {
        expect(c[f], `${c.key}.${f}`).toBeTruthy();
        expect(typeof c[f]).toBe("string");
      }
    }
  });

  it("Arabic title/body actually contain Arabic script", () => {
    const arabic = /[؀-ۿ]/;
    for (const c of DEFAULT_PROTOCOL_CLAUSES) {
      expect(arabic.test(c.title), `${c.key}.title`).toBe(true);
      expect(arabic.test(c.body), `${c.key}.body`).toBe(true);
    }
  });

  it("orderIndex is a contiguous 0..4 sequence", () => {
    const order = DEFAULT_PROTOCOL_CLAUSES.map((c) => c.orderIndex).sort((a, b) => a - b);
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });
});
