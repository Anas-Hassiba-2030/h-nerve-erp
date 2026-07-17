import { describe, expect, it } from "vitest";
import { balanceSheet, incomeStatement, trialBalance, type AccountBalanceRow } from "./statements";

// A small posted ledger: one invoice (AR 250 / Revenue 250), one payment
// (Cash 100 / AR 100), one purchase invoice (COGS 150 / AP 150).
const LEDGER: AccountBalanceRow[] = [
  { code: "1100", name: "Accounts Receivable", type: "ASSET", debit: 250, credit: 100 },
  { code: "1200", name: "Cash", type: "ASSET", debit: 100, credit: 0 },
  { code: "2100", name: "Accounts Payable", type: "LIABILITY", debit: 0, credit: 150 },
  { code: "4000", name: "Sales Revenue", type: "REVENUE", debit: 0, credit: 250 },
  { code: "5000", name: "Purchases / COGS", type: "COGS", debit: 150, credit: 0 },
];

describe("trialBalance", () => {
  it("folds each account's net into its natural column and balances", () => {
    const tb = trialBalance(LEDGER);
    expect(tb.totalDebit).toBe(400); // AR 150 + Cash 100 + COGS 150
    expect(tb.totalCredit).toBe(400); // AP 150 + Revenue 250
    expect(tb.balanced).toBe(true);
    const ar = tb.lines.find((l) => l.code === "1100")!;
    expect(ar.balanceDebit).toBe(150);
    expect(ar.balanceCredit).toBe(0);
  });

  it("sorts lines by account code", () => {
    const tb = trialBalance([...LEDGER].reverse());
    expect(tb.lines.map((l) => l.code)).toEqual(["1100", "1200", "2100", "4000", "5000"]);
  });

  it("flags an unbalanced ledger", () => {
    const tb = trialBalance([
      { code: "1100", name: "AR", type: "ASSET", debit: 100, credit: 0 },
    ]);
    expect(tb.balanced).toBe(false);
  });
});

describe("incomeStatement", () => {
  it("computes revenue, expenses, and net profit", () => {
    const pl = incomeStatement(LEDGER);
    expect(pl.totalRevenue).toBe(250);
    expect(pl.totalExpenses).toBe(150);
    expect(pl.netProfit).toBe(100);
    expect(pl.revenue).toHaveLength(1);
    expect(pl.expenses).toHaveLength(1);
  });

  it("treats EXPENSE and COGS both as expense lines", () => {
    const pl = incomeStatement([
      { code: "5000", name: "COGS", type: "COGS", debit: 60, credit: 0 },
      { code: "6000", name: "Rent", type: "EXPENSE", debit: 40, credit: 0 },
      { code: "4000", name: "Sales", type: "REVENUE", debit: 0, credit: 250 },
    ]);
    expect(pl.totalExpenses).toBe(100);
    expect(pl.netProfit).toBe(150);
  });

  it("drops zero-balance lines and handles contra amounts", () => {
    const pl = incomeStatement([
      { code: "4000", name: "Sales", type: "REVENUE", debit: 50, credit: 50 },
    ]);
    expect(pl.revenue).toHaveLength(0);
    expect(pl.netProfit).toBe(0);
  });
});

describe("balanceSheet", () => {
  it("balances via the current-earnings plug", () => {
    const bs = balanceSheet(LEDGER);
    expect(bs.totalAssets).toBe(250); // AR 150 + Cash 100
    expect(bs.totalLiabilities).toBe(150);
    expect(bs.currentEarnings).toBe(100); // net profit plugs equity
    expect(bs.totalEquity).toBe(100);
    expect(bs.balanced).toBe(true);
  });

  it("includes explicit equity accounts alongside the plug", () => {
    const bs = balanceSheet([
      { code: "1200", name: "Cash", type: "ASSET", debit: 500, credit: 0 },
      { code: "3000", name: "Capital", type: "EQUITY", debit: 0, credit: 400 },
      { code: "4000", name: "Sales", type: "REVENUE", debit: 0, credit: 100 },
    ]);
    expect(bs.totalAssets).toBe(500);
    expect(bs.equity).toHaveLength(1);
    expect(bs.currentEarnings).toBe(100);
    expect(bs.totalEquity).toBe(500);
    expect(bs.balanced).toBe(true);
  });

  it("flags a broken equation", () => {
    const bs = balanceSheet([
      { code: "1200", name: "Cash", type: "ASSET", debit: 500, credit: 0 },
    ]);
    expect(bs.balanced).toBe(false);
  });
});
