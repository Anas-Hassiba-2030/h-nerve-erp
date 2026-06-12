// Tests for the Phase RAG-2-tail Python-literal serializer. Pure.

import { describe, it, expect } from "vitest";
import { toPyLiteral } from "./serialize";

describe("toPyLiteral", () => {
  it("renders Python primitives (None/True/False, not null/true/false)", () => {
    expect(toPyLiteral(null)).toBe("None");
    expect(toPyLiteral(undefined)).toBe("None");
    expect(toPyLiteral(true)).toBe("True");
    expect(toPyLiteral(false)).toBe("False");
    expect(toPyLiteral(42)).toBe("42");
    expect(toPyLiteral(3.5)).toBe("3.5");
  });

  it("single-quotes strings and escapes quotes/newlines", () => {
    expect(toPyLiteral("hi")).toBe("'hi'");
    expect(toPyLiteral("it's")).toBe("'it\\'s'");
    expect(toPyLiteral("a\nb")).toBe("'a\\nb'");
  });

  it("renders empty containers inline", () => {
    expect(toPyLiteral([])).toBe("[]");
    expect(toPyLiteral({})).toBe("{}");
  });

  it("renders a dict with single-quoted keys", () => {
    expect(toPyLiteral({ a: 1, b: "x" })).toBe("{\n  'a': 1,\n  'b': 'x'\n}");
  });

  it("renders nested graph-like structures", () => {
    const out = toPyLiteral({
      nodes: [{ kind: "Hotel", label: "Arena" }],
      links: ["Arena ->(+) Maha"],
    });
    expect(out).toContain("'nodes':");
    expect(out).toContain("'kind': 'Hotel'");
    expect(out).toContain("'links':");
    // No JSON-isms.
    expect(out).not.toContain('"');
  });

  it("drops undefined object values but keeps null as None", () => {
    expect(toPyLiteral({ a: undefined, b: null })).toBe("{\n  'b': None\n}");
  });

  it("coerces non-finite numbers to None and Dates to ISO strings", () => {
    expect(toPyLiteral(NaN)).toBe("None");
    expect(toPyLiteral(Infinity)).toBe("None");
    expect(toPyLiteral(new Date("2026-01-02T03:04:05.000Z"))).toBe("'2026-01-02T03:04:05.000Z'");
  });
});
