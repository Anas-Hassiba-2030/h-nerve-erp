// lib/importMapping.test.ts — Phase 4: per-tenant column-name translation.
// Pure module, no DB. Guards the three public API surfaces:
//   parseMappingRow   — DB row → ImportMapping | null
//   sourceMatchesSystem — hyphen-bounded prefix check
//   applyMapping      — key-rewrite + default-fill on a record batch

import { describe, it, expect } from "vitest";
import {
  parseMappingRow,
  sourceMatchesSystem,
  applyMapping,
  type ImportMapping,
} from "./importMapping";

// ─────────────────────────────────────────────────────────────────────
// parseMappingRow
// ─────────────────────────────────────────────────────────────────────

describe("parseMappingRow", () => {
  const base = {
    fieldMapJson: JSON.stringify({ "Item Code": "sku", "Qty": "quantity" }),
    defaultsJson: null,
    active: true,
  };

  it("returns null for null / undefined input (no mapping row)", () => {
    expect(parseMappingRow(null)).toBeNull();
    expect(parseMappingRow(undefined)).toBeNull();
  });

  it("returns null when active === false (inactive mapping)", () => {
    expect(parseMappingRow({ ...base, active: false })).toBeNull();
  });

  it("returns null when fieldMapJson is not valid JSON", () => {
    expect(parseMappingRow({ ...base, fieldMapJson: "not json" })).toBeNull();
  });

  it("returns null when fieldMapJson is a JSON array (not an object map)", () => {
    expect(parseMappingRow({ ...base, fieldMapJson: "[1,2,3]" })).toBeNull();
  });

  it("returns null when fieldMapJson is a JSON primitive string", () => {
    expect(parseMappingRow({ ...base, fieldMapJson: '"hello"' })).toBeNull();
  });

  it("parses a valid active row — fieldMap has correct entries", () => {
    const result = parseMappingRow(base);
    expect(result).not.toBeNull();
    expect(result!.active).toBe(true);
    expect(result!.fieldMap["Item Code"]).toBe("sku");
    expect(result!.fieldMap["Qty"]).toBe("quantity");
  });

  it("drops fieldMap entries whose value is not a non-empty string", () => {
    const row = {
      ...base,
      fieldMapJson: JSON.stringify({
        "Good Key": "ourField",
        "Bad Number": 42,
        "Bad Empty": "",
        "Bad Null": null,
        "Bad Array": ["x"],
      }),
    };
    const result = parseMappingRow(row);
    expect(result!.fieldMap).toEqual({ "Good Key": "ourField" });
  });

  it("returns undefined defaults when defaultsJson is null", () => {
    const result = parseMappingRow(base);
    expect(result!.defaults).toBeUndefined();
  });

  it("parses defaultsJson when present and valid", () => {
    const row = {
      ...base,
      defaultsJson: JSON.stringify({ currency: "JOD", unit: "kg" }),
    };
    const result = parseMappingRow(row);
    expect(result!.defaults).toEqual({ currency: "JOD", unit: "kg" });
  });

  it("sets defaults to undefined when defaultsJson is malformed JSON", () => {
    const row = { ...base, defaultsJson: "{{bad}}" };
    const result = parseMappingRow(row);
    // safeObject returns null → defaults resolved to undefined
    expect(result!.defaults).toBeUndefined();
  });

  it("sets defaults to undefined when defaultsJson is a JSON array", () => {
    const row = { ...base, defaultsJson: "[1,2]" };
    const result = parseMappingRow(row);
    expect(result!.defaults).toBeUndefined();
  });

  it("produces an ImportMapping with active:true in all success cases", () => {
    const result = parseMappingRow(base);
    expect(result!.active).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// sourceMatchesSystem — hyphen-bounded prefix check
// ─────────────────────────────────────────────────────────────────────

describe("sourceMatchesSystem", () => {
  it("exact match → true", () => {
    expect(sourceMatchesSystem("maha-erp", "maha-erp")).toBe(true);
  });

  it("source with a hyphen-bounded version suffix → true", () => {
    expect(sourceMatchesSystem("maha-erp-2026-05", "maha-erp")).toBe(true);
  });

  it("deeper suffix is still a match (multiple hyphens)", () => {
    expect(sourceMatchesSystem("maha-erp-2026-05-batch", "maha-erp")).toBe(true);
  });

  it("shares a prefix but NOT separated by a hyphen → false ('maha-erpsilon' case)", () => {
    expect(sourceMatchesSystem("maha-erpsilon", "maha-erp")).toBe(false);
  });

  it("completely different systems → false", () => {
    expect(sourceMatchesSystem("loran-agri", "maha-erp")).toBe(false);
  });

  it("empty source string → false", () => {
    expect(sourceMatchesSystem("", "maha-erp")).toBe(false);
  });

  it("source shorter than system → false (unless exact)", () => {
    expect(sourceMatchesSystem("maha", "maha-erp")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// applyMapping
// ─────────────────────────────────────────────────────────────────────

const mapping: ImportMapping = {
  fieldMap: { "Item Code": "sku", "Qty": "quantity" },
  active: true,
};

describe("applyMapping — pass-through cases", () => {
  it("returns payload byte-identical when mapping is null", () => {
    const p = { records: [{ "Item Code": "A1", Qty: 5 }] };
    expect(applyMapping(p, null)).toBe(p); // same reference
  });

  it("returns payload byte-identical when mapping is undefined", () => {
    const p = { records: [{ foo: "bar" }] };
    expect(applyMapping(p, undefined)).toBe(p);
  });

  it("returns payload byte-identical when mapping.active is false", () => {
    const inactive: ImportMapping = { fieldMap: { "Item Code": "sku" }, active: false };
    const p = { records: [{ "Item Code": "A1" }] };
    expect(applyMapping(p, inactive)).toBe(p);
  });
});

describe("applyMapping — key remapping", () => {
  it("renames keys per fieldMap", () => {
    const p = { records: [{ "Item Code": "SKU-1", "Qty": 3 }] };
    const result = applyMapping(p, mapping);
    expect(result.records[0]).toMatchObject({ sku: "SKU-1", quantity: 3 });
  });

  it("preserves unmapped (extra) keys — they are kept for debugging", () => {
    const p = { records: [{ "Item Code": "SKU-1", extra: "debug" }] };
    const result = applyMapping(p, mapping);
    expect((result.records[0] as any).extra).toBe("debug");
  });

  it("only copies the remapped key when the source key is present", () => {
    // "Qty" absent from this record
    const p = { records: [{ "Item Code": "SKU-2" }] };
    const result = applyMapping(p, mapping);
    const rec = result.records[0] as any;
    expect(rec.sku).toBe("SKU-2");
    expect(rec.quantity).toBeUndefined();
  });

  it("handles multiple records independently", () => {
    const p = {
      records: [
        { "Item Code": "A", "Qty": 1 },
        { "Item Code": "B", "Qty": 2 },
      ],
    };
    const result = applyMapping(p, mapping);
    expect((result.records[0] as any).sku).toBe("A");
    expect((result.records[1] as any).sku).toBe("B");
  });
});

describe("applyMapping — defaults", () => {
  const mappingWithDefaults: ImportMapping = {
    fieldMap: { "Item Code": "sku" },
    defaults: { currency: "JOD", unit: "kg" },
    active: true,
  };

  it("fills a default when the field is absent after remapping", () => {
    const p = { records: [{ "Item Code": "SKU-1" }] };
    const result = applyMapping(p, mappingWithDefaults);
    expect((result.records[0] as any).currency).toBe("JOD");
    expect((result.records[0] as any).unit).toBe("kg");
  });

  it("does NOT overwrite an existing field with a default", () => {
    const p = { records: [{ "Item Code": "SKU-1", currency: "USD" }] };
    const result = applyMapping(p, mappingWithDefaults);
    expect((result.records[0] as any).currency).toBe("USD"); // kept
  });
});

describe("applyMapping — non-object records pass through", () => {
  it("leaves null records untouched (Zod rejects them downstream)", () => {
    const p = { records: [null as any] };
    const result = applyMapping(p, mapping);
    expect(result.records[0]).toBeNull();
  });

  it("leaves string records untouched", () => {
    const p = { records: ["raw-string" as any] };
    const result = applyMapping(p, mapping);
    expect(result.records[0]).toBe("raw-string");
  });

  it("leaves array records untouched", () => {
    const p = { records: [["a", "b"] as any] };
    const result = applyMapping(p, mapping);
    expect(Array.isArray(result.records[0])).toBe(true);
  });
});

describe("applyMapping — extra payload fields are forwarded", () => {
  it("non-records fields on the payload are preserved (spread ...payload)", () => {
    const p = { records: [{ "Item Code": "X" }], version: "v2", batchId: 99 } as any;
    const result = applyMapping(p, mapping) as any;
    expect(result.version).toBe("v2");
    expect(result.batchId).toBe(99);
  });
});
