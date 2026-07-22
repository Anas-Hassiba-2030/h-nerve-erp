import { describe, it, expect } from "vitest";
import { computeProjectActuals, budgetVariance } from "./projects";

describe("computeProjectActuals", () => {
  it("sums labor cost across entries at their own rate", () => {
    const result = computeProjectActuals(
      [
        { hours: 10, hourlyRate: 5, billable: true },
        { hours: 4, hourlyRate: 8, billable: true },
      ],
      [],
    );
    expect(result.laborCost).toBe(82); // 50 + 32
    expect(result.totalHours).toBe(14);
  });

  it("separates billable from non-billable hours and cost", () => {
    const result = computeProjectActuals(
      [
        { hours: 10, hourlyRate: 5, billable: true },
        { hours: 6, hourlyRate: 5, billable: false },
      ],
      [],
    );
    expect(result.laborCost).toBe(80);
    expect(result.laborCostBillable).toBe(50);
    expect(result.totalHours).toBe(16);
    expect(result.billableHours).toBe(10);
  });

  it("adds expense lines into totalActual alongside labor", () => {
    const result = computeProjectActuals(
      [{ hours: 10, hourlyRate: 5, billable: true }],
      [{ amount: 100 }, { amount: 25.5 }],
    );
    expect(result.expenseCost).toBe(125.5);
    expect(result.totalActual).toBe(175.5); // 50 labor + 125.5 expenses
  });

  it("returns all zeros for no entries and no expenses", () => {
    const result = computeProjectActuals([], []);
    expect(result).toEqual({
      laborCost: 0,
      laborCostBillable: 0,
      expenseCost: 0,
      totalActual: 0,
      totalHours: 0,
      billableHours: 0,
    });
  });
});

describe("budgetVariance", () => {
  it("flags UNDER when actual is well below budget", () => {
    const v = budgetVariance(1000, 500);
    expect(v.status).toBe("UNDER");
    expect(v.variance).toBe(500);
    expect(v.pctUsed).toBe(50);
  });

  it("flags OVER when actual exceeds budget by more than 5%", () => {
    const v = budgetVariance(1000, 1100);
    expect(v.status).toBe("OVER");
    expect(v.variance).toBe(-100);
  });

  it("flags ON_TRACK within +-5% of budget", () => {
    expect(budgetVariance(1000, 1030).status).toBe("ON_TRACK");
    expect(budgetVariance(1000, 970).status).toBe("ON_TRACK");
    expect(budgetVariance(1000, 1000).status).toBe("ON_TRACK");
  });

  it("treats a zero budget with zero spend as ON_TRACK, any spend as OVER", () => {
    expect(budgetVariance(0, 0).status).toBe("ON_TRACK");
    const overNoBudget = budgetVariance(0, 50);
    expect(overNoBudget.status).toBe("OVER");
    expect(overNoBudget.pctUsed).toBe(Infinity);
  });

  it("computes pctUsed correctly for a normal budget/actual pair", () => {
    expect(budgetVariance(200, 150).pctUsed).toBe(75);
  });
});
