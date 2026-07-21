// Manufacturing core (hnerve-gap-map.md "Manufacturing" row). Pure cost
// rollup up top (unit-tested); DB completion below follows the
// invoicing.ts / assets.ts / payroll.ts posting conventions. Stock truth
// lives in the InventoryMovement ledger (MFG_CONSUME / MFG_PRODUCE);
// the general ledger only sees labor/overhead (materials were already
// expensed at purchase — account 5000 — so re-posting them would double
// count). Accrual accounts: 5100 Manufacturing Expense (EXPENSE) debit /
// 2150 Accrued Manufacturing Costs (LIABILITY) credit.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod } from "@/lib/finance/invoicing";
import { createPostedJournalEntry } from "@/lib/finance/accounting";
import { recordMovement, recalcProductQuantity } from "@/lib/finance/inventory";
import { allocateByproductCost, routingLaborTotal, workOrdersComplete } from "./routing";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure math ────────────────────────────────────────────────────────────

export type CostComponent = { quantity: number; unitCost: number };

/**
 * Rolls up the cost of a manufacturing order: `runs` executions of a BOM
 * whose one run consumes `components` and yields `outputQty` units,
 * plus per-run labor/overhead. Throws when the order yields nothing —
 * a zero-output run has no unit to carry the cost.
 */
export function rollupCost(args: {
  components: CostComponent[];
  laborCost: number;
  overheadCost: number;
  runs: number;
  outputQty: number;
  /**
   * v2 — routing labor from the order's DONE work orders (already a
   * whole-order total, NOT per run). Additive to the flat per-run
   * laborCost so v1 BOMs without operations are unchanged.
   */
  routingLaborCost?: number;
}): {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  outputUnits: number;
} {
  const { components, runs, outputQty } = args;
  const outputUnits = runs * outputQty;
  if (outputUnits <= 0) throw new Error("rollupCost: order yields zero output units");

  const materialCost = r2(
    components.reduce((s, c) => s + c.quantity * runs * c.unitCost, 0),
  );
  const laborCost = r2(args.laborCost * runs + (args.routingLaborCost ?? 0));
  const overheadCost = r2(args.overheadCost * runs);
  const totalCost = r2(materialCost + laborCost + overheadCost);
  const unitCost = r2(totalCost / outputUnits);

  return { materialCost, laborCost, overheadCost, totalCost, unitCost, outputUnits };
}

// ── DB posting ───────────────────────────────────────────────────────────

/**
 * Completes an IN_PROGRESS manufacturing order: validates component
 * stock, writes MFG_CONSUME movements per component and one MFG_PRODUCE
 * movement for the output (carrying the rolled-up unit cost), recalcs
 * every touched product's quantity cache, posts the labor/overhead
 * accrual JournalEntry when those costs are non-zero, and freezes the
 * cost rollup on the order. Caller owns the transaction boundary.
 */
