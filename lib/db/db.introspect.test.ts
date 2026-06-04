// lib/db.introspect.ts powers the superadmin Data Browser. If model lookup
// or cell formatting breaks, the browser renders the wrong table or crashes
// on a Date/JSON cell. Pure — reads the generated DMMF, no DB IO.

import { describe, it, expect } from "vitest";
import { listModels, getModel, formatCell } from "@/lib/db/db.introspect";

describe("listModels", () => {
  const models = listModels();

  it("returns the schema's models, alphabetised", () => {
    expect(models.length).toBeGreaterThan(0);
    const names = models.map((m) => m.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("derives the client property by lowercasing the first char", () => {
    const user = models.find((m) => m.name === "User");
    expect(user).toBeTruthy();
    expect(user!.prop).toBe("user");
  });

  it("exposes only renderable columns (no relations, no list fields)", () => {
    for (const m of models) {
      for (const c of m.columns) {
        expect(["scalar", "enum"]).toContain(c.kind);
      }
      // searchable is a subset of String columns
      const stringCols = new Set(m.columns.filter((c) => c.type === "String").map((c) => c.name));
      for (const s of m.searchable) expect(stringCols.has(s)).toBe(true);
    }
  });

  it("always names a sortable orderField that exists as a column (or id)", () => {
    for (const m of models) {
      const known = new Set([...m.columns.map((c) => c.name), "id"]);
      expect(known.has(m.orderField)).toBe(true);
    }
  });
});

describe("getModel", () => {
  it("resolves a known client property", () => {
    expect(getModel("user")?.name).toBe("User");
  });

  it("returns null for unknown props (guards prisma index access)", () => {
    expect(getModel("definitelyNotAModel")).toBeNull();
    expect(getModel("")).toBeNull();
    expect(getModel("__proto__")).toBeNull();
  });
});

describe("formatCell", () => {
  it("renders null/undefined as an em-dash", () => {
    expect(formatCell(null)).toBe("—");
    expect(formatCell(undefined)).toBe("—");
  });

  it("formats dates as 'YYYY-MM-DD HH:MM:SS'", () => {
    expect(formatCell(new Date("2026-05-29T19:05:17.000Z"))).toBe("2026-05-29 19:05:17");
  });

  it("renders primitives", () => {
    expect(formatCell(true)).toBe("true");
    expect(formatCell(false)).toBe("false");
    expect(formatCell(42)).toBe("42");
    expect(formatCell(10n)).toBe("10");
    expect(formatCell("hello")).toBe("hello");
  });

  it("JSON-stringifies objects", () => {
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
  });
});
