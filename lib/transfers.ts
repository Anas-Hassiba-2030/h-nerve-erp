// lib/transfers.ts
//
// Phase 9 — warehouse-to-warehouse stock transfers. A transfer is a
// PAIRED, atomic operation: one TRANSFER_OUT at the source warehouse
// and one TRANSFER_IN at the destination, sharing a transferRef. Both
// go through the Phase 5 ledger primitives (recordMovement +
// recalcProductQuantity) so the invariant
//
//     Product.quantity === SUM(InventoryMovement.delta)
//                           WHERE productId = X AND deletedAt IS NULL
//
// still holds for every (sku, warehouse) Product row.
//
// Transfers post NO journal entries (Phase 8 / decision #5): total
// inventory value is unchanged — stock only moves between warehouses.
// Read-mostly boundary preserved — the caller owns the transaction;
// this module never opens its own and only mutates via the existing
// inventory primitives.

import { prismaUnscoped } from "@/lib/db";
import { generateNumber } from "@/lib/utils";
import { recordMovement, recalcProductQuantity } from "@/lib/inventory";

// Same transaction-client alias as lib/orders.ts — the caller owns the
// boundary; this helper never opens one.
type Db = Parameters<Parameters<typeof prismaUnscoped.$transaction>[0]>[0];

export type CreateTransferInput = {
  tenantId: string;
  fromProductId: string;
  toWarehouseId: string;
  qty: number;
  reason: string;
  documentRef?: string | null;
};

export type CreateTransferResult = {
  transferRef: string;
  fromProductId: string;
  toProductId: string;
  sku: string;
  qty: number;
  /** Source row quantity AFTER the transfer. */
  fromQty: number;
  /** Destination row quantity AFTER the transfer. */
  toQty: number;
};

/**
 * Move `qty` of one product from its current warehouse to another,
 * inside the caller's transaction. Creates the destination Product row
 * (same tenant+sku, different warehouseId) on the first transfer there.
 * Throws — rolling the tx back — on any invalid input; there is never a
 * half-transfer.
 */
export async function createTransfer(
  db: Db,
  input: CreateTransferInput,
): Promise<CreateTransferResult> {
  const { tenantId, fromProductId, toWarehouseId, qty, reason } = input;

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error(
      `createTransfer: qty must be a positive integer, got ${qty}`,
    );
  }

  const src = await db.product.findUnique({
    where: { id: fromProductId },
    select: {
      id: true,
      tenantId: true,
      sku: true,
      name: true,
      unitCost: true,
      supplierId: true,
      warehouseId: true,
      quantity: true,
    },
  });
  if (!src) {
    throw new Error(`createTransfer: source product ${fromProductId} not found`);
  }
  if (src.tenantId !== tenantId) {
    throw new Error(
      `createTransfer: product ${fromProductId} is not in tenant ${tenantId}`,
    );
  }
  if (src.warehouseId === toWarehouseId) {
    throw new Error(
      "createTransfer: source and destination warehouse are the same",
    );
  }

  const destWh = await db.warehouse.findUnique({
    where: { id: toWarehouseId },
    select: { id: true, tenantId: true, deletedAt: true },
  });
  if (!destWh) {
    throw new Error(
      `createTransfer: destination warehouse ${toWarehouseId} not found`,
    );
  }
  if (destWh.tenantId !== tenantId) {
    throw new Error(
      `createTransfer: warehouse ${toWarehouseId} is not in tenant ${tenantId}`,
    );
  }
  if (destWh.deletedAt) {
    throw new Error(
      `createTransfer: destination warehouse ${toWarehouseId} is deleted`,
    );
  }

  if (src.quantity < qty) {
    throw new Error(
      `createTransfer: insufficient stock — have ${src.quantity}, asked ${qty}`,
    );
  }

  // Destination Product row (same tenant+sku, different warehouse).
  // Idempotent: an existing row is reused (update: {}), never clobbered.
  const dest = await db.product.upsert({
    where: {
      tenantId_sku_warehouseId: {
        tenantId,
        sku: src.sku,
        warehouseId: toWarehouseId,
      },
    },
    create: {
      tenantId,
      sku: src.sku,
      name: src.name,
      unitCost: src.unitCost,
      supplierId: src.supplierId,
      warehouseId: toWarehouseId,
      quantity: 0,
      importCount: 0, // created by a transfer, not an import
    },
    update: {},
    select: { id: true },
  });

  const transferRef = generateNumber("TRF");
  const documentRef = input.documentRef ?? transferRef;

  // Paired movements — both in this tx, each tagged with its OWN
  // warehouse (recordMovement's explicit path), linked by transferRef.
  // qty > 0 is guaranteed above so neither call no-ops.
  await recordMovement(db, {
    tenantId,
    productId: src.id,
    type: "TRANSFER_OUT",
    delta: -qty,
    reason,
    warehouseId: src.warehouseId,
    transferRef,
    documentRef,
  });
  await recordMovement(db, {
    tenantId,
    productId: dest.id,
    type: "TRANSFER_IN",
    delta: qty,
    reason,
    warehouseId: toWarehouseId,
    transferRef,
    documentRef,
  });

  const fromQty = await recalcProductQuantity(db, src.id);
  const toQty = await recalcProductQuantity(db, dest.id);

  return {
    transferRef,
    fromProductId: src.id,
    toProductId: dest.id,
    sku: src.sku,
    qty,
    fromQty,
    toQty,
  };
}

/**
 * Paired transfer history touching one product (either leg), newest
 * first. Read-only — raw client, no tx (mirrors
 * getMovementsForProduct in lib/inventory.ts). Each entry resolves its
 * sibling leg (same transferRef) so the UI can show from → to in one
 * row. `before` is an occurredAt cursor for "load older".
 */
export async function getTransfersForProduct(
  productId: string,
  opts: { limit?: number; before?: Date } = {},
) {
  const { limit = 50, before } = opts;
  const legs = await prismaUnscoped.inventoryMovement.findMany({
    where: {
      productId,
      deletedAt: null,
      type: { in: ["TRANSFER_OUT", "TRANSFER_IN"] },
      transferRef: { not: null },
      ...(before ? { occurredAt: { lt: before } } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const refs = [...new Set(legs.map((l) => l.transferRef as string))];
  const siblings = refs.length
    ? await prismaUnscoped.inventoryMovement.findMany({
        where: { transferRef: { in: refs }, deletedAt: null },
      })
    : [];
  const byRef = new Map<string, typeof siblings>();
  for (const s of siblings) {
    const ref = s.transferRef as string;
    const arr = byRef.get(ref) ?? [];
    arr.push(s);
    byRef.set(ref, arr);
  }

  return legs.map((leg) => {
    const pair = byRef.get(leg.transferRef as string) ?? [];
    return {
      ref: leg.transferRef as string,
      leg,
      out: pair.find((m) => m.type === "TRANSFER_OUT") ?? null,
      in: pair.find((m) => m.type === "TRANSFER_IN") ?? null,
    };
  });
}
