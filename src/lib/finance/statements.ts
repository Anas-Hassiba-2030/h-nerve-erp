// Financial statements — pure computation over per-account balances
// (hnerve-gap-map.md "Reports/Statements" row). Read-only: these functions
// never touch the DB. The page queries JournalLine aggregates (POSTED
// entries only) per LedgerAccount, converts Decimals to numbers, and feeds
// the rows here. Statement math follows the account-type sign conventions:
// ASSET/EXPENSE/COGS are debit-normal, LIABILITY/EQUITY/REVENUE are
// credit-normal.

export type AccountBalanceRow = {
  code: string;
  name: string;
  type: string; // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE | COGS
  debit: number; // sum of posted debits
  credit: number; // sum of posted credits
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Trial balance ────────────────────────────────────────────────────────

export type TrialBalanceLine = AccountBalanceRow & {
  // Net balance folded into its natural column: an account with more
  // debits than credits shows the difference under balanceDebit, else
  // under balanceCredit. Zero-balance accounts are kept (auditors expect
  // the full ledger) but callers may filter.
  balanceDebit: number;
  balanceCredit: number;
};

export function trialBalance(rows: AccountBalanceRow[]) {
  const lines: TrialBalanceLine[] = rows
    .map((row) => {
      const net = r2(row.debit - row.credit);
      return {
        ...row,
        balanceDebit: net > 0 ? net : 0,
        balanceCredit: net < 0 ? -net : 0,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = r2(lines.reduce((s, l) => s + l.balanceDebit, 0));
  const totalCredit = r2(lines.reduce((s, l) => s + l.balanceCredit, 0));
  return {
    lines,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.005,
  };
}

// ── Income statement (P&L) ───────────────────────────────────────────────

export type StatementLine = { code: string; name: string; amount: number };

export function incomeStatement(rows: AccountBalanceRow[]) {
  const revenue: StatementLine[] = [];
  const expenses: StatementLine[] = [];
  for (const row of rows) {
    if (row.type === "REVENUE") {
      const amount = r2(row.credit - row.debit);
      if (amount !== 0) revenue.push({ code: row.code, name: row.name, amount });
    } else if (row.type === "EXPENSE" || row.type === "COGS") {
      const amount = r2(row.debit - row.credit);
      if (amount !== 0) expenses.push({ code: row.code, name: row.name, amount });
    }
  }
  revenue.sort((a, b) => a.code.localeCompare(b.code));
  expenses.sort((a, b) => a.code.localeCompare(b.code));
  const totalRevenue = r2(revenue.reduce((s, l) => s + l.amount, 0));
  const totalExpenses = r2(expenses.reduce((s, l) => s + l.amount, 0));
  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netProfit: r2(totalRevenue - totalExpenses),
  };
}

// ── Balance sheet ────────────────────────────────────────────────────────

// currentEarnings is the plug: accumulated net profit that hasn't been
// formally closed into retained earnings (this system never runs a
// closing entry — revenue/expense balances live forever, so the P&L net
// over all time IS the earnings line). With it, the equation
// assets = liabilities + equity always holds when the ledger balances.
export function balanceSheet(rows: AccountBalanceRow[]) {
  const assets: StatementLine[] = [];
  const liabilities: StatementLine[] = [];
  const equity: StatementLine[] = [];
  for (const row of rows) {
    if (row.type === "ASSET") {
      const amount = r2(row.debit - row.credit);
      if (amount !== 0) assets.push({ code: row.code, name: row.name, amount });
    } else if (row.type === "LIABILITY") {
      const amount = r2(row.credit - row.debit);
      if (amount !== 0) liabilities.push({ code: row.code, name: row.name, amount });
    } else if (row.type === "EQUITY") {
      const amount = r2(row.credit - row.debit);
      if (amount !== 0) equity.push({ code: row.code, name: row.name, amount });
    }
  }
  assets.sort((a, b) => a.code.localeCompare(b.code));
  liabilities.sort((a, b) => a.code.localeCompare(b.code));
  equity.sort((a, b) => a.code.localeCompare(b.code));

  const currentEarnings = incomeStatement(rows).netProfit;
  const totalAssets = r2(assets.reduce((s, l) => s + l.amount, 0));
  const totalLiabilities = r2(liabilities.reduce((s, l) => s + l.amount, 0));
  const totalEquity = r2(equity.reduce((s, l) => s + l.amount, 0) + currentEarnings);
  return {
    assets,
    liabilities,
    equity,
    currentEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.005,
  };
}
