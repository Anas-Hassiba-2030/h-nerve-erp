// lib/companyBrand.ts — every company cover, hero strip, sidebar accent
// and branded export resolves through getCompanyBrand(). A wrong/empty
// brand object renders a blank or crashed hero mid-pitch. Pure, zero IO.

import { describe, it, expect } from "vitest";
import {
  COMPANY_BRANDS,
  PERSONAL_BRANDS,
  getCompanyBrand,
  brandTextColor,
  type CompanyBrand,
} from "./companyBrand";

describe("getCompanyBrand — resolution + fallback", () => {
  it("known codes return their own brand", () => {
    expect(getCompanyBrand("ARENA").nameEn).toBe("Arena Space Hospitality");
    expect(getCompanyBrand("MAHA").code).toBe("MAHA");
    expect(getCompanyBrand("HH").nameEn).toBe("Hourani Holding");
  });

  it("null / undefined / empty-string all fall back to HH (never undefined)", () => {
    expect(getCompanyBrand(null).code).toBe("HH");
    expect(getCompanyBrand(undefined).code).toBe("HH");
    expect(getCompanyBrand("").code).toBe("HH");
  });

  it("an unknown code falls back to HH, not a crash", () => {
    expect(getCompanyBrand("DOES_NOT_EXIST").code).toBe("HH");
  });

  it("lookup is case-sensitive (keys are upper-case) — lowercase falls back", () => {
    expect(getCompanyBrand("arena").code).toBe("HH");
  });
});

describe("COMPANY_BRANDS — registry shape invariant", () => {
  const PATTERNS = ["topo", "waves", "leaves", "grid", "dots", "rings"];

  it("every brand has the full non-empty render shape", () => {
    for (const [key, b] of Object.entries(COMPANY_BRANDS)) {
      // the key must equal the embedded code (other files index by key)
      expect(b.code).toBe(key);
      for (const f of ["name", "nameEn", "emblem", "gradient", "accent", "accentSoft", "motto", "mottoEn"] as const) {
        expect(b[f], `${key}.${f}`).toBeTruthy();
      }
      expect(PATTERNS).toContain(b.pattern);
      expect(b.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(b.gradient).toContain("gradient");
    }
  });

  it("ships exactly the 5 Hourani units", () => {
    expect(Object.keys(COMPANY_BRANDS).sort()).toEqual(
      ["AAU", "ARENA", "HH", "LORAN", "MAHA"],
    );
  });
});

describe("brandTextColor", () => {
  it("is always white (covers sit on dark gradients)", () => {
    expect(brandTextColor(COMPANY_BRANDS.HH)).toBe("#ffffff");
    expect(brandTextColor({} as CompanyBrand)).toBe("#ffffff");
  });
});

describe("PERSONAL_BRANDS — stable keys for co-branding imports", () => {
  it("keeps ANAS_AI / HASIBA_G keys with renderable fields", () => {
    expect(PERSONAL_BRANDS.ANAS_AI.code).toBe("ANAS_AI");
    expect(PERSONAL_BRANDS.HASIBA_G.code).toBe("HASIBA_G");
    expect(PERSONAL_BRANDS.ANAS_AI.gradient).toContain("gradient");
  });
});
