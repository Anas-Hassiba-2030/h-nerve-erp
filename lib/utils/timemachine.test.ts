// lib/timemachine.ts — the "as-of" cursor. getAsOf() runs on EVERY SSR
// render; a wrong parse silently rewrites every figure in the pitch, or
// throws and 500s the page. We mock next/headers + ./db so only the pure
// cookie/date logic is under test (importing ./db would spin a PrismaClient).

import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/db/db", () => ({ prisma: {}, prismaUnscoped: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import {
  getAsOf,
  formatAsOfLabel,
  TIME_MACHINE_COOKIE,
  TIME_MACHINE_MIN_DATE,
  TIME_MACHINE_MAX_DATE,
} from "@/lib/utils/timemachine";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function setCookie(value: string | undefined) {
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      name === TIME_MACHINE_COOKIE && value !== undefined ? { value } : undefined,
  } as any);
}

const LIVE = { asOf: null, isTraveling: false, daysBack: 0 };

describe("getAsOf — defaults to LIVE on anything unusable", () => {
  it("no cookie → live", () => {
    setCookie(undefined);
    expect(getAsOf()).toEqual(LIVE);
  });
  it("non-numeric cookie → live (never NaN date)", () => {
    setCookie("not-a-timestamp");
    expect(getAsOf()).toEqual(LIVE);
  });
  it("zero / negative timestamp → live", () => {
    setCookie("0");
    expect(getAsOf()).toEqual(LIVE);
    setCookie("-9999");
    expect(getAsOf()).toEqual(LIVE);
  });
  it("a FUTURE timestamp is refused (nothing to reconstruct ahead of now)", () => {
    setCookie(String(Date.now() + 5 * DAY));
    expect(getAsOf()).toEqual(LIVE);
  });
  it("a stale cookie < 12h old is treated as live (no per-render pollution)", () => {
    setCookie(String(Date.now() - 3 * HOUR));
    expect(getAsOf()).toEqual(LIVE);
  });
});

describe("getAsOf — genuine travel", () => {
  it("a clearly-past timestamp travels, with rounded daysBack", () => {
    const ts = Date.now() - 10 * DAY;
    setCookie(String(ts));
    const s = getAsOf();
    expect(s.isTraveling).toBe(true);
    expect(s.daysBack).toBe(10);
    expect(s.asOf).toBeInstanceOf(Date);
    expect(s.asOf?.getTime()).toBe(ts);
  });
});

describe("formatAsOfLabel — bilingual, Latin digits on BOTH sides", () => {
  const d = new Date("2026-05-16T12:00:00.000Z");
  it("en label is a non-empty string carrying the year", () => {
    const s = formatAsOfLabel(d, "en");
    expect(typeof s).toBe("string");
    expect(s).toContain("2026");
  });
  it("ar label uses Latin numerals (no Arabic-Indic digits ٠-٩)", () => {
    const s = formatAsOfLabel(d, "ar");
    expect(s).toContain("2026");
    expect(s).not.toMatch(/[٠-٩]/); // the real contract
  });
});

describe("scrub boundary constants", () => {
  it("MIN is the fixed 2025-09-01 floor", () => {
    expect(TIME_MACHINE_MIN_DATE.toISOString()).toBe("2025-09-01T00:00:00.000Z");
  });
  it("MAX() is ~now and never before MIN", () => {
    const max = TIME_MACHINE_MAX_DATE();
    expect(max).toBeInstanceOf(Date);
    expect(max.getTime()).toBeGreaterThan(TIME_MACHINE_MIN_DATE.getTime());
    expect(Math.abs(Date.now() - max.getTime())).toBeLessThan(5000);
  });
});
