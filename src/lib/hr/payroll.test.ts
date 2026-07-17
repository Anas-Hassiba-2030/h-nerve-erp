import { describe, it, expect } from "vitest";
import { computeNetPay } from "./payroll";

describe("computeNetPay", () => {
  it("adds allowances and subtracts deductions", () => {
    expect(computeNetPay(1000, 200, 100)).toBe(1100);
  });

  it("defaults to base salary with no allowances/deductions", () => {
    expect(computeNetPay(500, 0, 0)).toBe(500);
  });

  it("floors at 0 when deductions exceed base + allowances", () => {
    expect(computeNetPay(100, 0, 500)).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    expect(computeNetPay(333.333, 0.001, 0)).toBe(333.33);
  });
});
