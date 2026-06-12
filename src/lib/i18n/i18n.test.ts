// lib/i18n.ts — the message layer behind every label in a bilingual,
// RTL-first pitch. A missing key or wrong locale resolution shows a raw
// "nav.dashboard" string on screen. Pure data, no server imports.

import { describe, it, expect } from "vitest";
import {
  localeOrDefault,
  getMessagesByLocale,
  isRtl,
  tBy,
  MESSAGES,
  type MessageKey,
} from "@/lib/i18n/i18n";

describe("localeOrDefault — Arabic is the default", () => {
  it("returns 'en' ONLY for the exact string 'en'", () => {
    expect(localeOrDefault("en")).toBe("en");
    expect(localeOrDefault("EN")).toBe("ar"); // exact match only
    expect(localeOrDefault("en-US")).toBe("ar");
  });
  it("anything else (incl. null/undefined/garbage) is 'ar'", () => {
    expect(localeOrDefault("ar")).toBe("ar");
    expect(localeOrDefault("fr")).toBe("ar");
    expect(localeOrDefault(null)).toBe("ar");
    expect(localeOrDefault(undefined)).toBe("ar");
    expect(localeOrDefault("")).toBe("ar");
  });
});

describe("isRtl", () => {
  it("only Arabic is RTL", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});

describe("getMessagesByLocale", () => {
  it("returns the requested locale's dictionary", () => {
    expect(getMessagesByLocale("ar")["nav.dashboard"]).toBe("اللوحة التنفيذية");
    expect(getMessagesByLocale("en")["nav.dashboard"]).toBe("Executive Dashboard");
  });
});

describe("ar/en dictionary parity (a missing key = an untranslated label)", () => {
  it("both locales expose the exact same key set", () => {
    const arKeys = Object.keys(MESSAGES.ar).sort();
    const enKeys = Object.keys(MESSAGES.en).sort();
    expect(enKeys).toEqual(arKeys);
  });
  it("no value is an empty string in either locale", () => {
    for (const [k, v] of Object.entries(MESSAGES.ar)) expect(v, `ar.${k}`).toBeTruthy();
    for (const [k, v] of Object.entries(MESSAGES.en)) expect(v, `en.${k}`).toBeTruthy();
  });
});

describe("tBy — locale lookup with safe fallback chain", () => {
  it("resolves a real key in the asked locale", () => {
    expect(tBy("en", "app.name")).toBe("H‑Nerve ERP");
    expect(tBy("ar", "common.save")).toBe("حفظ");
  });
  it("an unknown key degrades to the key string, never throws / never undefined", () => {
    const bogus = "totally.missing.key" as unknown as MessageKey;
    expect(tBy("en", bogus)).toBe("totally.missing.key");
    expect(tBy("ar", bogus)).toBe("totally.missing.key");
  });
});
