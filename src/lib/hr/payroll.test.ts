import { describe, it, expect, vi } from "vitest";
import { computeNetPay, runPayroll } from "./payroll";

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

// D1 executes `$transaction` callbacks WITHOUT atomicity, so runPayroll can be
// interrupted between posting the ledger entry and creating the PayrollRun.
// The caller's "already ran this month" guard keys off PayrollRun, so after
// such an interruption a retry would post salary expense to the ledger a
// SECOND time. This is the regression guard for that.
describe("runPayroll — ledger idempotency after an interrupted run", () => {
  const ARGS = { tenantId: "t1", year: 2026, month: 7, treasuryId: "tr1" };

  /**
   * Minimal stub of the Prisma surface runPayroll touches. `existingEntry`
   * simulates the orphaned POSTED journal entry an interrupted run leaves.
   */
  function makeTx(existingEntry: { id: string } | null) {
    const payrollRunCreate = vi.fn(async (_args: { data: { journalEntryId: string } }) => ({
      id: "run1",
    }));
    const journalEntryCreate = vi.fn(async () => ({ id: "je-new" }));
    return {
      tx: {
        employee: {
          findMany: async () => [
            { id: "e1", tenantId: "t1", baseSalary: 1000, allowances: 0, status: "ACTIVE" },
          ],
        },
        treasury: {
          findUniqueOrThrow: async () => ({ id: "tr1", tenantId: "t1", ledgerAccountId: "acc-treasury" }),
        },
        ledgerAccount: {
          findFirst: async () => ({ id: "acc-expense" }),
          upsert: async () => ({ id: "acc-expense" }),
          create: async () => ({ id: "acc-expense" }),
        },
        financialPeriod: {
          findFirst: async () => ({ id: "p1", status: "OPEN" }),
          upsert: async () => ({ id: "p1" }),
          create: async () => ({ id: "p1" }),
        },
        attendance: { findMany: async () => [] },
        shift: { findMany: async () => [] },
        journalEntry: {
          findFirst: async () => existingEntry,
          create: journalEntryCreate,
          update: async () => ({ id: "je-new" }),
          // createPostedJournalEntry writes DRAFT then flips with one atomic
          // UPDATE — the D1-safe posting pattern.
          updateMany: async () => ({ count: 1 }),
        },
        payrollRun: { create: payrollRunCreate },
      },
      journalEntryCreate,
      payrollRunCreate,
    };
  }

  it("reuses the orphaned POSTED entry instead of double-posting salary expense", async () => {
    const { tx, journalEntryCreate, payrollRunCreate } = makeTx({ id: "je-orphan" });

    const result = await runPayroll(tx as never, ARGS);

    expect(journalEntryCreate, "a second salary-expense entry was posted").not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    // The completed run must link the entry the interrupted attempt posted.
    expect(payrollRunCreate.mock.calls[0]?.[0].data.journalEntryId).toBe("je-orphan");
  });

  it("posts a new entry on a clean first run", async () => {
    const { tx, journalEntryCreate } = makeTx(null);
    await runPayroll(tx as never, ARGS);
    expect(journalEntryCreate).toHaveBeenCalled();
  });
});
