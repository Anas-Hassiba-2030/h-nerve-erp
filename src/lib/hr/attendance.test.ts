import { describe, it, expect } from "vitest";
import { hoursWorked, overtimeHours, hourlyRateFromMonthlySalary, overtimePay, isLateClockIn } from "./attendance";

describe("hoursWorked", () => {
  it("computes the hour span between clock-in and clock-out", () => {
    const inAt = new Date("2026-07-22T08:00:00Z");
    const outAt = new Date("2026-07-22T17:30:00Z");
    expect(hoursWorked(inAt, outAt)).toBe(9.5);
  });

  it("floors at 0 for a clock-out before clock-in (bad data)", () => {
    const inAt = new Date("2026-07-22T17:00:00Z");
    const outAt = new Date("2026-07-22T08:00:00Z");
    expect(hoursWorked(inAt, outAt)).toBe(0);
  });
});

describe("overtimeHours", () => {
  it("is 0 at or under the standard day", () => {
    expect(overtimeHours(8)).toBe(0);
    expect(overtimeHours(7)).toBe(0);
  });

  it("is the excess over 8 by default", () => {
    expect(overtimeHours(9.5)).toBe(1.5);
  });

  it("respects a custom standard-day length", () => {
    expect(overtimeHours(9, 10)).toBe(0);
    expect(overtimeHours(11, 10)).toBe(1);
  });
});

describe("hourlyRateFromMonthlySalary", () => {
  it("divides by 26 days x 8 hours by default", () => {
    expect(hourlyRateFromMonthlySalary(4160)).toBe(20); // 4160 / 208
  });

  it("respects custom working days/hours", () => {
    expect(hourlyRateFromMonthlySalary(4000, 8, 25)).toBe(20); // 4000/200
  });

  it("returns 0 for a degenerate divisor rather than dividing by zero", () => {
    expect(hourlyRateFromMonthlySalary(1000, 0, 26)).toBe(0);
  });
});

describe("overtimePay", () => {
  it("applies the 1.5x default multiplier", () => {
    expect(overtimePay(2, 20)).toBe(60); // 2 * 20 * 1.5
  });

  it("respects a custom multiplier", () => {
    expect(overtimePay(2, 20, 2)).toBe(80);
  });
});

describe("isLateClockIn", () => {
  it("flags a clock-in after the shift start", () => {
    const clockIn = new Date("2026-07-22T07:15:00");
    expect(isLateClockIn(clockIn, "07:00")).toBe(true);
  });

  it("does not flag an on-time or early clock-in", () => {
    const onTime = new Date("2026-07-22T07:00:00");
    const early = new Date("2026-07-22T06:45:00");
    expect(isLateClockIn(onTime, "07:00")).toBe(false);
    expect(isLateClockIn(early, "07:00")).toBe(false);
  });
});