export async function completeManufacturingOrder(
  tx: Tx,
  args: { tenantId: string; orderId: string; userId?: string },
): Promise<{ orderNumber: string; outputUnits: number; totalCost: number }> {
  const { tenantId, orderId, userId } = args;

  const order = await tx.manufacturingOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      bom: {
        include: {
          lines: { include: { component: true } },
          byproducts: { include: { product: true } },
          product: true,
        },
      },
      workOrders: true,
    },
  });
  if (order.tenantId !== tenantId) throw new Error("Cross-tenant manufacturing order");
  if (order.status !== "IN_PROGRESS") {
    throw new Error(`Order ${order.orderNumber} is ${order.status}, not IN_PROGRESS`);
  }
  const { bom } = order;
  if (bom.lines.length === 0) throw new Error(`BOM ${bom.bomNumber} has no components`);

  // v2 routing gate: every generated stage must be DONE or CANCELLED
  // before the order can close (Odoo: work orders gate Close Production).
  if (!workOrdersComplete(order.workOrders.map((w) => w.status))) {
    throw new Error(
      `Order ${order.orderNumber} still has open work orders — finish or cancel every stage first`,
    );
  }

  // Stock sufficiency, checked before any write.
  for (const line of bom.lines) {
    const needed = line.quantity * order.runs;
    if (line.component.quantity < needed) {
      throw new Error(
        `Insufficient stock for ${line.component.name}: need ${needed}, have ${line.component.quantity}`,
      );
    }
  }

  const rollup = rollupCost({
    components: bom.lines.map((l) => ({
      quantity: l.quantity,
      unitCost: Number(l.component.unitCost ?? 0),
    })),
    laborCost: Number(bom.laborCost),
    overheadCost: Number(bom.overheadCost),
    runs: order.runs,
    outputQty: bom.outputQty,
    routingLaborCost: routingLaborTotal(
      order.workOrders.map((w) => ({ status: w.status, laborCost: w.laborCost == null ? null : Number(w.laborCost) })),
    ),
  });

  // v2 byproducts: split total cost by cost-share %; the main output's
  // MFG_PRODUCE carries the remainder as its unit cost.
  const allocation = allocateByproductCost({
    totalCost: rollup.totalCost,
    outputUnits: rollup.outputUnits,
    runs: order.runs,
    byproducts: bom.byproducts.map((b) => ({
      quantity: b.quantity,
      costSharePercent: Number(b.costSharePercent),
    })),
  });

  const label = `Manufacturing ${order.orderNumber} (${bom.name})`;

  for (const line of bom.lines) {
    await recordMovement(tx, {
      tenantId,
      productId: line.componentProductId,
      type: "MFG_CONSUME",
      delta: -(line.quantity * order.runs),
      reason: label,
      documentRef: order.orderNumber,
      userId: userId ?? null,
    });
    await recalcProductQuantity(tx, line.componentProductId);
  }

  await recordMovement(tx, {
    tenantId,
    productId: bom.productId,
    type: "MFG_PRODUCE",
    delta: rollup.outputUnits,
    reason: label,
    documentRef: order.orderNumber,
    unitCost: allocation.main.unitCost,
    userId: userId ?? null,
  });
  await recalcProductQuantity(tx, bom.productId);

  // Byproduct outputs (incl. expected scrap) enter stock alongside the
  // main product, each carrying its allocated share of the order cost.
  // Zip line-and-allocation in ONE expression: allocateByproductCost
  // preserves input order, and pairing here (instead of parallel index
  // reads) makes that alignment structurally impossible to drift.
  const byproductPairs = bom.byproducts.map((bp, i) => ({ bp, alloc: allocation.byproducts[i] }));
  for (const { bp, alloc } of byproductPairs) {
    if (alloc.units <= 0) continue;
    await recordMovement(tx, {
      tenantId,
      productId: bp.productId,
      type: "MFG_PRODUCE",
      delta: alloc.units,
      reason: `${label} — ${bp.isScrap ? "scrap" : "byproduct"}`,
      documentRef: order.orderNumber,
      unitCost: alloc.unitCost,
      userId: userId ?? null,
    });
    await recalcProductQuantity(tx, bp.productId);
  }

  const accrual = r2(rollup.laborCost + rollup.overheadCost);
  let journalEntryId: string | null = null;
  if (accrual > 0) {
    const [expenseAccount, accruedAccount, period] = await Promise.all([
      ensureLedgerAccount(tx, tenantId, "5100", "Manufacturing Expense", "EXPENSE"),
      ensureLedgerAccount(tx, tenantId, "2150", "Accrued Manufacturing Costs", "LIABILITY"),
      ensureOpenPeriod(tx, tenantId),
    ]);
    const entry = await createPostedJournalEntry(tx, {
      tenantId,
      periodId: period.id,
      description: label,
      reference: order.orderNumber,
      lines: {
        create: [
          { accountId: expenseAccount.id, debit: accrual, credit: 0, memo: label },
          { accountId: accruedAccount.id, debit: 0, credit: accrual, memo: label },
        ],
      },
    });
    journalEntryId = entry.id;
  }

  // updateMany, NOT update({ where: { id } }): ManufacturingOrder is
  // tenant-scoped and a by-id update trips the workspace write-guard probe
  // inside the transaction (see createPostedJournalEntry).
  await tx.manufacturingOrder.updateMany({
    where: { id: order.id },
    data: {
      status: "DONE",
      completedAt: new Date(),
      materialCost: rollup.materialCost,
      laborCost: rollup.laborCost,
      overheadCost: rollup.overheadCost,
      totalCost: rollup.totalCost,
      // Matches the main MFG_PRODUCE movement: byproduct cost shares are
      // already carved out (v1 BOMs: identical to rollup.unitCost).
      unitCost: allocation.main.unitCost,
      journalEntryId,
    },
  });

  return {
    orderNumber: order.orderNumber,
    outputUnits: rollup.outputUnits,
    totalCost: rollup.totalCost,
  };
}
