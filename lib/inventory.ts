// lib/inventory.ts
//
// Phase 5 — the inventory ledger primitives. Pure, transaction-aware,
// no HTTP. The import endpoint and the manual "Adjust stock" server
// action both go through these so the invariant
//
//     Product.quantity === SUM(InventoryMovement.delta)
//                           WHERE productId = X AND deletedAt IS NULL
//
// holds everywhere. recordMovement appends; recalcProductQuantity
// recomputes the denormalized cache. Callers orchestrate both inside
// ONE transaction (record → record → … → recalc per affected product).
//
// Movements are append-only (decision #1): there is no update/delete
// helper here on purpose. Mistakes are corrected by a compensating
// reverse movement, never by editing history.

import type { InventoryMovement, Prisma } from "@prisma/client";
import { prismaUnscoped } from "@/lib/db";

// Closed enum (decision #3), string-typed per the CLAUDE.md SQLite rule.
// Single source of truth — the /admin/movements filter pills and the
// adjustStock action import this so the set can never drift.
export const MOVEMENT_TYPES = [
  "IMPORT",
  "RECEIVED",
  "SOLD",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ADJUSTMENT",
  "DAMAGED",
  "RETURN_FROM_CUSTOMER",
  "RETURN_TO_SUPPLIER",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Any Prisma client that can run the writes — the real client or a
 *  $transaction callback's `tx`. Helpers never open their own
 *  transaction; the caller owns the boundary. */
type DbClient = Prisma.TransactionClient;

export type RecordMovementInput = {
  tenantId: string;
  productId: string;
  type: MovementType;
  /** Signed: positive = stock in, negative = stock out. Must be an
   *  integer (Product.quantity is Int). */
  delta: number;
  reason: string;
  /** Defaults to now() at the DB if omitted. */
  occurredAt?: Date;
  // Provenance — all optional.
  sourceImportLogId?: string | null;
  note?: string | null;
  userId?: string | null;
  documentRef?: string | null;
  /** Costed inflows only (IMPORT/RECEIVED) — feeds weighted-avg COGS
   *  (Phase 8). Null/omitted = excluded from the costing pool. */
  unitCost?: Prisma.Decimal.Value | null;
};

/**
 * Append one movement row. Returns the created row, or `null` when
 * `delta === 0` — a zero-delta change is a no-op for the ledger
 * (decision #5: "if quantity didn't change → no movement"), so callers
 * never have to guard. Throws on an unknown type or non-integer delta:
 * this is accountancy-grade data, a bad write must roll the tx back
 * rather than silently corrupt the trail.
 *
 * Does NOT recompute Product.quantity — call recalcProductQuantity once
 * per affected product after the batch of movements is recorded.
 */
export async function recordMovement(
  db: DbClient,
  input: RecordMovementInput,
): Promise<InventoryMovement | null> {
  if (!MOVEMENT_TYPES.includes(input.type)) {
    throw new Error(`recordMovement: unknown movement type "${input.type}"`);
  }
  if (!Number.isInteger(input.delta)) {
    throw new Error(`recordMovement: delta must be an integer, got ${input.delta}`);
  }
  if (input.delta === 0) return null; // no-op, nothing to record

  return db.inventoryMovement.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      type: input.type,
      delta: input.delta,
      reason: input.reason,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      sourceImportLogId: input.sourceImportLogId ?? null,
      note: input.note ?? null,
      userId: input.userId ?? null,
      documentRef: input.documentRef ?? null,
      unitCost: input.unitCost ?? null,
    },
  });
}

/**
 * Recompute Product.quantity from the ledger and write it back.
 * Source of truth = SUM(delta) over non-soft-deleted movements.
 * Returns the new quantity. Touches ONLY Product.quantity —
 * lastImportedAt / importCount / etc. stay wherever their writers set
 * them (the import endpoint sets those explicitly).
 */
export async function recalcProductQuantity(
  db: DbClient,
  productId: string,
): Promise<number> {
  const agg = await db.inventoryMovement.aggregate({
    _sum: { delta: true },
    where: { productId, deletedAt: null },
  });
  const quantity = agg._sum.delta ?? 0;
  await db.product.update({ where: { id: productId }, data: { quantity } });
  return quantity;
}

/**
 * Paginated movement history for one product, newest first. Read-only
 * (uses the raw client directly — no tx, no scoping; these rows have no
 * companyId, consistent with the rest of the import/inventory surface).
 * Excludes soft-deleted rows so the list stays consistent with the
 * computed Net. `before` is an occurredAt cursor for "load older".
 */
export async function getMovementsForProduct(
  productId: string,
  opts: { limit?: number; before?: Date } = {},
): Promise<InventoryMovement[]> {
  const { limit = 50, before } = opts;
  return prismaUnscoped.inventoryMovement.findMany({
    where: {
      productId,
      deletedAt: null,
      ...(before ? { occurredAt: { lt: before } } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
