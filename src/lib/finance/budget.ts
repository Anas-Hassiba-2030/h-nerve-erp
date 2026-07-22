// Budget vs actual — docs/HOURANI-ERP-GAPS.md #10 ⚪. Pure — no DB
// imports. Takes the SAME StatementLine rows /statements already builds
// (lib/finance/statements.ts's incomeStatement) plus a code→budget map,
// and returns the variance. Direction of "good" flips by account type
// (a revenue account exceeding its budget is good; an expense account
// exceeding its budget is bad) — deliberately NOT baked in here, since
// this file has no notion of account type. The caller (the page) decides
// the sign convention per section.

export interface BudgetActualLine {
  code: string;
  name: string;
  budget: number;
  actual: number;
  /** actual - budget, raw (unsigned convention — caller interprets). */
  variance: number;
  /** actual / budget * 100, 0 when budget is 0 and actual is 0, Infinity
   *  when budget is 0 and actual is nonzero. */
  pctUsed: number;
}

export interface StatementLineInput {
  code: string;
  name: string;
  amount: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Only returns rows for accounts that HAVE a budget set — an account
 * with no budget entered isn't "over by its full actual", it's simply
 * not being tracked yet. Keeps the table free of noise.
 */
export function budgetVsActual(
  lines: StatementLineInput[],
  budgets: Map<string, number>,
): BudgetActualLine[] {
  const out: BudgetActualLine[] = [];
  for (const l of lines) {
    const budget = budgets.get(l.code);
    if (budget === undefined) continue;
    const actual = l.amount;
    const variance = r2(actual - budget);
    const pctUsed = budget > 0 ? r2((actual / budget) * 100) : actual !== 0 ? Infinity : 0;
    out.push({ code: l.code, name: l.name, budget, actual, variance, pctUsed });
  }
  return out;
}
