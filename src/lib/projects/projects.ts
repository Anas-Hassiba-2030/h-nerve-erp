// Project accounting — docs/HOURANI-ERP-GAPS.md #9 🟠. Pure — no DB
// imports. Rolls up logged TimesheetEntry hours + ProjectExpense lines
// into a budget-vs-actual read (not a ledger posting — see
// prisma/schema/projects.prisma's header for why v1 stays
// ledger-free). Labor cost per entry uses its own hourlyRate if set,
// else the caller resolves one from Employee.baseSalary via
// hourlyRateFromMonthlySalary (lib/hr/attendance.ts) — this file stays
// employee-model-free so it has no DB dependency at all.

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface TimesheetEntryInput {
  hours: number;
  /** Resolved rate for this entry — caller supplies Employee's derived
   *  rate when the entry itself has no override. */
  hourlyRate: number;
  billable: boolean;
}

export interface ProjectExpenseInput {
  amount: number;
}

export interface ProjectActuals {
  laborCost: number;
  laborCostBillable: number;
  expenseCost: number;
  totalActual: number;
  totalHours: number;
  billableHours: number;
}

/** Sums logged hours × rate and expense amounts into actual cost. */
export function computeProjectActuals(
  entries: TimesheetEntryInput[],
  expenses: ProjectExpenseInput[],
): ProjectActuals {
  let laborCost = 0;
  let laborCostBillable = 0;
  let totalHours = 0;
  let billableHours = 0;

  for (const e of entries) {
    const cost = r2(e.hours * e.hourlyRate);
    laborCost = r2(laborCost + cost);
    totalHours = r2(totalHours + e.hours);
    if (e.billable) {
      laborCostBillable = r2(laborCostBillable + cost);
      billableHours = r2(billableHours + e.hours);
    }
  }

  const expenseCost = r2(expenses.reduce((s, e) => s + e.amount, 0));

  return {
    laborCost,
    laborCostBillable,
    expenseCost,
    totalActual: r2(laborCost + expenseCost),
    totalHours,
    billableHours,
  };
}

export type BudgetStatus = "UNDER" | "ON_TRACK" | "OVER";

export interface BudgetVariance {
  budget: number;
  actual: number;
  variance: number;
  /** actual / budget, 0 when budget is 0 (avoids division by zero —
   *  a project with no budget set is never "on track" by percentage,
   *  it's just unbounded). */
  pctUsed: number;
  status: BudgetStatus;
}

/**
 * Compares actual spend to budget. Within ±5% of budget is ON_TRACK
 * (a project that lands close to plan shouldn't read as a red flag);
 * beyond that it's UNDER or OVER.
 */
export function budgetVariance(budget: number, actual: number): BudgetVariance {
  const variance = r2(budget - actual);
  const pctUsed = budget > 0 ? r2((actual / budget) * 100) : actual > 0 ? Infinity : 0;
  let status: BudgetStatus = "ON_TRACK";
  if (budget <= 0) {
    status = actual > 0 ? "OVER" : "ON_TRACK";
  } else if (actual > budget * 1.05) {
    status = "OVER";
  } else if (actual < budget * 0.95) {
    status = "UNDER";
  }
  return { budget, actual, variance, pctUsed, status };
}
