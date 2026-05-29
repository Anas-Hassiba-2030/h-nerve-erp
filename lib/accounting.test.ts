// lib/accounting.test.ts — Phase 8: double-entry accounting primitives.
// Only the pure, DB-free exports are tested here:
//   ACCT  — Chart of Accounts code constants
//   money — 2dp banker's-rounding helper
//
// The DB-dependent functions (getOrCreatePeriod, getLedgerAccount,
// postJournalEntry, getWeightedAverageCost, reverseJournalEntry) require
// a Prisma.TransactionClient and are covered by integration tests when the
// DB is available, not here.

import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { ACCT, money } from "./accounting";

// ─────────────────────────────────────────────────────────────────────
// ACCT — standard Hourani Chart of Accounts codes
// ─────────────────────────────────────────────────────────────────────

describe("ACCT constants", () => {
  it("every code is a 4-digit numeric string", () => {
    for (const [name, code] of Object.entries(ACCT)) {
      expect(typeof code, name).toBe("string");
      expect(/^\d{4}$/.test(code), `${name} = "${code}"`).toBe(true);
    }
  });

  it("all codes are unique (no transposition)", () => {
    const codes = Object.values(ACCT);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has the 8 canonical accounts the spec mandates", () => {
    const keys = Object.keys(ACCT);
    for (const k of [
      "INVENTORY",
      "CASH",
      "AR",
      "AP",
      "RETAINED_EARNINGS",
      "REVENUE",
      "COGS",
      "INVENTORY_ADJUSTMENT",
    ]) {
      expect(keys, `missing ${k}`).toContain(k);
    }
    expect(keys).toHaveLength(8);
  });

  it("asset codes (1xxx) are numerically below liability codes (2xxx)", () => {
    expect(Number(ACCT.INVENTORY)).toBeLessThan(Number(ACCT.AP));
    expect(Number(ACCT.CASH)).toBeLessThan(Number(ACCT.AP));
    expect(Number(ACCT.AR)).toBeLessThan(Number(ACCT.AP));
  });

  it("revenue/expense codes (4xxx/5xxx) are above equity codes (3xxx)", () => {
    expect(Number(ACCT.REVENUE)).toBeGreaterThan(Number(ACCT.RETAINED_EARNINGS));
    expect(Number(ACCT.COGS)).toBeGreaterThan(Number(ACCT.RETAINED_EARNINGS));
  });
});

// ─────────────────────────────────────────────────────────────────────
// money() — 2dp banker's rounding (ROUND_HALF_EVEN)
// ─────────────────────────────────────────────────────────────────────

describe("money()", () => {
  it("returns a Prisma.Decimal instance", () => {
    expect(money("10.00") instanceof Prisma.Decimal).toBe(true);
  });

  it("whole numbers stay whole (no spurious decimals beyond .00)", () => {
    expect(money(100).toFixed(2)).toBe("100.00");
  });

  it("rounds to 2dp — half-even (banker's) fires at the 3rd decimal place", () => {
    // 3rd decimal is 5: look at 2nd decimal to decide direction
    // 2.545 → 2nd decimal 4 (even) → round DOWN → 2.54
    expect(money("2.545").toFixed(2)).toBe("2.54");
    // 2.555 → 2nd decimal 5 (odd) → round UP → 2.56
    expect(money("2.555").toFixed(2)).toBe("2.56");
    // 2.565 → 2nd decimal 6 (even) → round DOWN → 2.56
    expect(money("2.565").toFixed(2)).toBe("2.56");
    // 2.575 → 2nd decimal 7 (odd) → round UP → 2.58
    expect(money("2.575").toFixed(2)).toBe("2.58");
  });

  it("truncates beyond 2dp correctly", () => {
    expect(money("1.005").toFixed(2)).toBe("1.00"); // 0.005 rounds to even 0
    expect(money("1.234").toFixed(2)).toBe("1.23");
    expect(money("1.235").toFixed(2)).toBe("1.24"); // 3 is odd → round up to 4
  });

  it("handles string input", () => {
    expect(money("99.999").toFixed(2)).toBe("100.00");
  });

  it("handles integer input", () => {
    expect(money(42).toFixed(2)).toBe("42.00");
  });

  it("handles Decimal input", () => {
    const d = new Prisma.Decimal("3.14159");
    expect(money(d).toFixed(2)).toBe("3.14");
  });

  it("preserves zero", () => {
    expect(money(0).isZero()).toBe(true);
    expect(money("0.00").isZero()).toBe(true);
  });

  it("works with negative amounts (credit notes / reversals)", () => {
    expect(money("-10.5").toFixed(2)).toBe("-10.50");
    // banker's rounding at 3rd decimal: -2.545 → 2nd decimal 4 (even) → -2.54
    expect(money("-2.545").toFixed(2)).toBe("-2.54");
  });

  it("two money() values summed stay exact — the debit==credit invariant holds", () => {
    // Simulate a balanced JE: debit 100.123 + 200.456, credit 300.579
    const debit1 = money("100.123"); // → 100.12
    const debit2 = money("200.456"); // → 200.46
    const credit = money("300.579"); // → 300.58
    const totalDebit = debit1.plus(debit2);
    const totalCredit = credit;
    expect(totalDebit.toString()).toBe(totalCredit.toString());
  });
});
