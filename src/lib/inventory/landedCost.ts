// Landed cost allocation — docs/HOURANI-ERP-GAPS.md #8 🟠. Spreads one
// lump sum (freight/customs/clearing) across a receipt's lines,
// proportionally by value or by quantity. Every allocated amount is
// rounded to 2dp and the rounding remainder is folded into the LARGEST
// line so the allocated total always equals the input exactly — a
// landed-cost run that doesn't foot to the invoice is worse than not
// having one.
//
// allocateLandedCost is pure (no DB imports). postLandedCost is the
// tx-taking poster (mirrors lib/finance/invoicing.ts's postPayment
// pattern) — treasury lookup, journal posting, and LandedCost/
// LandedCostLine writes in one Prisma.TransactionClient call, callable
// both from the server action and from a script.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod } from "@/lib/finance/invoicing";
import { createPostedJournalEntry, ACCT } from "@/lib/finance/accounting";

type Tx = typeof prismaType;

export type AllocationMethod = "BY_VALUE" | "BY_QUANTITY";

export interface AllocationInput {
  movementId: string;
  productId: string;
  quantity: number;
  /** quantity × unit cost at receipt — the basis for BY_VALUE allocation. */
  baseValue: number;
}

export interface AllocationResult {
  movementId: string;
  productId: string;
  allocatedAmount: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function allocateLandedCost(
  lines: AllocationInput[],
  totalAmount: number,
  method: AllocationMethod = "BY_VALUE",
): AllocationResult[] {
  if (lines.length === 0 || totalAmount <= 0) return [];

  // BY_VALUE with an all-zero value basis (e.g. unitCost never recorded)
  // can't proportion anything — fall back to BY_QUANTITY rather than
  // silently allocating 0 to everyone.
  const totalValue = lines.reduce((s, l) => s + l.baseValue, 0);
  const useQuantity = method === "BY_QUANTITY" || totalValue <= 0;
  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  if (useQuantity && totalQuantity <= 0) return [];

  const weights = lines.map((l) => (useQuantity ? l.quantity / totalQuantity : l.baseValue / totalValue));
  const rounded = weights.map((w) => r2(totalAmount * w));

  // Distribute the rounding remainder onto the single largest line so
  // SUM(allocated) === totalAmount exactly, not off by a cent.
  const remainder = r2(totalAmount - rounded.reduce((s, v) => s + v, 0));
  if (remainder !== 0) {
    let largestIdx = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[largestIdx]) largestIdx = i;
    }
    rounded[largestIdx] = r2(rounded[largestIdx] + remainder);
  }

  return lines.map((l, i) => ({ movementId: l.movementId, productId: l.productId, allocatedAmount: rounded[i] }));
}

export async function postLandedCost(
  tx: Tx,
  args: {
    tenantId: string;
    purchaseOrderId: string;
    poNumber: string;
    description: string;
    totalAmount: number;
    allocationMethod: AllocationMethod;
    treasuryId: string;
    allocations: AllocationResult[];
  },
): Promise<{ id: string }> {
  const { tenantId, purchaseOrderId, poNumber, description, totalAmount, allocationMethod, treasuryId, allocations } = args;

  const treasury = await tx.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
  if (treasury.tenantId !== tenantId) throw new Error("Cross-tenant treasury");

  const [inventoryAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, ACCT.INVENTORY, "Inventory", "ASSET"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const label = `Landed cost — ${description} (${poNumber})`;
  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: label,
    reference: poNumber,
    lines: {
      create: [
        { accountId: inventoryAccount.id, debit: totalAmount, credit: 0, memo: label },
        { accountId: treasury.ledgerAccountId, debit: 0, credit: totalAmount, memo: label },
      ],
    },
  });

  return tx.landedCost.create({
    data: {
      tenantId,
      purchaseOrderId,
      description,
      totalAmount,
      allocationMethod,
      journalEntryId: journalEntry.id,
      lines: {
        create: allocations.map((a) => ({
          movementId: a.movementId,
          productId: a.productId,
          allocatedAmount: a.allocatedAmount,
        })),
      },
    },
    select: { id: true },
  });
}
