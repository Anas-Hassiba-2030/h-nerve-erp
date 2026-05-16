// lib/workflows/templates.ts — the trigger/condition/action catalog the
// Phase-12 visual studio instantiates. A wrong lane or a non-string node
// summary breaks the canvas the pitch demos live. Pure registry + helpers.

import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  templatesByKind,
  getTemplate,
  defaultParams,
} from "./templates";

const ALL = Object.values(TEMPLATES);

describe("registry integrity", () => {
  it("keys are unique and TEMPLATES mirrors the raw list size", () => {
    expect(new Set(ALL.map((t) => t.key)).size).toBe(ALL.length);
    expect(ALL.length).toBeGreaterThan(0);
  });

  it("INVARIANT: kind maps to its canvas lane (trigger=1, condition=2, action=3)", () => {
    const lane = { trigger: 1, condition: 2, action: 3 } as const;
    for (const t of ALL) {
      expect(t.defaultColumn, t.key).toBe(lane[t.kind]);
      expect(t.labelEn).toBeTruthy();
      expect(t.labelAr).toBeTruthy();
    }
  });

  it("every template's summary() returns a string using its own defaults", () => {
    for (const t of ALL) {
      const s = t.summary(defaultParams(t));
      expect(typeof s, t.key).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe("templatesByKind", () => {
  it("partitions the catalog with no overlap or loss", () => {
    const t = templatesByKind("trigger");
    const c = templatesByKind("condition");
    const a = templatesByKind("action");
    for (const x of t) expect(x.kind).toBe("trigger");
    for (const x of c) expect(x.kind).toBe("condition");
    for (const x of a) expect(x.kind).toBe("action");
    expect(t.length + c.length + a.length).toBe(ALL.length);
  });
});

describe("getTemplate / defaultParams", () => {
  it("getTemplate resolves a known key, null for unknown", () => {
    expect(getTemplate("time.daily")?.kind).toBe("trigger");
    expect(getTemplate("does.not.exist")).toBeNull();
  });
  it("defaultParams projects each param to its default value", () => {
    const daily = getTemplate("time.daily")!;
    expect(defaultParams(daily)).toEqual({ hour: 9 });
    const noParam = getTemplate("action.generate_plan")!;
    expect(defaultParams(noParam)).toEqual({});
  });
});
