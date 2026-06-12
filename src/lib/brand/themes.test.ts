// lib/brand/themes.ts — the 6 white-label presets a tenant picks at
// provisioning. A preset missing a CSS var leaves that tenant's UI with an
// unset color mid-demo. Pure, no IO.

import { describe, it, expect } from "vitest";
import { THEME_PRESETS, PACK_CATALOG, themeCssVars, type ThemeKey } from "./themes";

const KEYS: ThemeKey[] = [
  "heritage", "ocean", "ember", "forest", "monolith", "pearl",
  "midnight-nerve", "desert-gold", "obsidian",
];

describe("THEME_PRESETS — registry integrity", () => {
  it("ships exactly the 9 documented presets", () => {
    expect(Object.keys(THEME_PRESETS).sort()).toEqual([...KEYS].sort());
  });

  it("each preset is self-consistent and renderable", () => {
    for (const k of KEYS) {
      const p = THEME_PRESETS[k];
      expect(p.key).toBe(k); // key matches its registry slot
      expect(p.nameEn).toBeTruthy();
      expect(p.nameAr).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.emblem).toBeTruthy();
      expect(p.swatches).toHaveLength(5);
      for (const s of p.swatches) expect(s).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("every preset overrides the SAME CSS-var set (no tenant left unstyled)", () => {
    const baseline = Object.keys(THEME_PRESETS.heritage.vars).sort();
    expect(baseline.length).toBeGreaterThan(0);
    for (const k of KEYS) {
      expect(Object.keys(THEME_PRESETS[k].vars).sort()).toEqual(baseline);
      for (const v of Object.values(THEME_PRESETS[k].vars)) {
        expect(v).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    }
  });
});

describe("themeCssVars", () => {
  it("emits 'name: value;' pairs for every var of the preset", () => {
    const css = themeCssVars("heritage");
    expect(css).toContain("--heri-cream: #f5efe6;");
    const pairs = css.trim().split(";").filter(Boolean);
    expect(pairs).toHaveLength(Object.keys(THEME_PRESETS.heritage.vars).length);
  });
});

describe("PACK_CATALOG", () => {
  it("lists the 5 industry packs with bilingual labels + icon", () => {
    expect(PACK_CATALOG).toHaveLength(5);
    for (const p of PACK_CATALOG) {
      expect(p.key).toBeTruthy();
      expect(p.nameEn).toBeTruthy();
      expect(p.nameAr).toBeTruthy();
      expect(p.icon).toBeTruthy();
    }
    expect(PACK_CATALOG.map((p) => p.key)).toEqual([
      "hospitality", "dairy", "agri", "education", "finance",
    ]);
  });
});
