// Payroll core (hnerve-gap-map.md "HR" row, HRM half). Pure math up
// top (unit-tested); DB posting below follows the invoicing.ts /
// purchasing.ts / assets.ts conventions and posts one JournalEntry per
// run into the same ledger. Accounts: 6200 Salary Expense (EXPENSE),
// credited straight out of the chosen treasury — no payable step,
// salaries are paid same-run.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod } from "@/lib/finance/invoicing";
import { createPostedJournalEntry } from "@/lib/finance/accounting";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure math ────────────────────────────────────────────────────────────

/** Net pay = base + allowances − deductions, floored at 0. */
export function computeNetPay(baseSalary: number, allowances: number, deductions: number): number {
  return Math.max(0, r2(baseSalary + allowances - deductions));
}

// ── DB posting ───────────────────────────────────────────────────────────

/**
 * Runs payroll for every ACTIVE employee for (year, month): one Payslip
 * per employee, one JournalEntry for the whole run (Salary Expense
 * debit / Treasury credit). Idempotent — the (tenantId, periodYear,
 * periodMonth) unique on PayrollRun makes a re-run a no-op (checked by
 * the caller before invoking this, same pattern as fixed-asset
 * depreciation).
 */
export async function runPayroll(
  tx: Tx,
  args: { tenantId: string; year: number; month: number; treasuryId: string },
): Promise<{ employeeCount: number; total: number; payrollRunId: string } | null> {
  const { tenantId, year, month, treasuryId } = args;

  const employees = await tx.employee.findMany({
    where: { tenantId, status: "ACTIVE", deletedAt: null },
  });
  if (employees.length === 0) return null;

  const treasury = await tx.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
  if (treasury.tenantId !== tenantId) throw new Error("Cross-tenant treasury");

  const lines = employees.map((e) => {
    const baseSalary = Number(e.baseSalary);
    const netPay = computeNetPay(baseSalary, 0, 0);
    return { employeeId: e.id, baseSalary, netPay };
  });
  const total = r2(lines.reduce((s, l) => s + l.netPay, 0));
  if (total <= 0) return null;

  const [expenseAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "6200", "Salary Expense", "EXPENSE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const label = `Payroll ${year}-${String(month).padStart(2, "0")}`;
  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: label,
    reference: label,
    lines: {
      create: [
        { accountId: expenseAccount.id, debit: total, credit: 0, memo: label },
        { accountId: treasury.ledgerAccountId, debit: 0, credit: total, memo: label },
      ],
    },
  });

  const payrollRun = await tx.payrollRun.create({
    data: {
      tenantId,
      periodYear: year,
      periodMonth: month,
      treasuryId,
      totalAmount: total,
      journalEntryId: journalEntry.id,
      payslips: {
        create: lines.map((l) => ({
          tenantId,
          employeeId: l.employeeId,
          baseSalary: l.baseSalary,
          allowances: 0,
          deductions: 0,
          netPay: l.netPay,
        })),
      },
    },
  });

  return { employeeCount: lines.length, total, payrollRunId: payrollRun.id };
}
