// Payroll core (hnerve-gap-map.md "HR" row, HRM half). Pure math up
// top (unit-tested); DB posting below follows the invoicing.ts /
// purchasing.ts / assets.ts conventions and posts one JournalEntry per
// run into the same ledger. Accounts: 6200 Salary Expense (EXPENSE),
// credited straight out of the chosen treasury — no payable step,
// salaries are paid same-run.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod } from "@/lib/finance/invoicing";
import { createPostedJournalEntry } from "@/lib/finance/accounting";
import { overtimeHours, hourlyRateFromMonthlySalary, overtimePay } from "@/lib/hr/attendance";

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
 *
 * Idempotent at the LEDGER level too: a run interrupted between posting the
 * journal entry and creating the PayrollRun is resumed, not re-posted. See
 * the orphan lookup below for why that matters on D1.
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

  // Overtime (docs/HOURANI-ERP-GAPS.md #7) — every clocked day this
  // period with both a clock-in and clock-out feeds into the payslip's
  // allowances line via lib/hr/attendance.ts. An employee with no
  // Attendance rows (most tenants today — this is opt-in, not forced)
  // simply gets 0 overtime, same as before this feature existed.
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));
  const attendance = await tx.attendance.findMany({
    where: {
      tenantId,
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: periodStart, lt: periodEnd },
      clockIn: { not: null },
      clockOut: { not: null },
    },
    select: { employeeId: true, clockIn: true, clockOut: true },
  });
  const overtimeHoursByEmployee = new Map<string, number>();
  for (const a of attendance) {
    if (!a.clockIn || !a.clockOut) continue;
    const worked = r2((a.clockOut.getTime() - a.clockIn.getTime()) / 3_600_000);
    const ot = overtimeHours(Math.max(0, worked));
    overtimeHoursByEmployee.set(a.employeeId, r2((overtimeHoursByEmployee.get(a.employeeId) ?? 0) + ot));
  }

  const lines = employees.map((e) => {
    const baseSalary = Number(e.baseSalary);
    const otHours = overtimeHoursByEmployee.get(e.id) ?? 0;
    const allowances = otHours > 0 ? overtimePay(otHours, hourlyRateFromMonthlySalary(baseSalary)) : 0;
    const netPay = computeNetPay(baseSalary, allowances, 0);
    return { employeeId: e.id, baseSalary, allowances, netPay };
  });
  const total = r2(lines.reduce((s, l) => s + l.netPay, 0));
  if (total <= 0) return null;

  const [expenseAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "6200", "Salary Expense", "EXPENSE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const label = `Payroll ${year}-${String(month).padStart(2, "0")}`;

  // D1 runs `$transaction` callbacks WITHOUT atomicity, so this function can
  // be interrupted between posting the ledger entry and creating the
  // PayrollRun below. The caller's "already ran this month" guard keys off
  // PayrollRun — so after such an interruption the guard sees nothing, the
  // operator retries, and salary expense is posted to the ledger A SECOND
  // TIME. Real money, silently double-counted.
  //
  // Recover instead of re-posting: an existing POSTED entry carrying this
  // run's reference IS the interrupted run's ledger half. Adopt it and finish
  // the job. `reference` is exactly this label, and only payroll writes it.
  const orphan = await tx.journalEntry.findFirst({
    where: { tenantId, reference: label, status: "POSTED" },
  });

  const journalEntry =
    orphan ??
    (await createPostedJournalEntry(tx, {
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
    }));

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
          allowances: l.allowances,
          deductions: 0,
          netPay: l.netPay,
        })),
      },
    },
  });

  return { employeeCount: lines.length, total, payrollRunId: payrollRun.id };
}
