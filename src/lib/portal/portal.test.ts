import { describe, it, expect } from "vitest";
import { computeOutstandingBalance } from "./portal";

describe("computeOutstandingBalance", () => {
  it("sums total-minus-paid across invoices", () => {
    const r = computeOutstandingBalance([
      { status: "UNPAID", total: 100, paid: 0 },
      { status: "PARTIAL", total: 200, paid: 50 },
    ]);
    expect(r).toBe(250);
  });

  it("floors a per-invoice balance at zero (overpaid doesn't offset others)", () => {
    const r = computeOutstandingBalance([
      { status: "OVERPAID", total: 100, paid: 150 },
      { status: "UNPAID", total: 100, paid: 0 },
    ]);
    expect(r).toBe(100);
  });

  it("skips DRAFT and CANCELLED invoices", () => {
    const r = computeOutstandingBalance([
      { status: "DRAFT", total: 500, paid: 0 },
      { status: "CANCELLED", total: 300, paid: 0 },
      { status: "PAID", total: 100, paid: 100 },
    ]);
    expect(r).toBe(0);
  });

  it("returns zero for no invoices", () => {
    expect(computeOutstandingBalance([])).toBe(0);
  });
});
