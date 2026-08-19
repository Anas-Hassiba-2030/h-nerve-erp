import { describe, it, expect } from "vitest";
import { statusForPaid } from "./invoicing";

describe("statusForPaid", () => {
  it("marks an invoice PAID when the payments exactly cover it", () => {
    expect(statusForPaid(100, 100)).toBe("PAID");
  });

  it("marks a float-accumulated total PAID (regression: 0.1 + 0.2 !== 0.3)", () => {
    // A real invoice total is a SUM of line totals + tax, so it arrives here
    // as an inexact float. Paying it in full must still read PAID.
    const total = 0.1 + 0.2; // 0.30000000000000004
    expect(statusForPaid(total, 0.3)).toBe("PAID");

    const lines = [10.1, 20.2, 30.3]; // 60.6, but sums to 60.599999999999994
    const summed = lines.reduce((a, b) => a + b, 0);
    expect(summed).not.toBe(60.6); // proves the float error is real
    expect(statusForPaid(summed, 60.6)).toBe("PAID");
  });

  it("still distinguishes UNPAID / PARTIAL / OVERPAID", () => {
    expect(statusForPaid(100, 0)).toBe("UNPAID");
    expect(statusForPaid(100, -5)).toBe("UNPAID");
    expect(statusForPaid(100, 40)).toBe("PARTIAL");
    expect(statusForPaid(100, 100.01)).toBe("OVERPAID");
  });

  it("does not round a genuine one-cent shortfall into PAID", () => {
    expect(statusForPaid(100, 99.99)).toBe("PARTIAL");
  });
});
