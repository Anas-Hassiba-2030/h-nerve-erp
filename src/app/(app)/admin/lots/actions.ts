"use server";

// Server actions for /admin/lots — lot / batch traceability with expiry.
//
// Two write paths only, deliberately:
//   receiveLot   — bring a tracked lot INTO stock (one StockLot + one costed
//                  inbound InventoryMovement)
//   consumeFefo  — take quantity OUT of stock, allocated First-Expired-First-Out
//                  across the product's lots
//   setLotStatus — quarantine / release / write off a lot
//
// Every quantity change writes BOTH the lot row and an InventoryMovement, so
// the append-only stock ledger stays the single source of truth and
// Product.quantity (its denormalized cache) never drifts. D1 executes
// $transaction callbacks WITHOUT atomicity, so the order is chosen so that an
// interrupted write leaves stock UNDERSTATED, never overstated — an operator
// noticing missing stock investigates; silently phantom stock ships food that
// isn't there.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { allocateFefo, applyAllocation, defaultExpiry, type LotRow } from "@/lib/inventory/lots";

const PATH = "/admin/lots";

async function gate() {
  const user = await getCurrentUser();
  if (!hasRole(user, "MANAGER")) throw new Error("forbidden");
  return user;
}
async function ok(label: string) {
  await flashToast({ type: "info", entity: "info", label });
  revalidatePath(PATH);
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath(PATH);
}
async function tenant(fallback?: string) {
  return ((await getActiveTenantSlug()) ?? fallback ?? "hourani-hotels").slice(0, 64);
}

export async function receiveLot(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";

  const productId = String(formData.get("productId") ?? "").trim();
  const lotNumber = String(formData.get("lotNumber") ?? "").trim().slice(0, 80);
  const qty = Math.floor(Number(formData.get("quantity") ?? 0));
  if (!productId || !lotNumber) return fail(ar ? "المنتج ورقم الدفعة مطلوبان" : "product and lot number are required");
  if (!Number.isFinite(qty) || qty <= 0) return fail(ar ? "الكمية يجب أن تكون أكبر من صفر" : "quantity must be greater than zero");

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, tenantId: true, shelfLifeDays: true, warehouseId: true },
  });
  if (!product) return fail(ar ? "المنتج غير موجود" : "product not found");

  const producedAtRaw = String(formData.get("producedAt") ?? "").trim();
  const producedAt = producedAtRaw ? new Date(producedAtRaw) : new Date();
  if (Number.isNaN(producedAt.getTime())) return fail(ar ? "تاريخ الإنتاج غير صالح" : "invalid production date");

  const expiryRaw = String(formData.get("expiryDate") ?? "").trim();
  // An explicit date always wins; otherwise fall back to the product's shelf
  // life. If neither exists the lot is simply non-perishable — we never invent
  // an expiry, because a wrong date on food is worse than a blank one.
  const expiryDate = expiryRaw ? new Date(expiryRaw) : defaultExpiry(producedAt, product.shelfLifeDays);
  if (expiryDate && Number.isNaN(expiryDate.getTime())) {
    return fail(ar ? "تاريخ الانتهاء غير صالح" : "invalid expiry date");
  }
  if (expiryDate && expiryDate.getTime() < producedAt.getTime()) {
    return fail(ar ? "تاريخ الانتهاء قبل تاريخ الإنتاج" : "expiry falls before the production date");
  }

  const tenantId = await tenant(product.tenantId);
  const supplierLotRef = String(formData.get("supplierLotRef") ?? "").trim().slice(0, 120) || null;
  const quarantine = String(formData.get("quarantine") ?? "") === "on";

  try {
    const lot = await prisma.stockLot.create({
      data: {
        tenantId,
        productId: product.id,
        lotNumber,
        expiryDate,
        producedAt,
        quantity: qty,
        originalQuantity: qty,
        // Received-into-quarantine is the QC path: the stock physically exists
        // but must never be FEFO-allocatable until someone releases it.
        status: quarantine ? "QUARANTINE" : "ACTIVE",
        supplierLotRef,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        tenantId,
        productId: product.id,
        lotId: lot.id,
        type: "RECEIVED",
        delta: qty,
        reason: ar ? `استلام دفعة ${lotNumber}` : `Lot ${lotNumber} received`,
        warehouseId: product.warehouseId,
        userId: user?.id ?? null,
      },
    });

    // Quarantined stock is on the premises, so it counts toward on-hand; it is
    // simply not allocatable. Keeping it out of Product.quantity would make the
    // warehouse count disagree with the shelf.
    await prisma.product.update({
      where: { id: product.id },
      data: { quantity: { increment: qty }, trackingMode: "LOT" },
    });
  } catch {
    return fail(ar ? "تعذّر استلام الدفعة — تحقّق من عدم تكرار رقم الدفعة" : "could not receive the lot — check the lot number is not already used");
  }

  await ok(ar ? `تم استلام الدفعة ${lotNumber}` : `Lot ${lotNumber} received`);
}

export async function consumeFefo(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";

  const productId = String(formData.get("productId") ?? "").trim();
  const qty = Math.floor(Number(formData.get("quantity") ?? 0));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!productId) return fail(ar ? "المنتج مطلوب" : "product is required");
  if (!Number.isFinite(qty) || qty <= 0) return fail(ar ? "الكمية يجب أن تكون أكبر من صفر" : "quantity must be greater than zero");

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, tenantId: true, warehouseId: true },
  });
  if (!product) return fail(ar ? "المنتج غير موجود" : "product not found");

  const lots = await prisma.stockLot.findMany({
    where: { productId: product.id, deletedAt: null, status: "ACTIVE", quantity: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
    select: { id: true, lotNumber: true, expiryDate: true, quantity: true, status: true },
    take: 500,
  });

  const rows: LotRow[] = lots;
  const result = allocateFefo(rows, qty);

  // Refuse a partial pick outright rather than silently shipping less than was
  // asked for. A short ship the operator did not agree to is a customer
  // complaint; a rejected form is a conversation.
  if (result.shortfall > 0) {
    const have = qty - result.shortfall;
    return fail(
      ar
        ? `المتاح في الدفعات ${have} فقط من أصل ${qty} — لم يتم صرف أي شيء`
        : `only ${have} of ${qty} available across lots — nothing was issued`,
    );
  }

  const tenantId = await tenant(product.tenantId);
  const updates = applyAllocation(rows, result);

  try {
    // Decrement the LOTS first, then the product cache. If this is interrupted
    // the lots read low while Product.quantity still reads high — stock appears
    // present but unallocatable, which fails loudly on the next pick. The
    // reverse order would leave allocatable lots backed by no product stock.
    for (const u of updates) {
      await prisma.stockLot.update({
        where: { id: u.id },
        data: { quantity: u.quantity, status: u.status },
      });
    }

    await prisma.inventoryMovement.createMany({
      data: result.lines.map((line) => ({
        tenantId,
        productId: product.id,
        lotId: line.lotId,
        type: "SOLD",
        delta: -line.qty,
        reason: reason || (ar ? `صرف من الدفعة ${line.lotNumber}` : `Issued from lot ${line.lotNumber}`),
        warehouseId: product.warehouseId,
        userId: user?.id ?? null,
      })),
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { quantity: { decrement: qty } },
    });
  } catch {
    return fail(ar ? "تعذّر الصرف من الدفعات" : "could not issue from the lots");
  }

  const picked = result.lines.map((l) => `${l.lotNumber}×${l.qty}`).join(" · ");
  await ok(ar ? `تم الصرف بالأقدم انتهاءً: ${picked}` : `Issued first-expired-first-out: ${picked}`);
}

export async function setLotStatus(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id) return;
  if (!["ACTIVE", "QUARANTINE", "EXPIRED"].includes(status)) {
    return fail(ar ? "حالة غير صالحة" : "invalid status");
  }

  const lot = await prisma.stockLot.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, quantity: true, status: true },
  });
  if (!lot) return fail(ar ? "الدفعة غير موجودة" : "lot not found");
  // CONSUMED is reached by depletion, never by hand — allowing it here would
  // let an operator zero a lot without writing the movement that explains it.
  if (lot.status === "CONSUMED") {
    return fail(ar ? "الدفعة مستهلكة بالكامل" : "this lot is fully consumed");
  }

  try {
    await prisma.stockLot.update({ where: { id }, data: { status } });
  } catch {
    return fail(ar ? "تعذّر تحديث حالة الدفعة" : "could not update the lot status");
  }
  await ok(ar ? "تم تحديث حالة الدفعة" : "Lot status updated");
}

export async function writeOffLot(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const lot = await prisma.stockLot.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, lotNumber: true, quantity: true, tenantId: true,
      product: { select: { id: true, warehouseId: true } },
    },
  });
  if (!lot) return fail(ar ? "الدفعة غير موجودة" : "lot not found");
  if (lot.quantity <= 0) return fail(ar ? "لا توجد كمية للشطب" : "nothing left to write off");

  const lost = lot.quantity;
  try {
    await prisma.stockLot.update({
      where: { id },
      data: { quantity: 0, status: "EXPIRED" },
    });
    // DAMAGED, not SOLD: spoilage is a loss, and the P&L must be able to tell
    // the two apart.
    await prisma.inventoryMovement.create({
      data: {
        tenantId: lot.tenantId,
        productId: lot.product.id,
        lotId: lot.id,
        type: "DAMAGED",
        delta: -lost,
        reason: ar ? `شطب دفعة منتهية ${lot.lotNumber}` : `Expired lot ${lot.lotNumber} written off`,
        warehouseId: lot.product.warehouseId,
        userId: user?.id ?? null,
      },
    });
    await prisma.product.update({
      where: { id: lot.product.id },
      data: { quantity: { decrement: lost } },
    });
  } catch {
    return fail(ar ? "تعذّر شطب الدفعة" : "could not write off the lot");
  }

  await ok(ar ? `تم شطب ${lost} وحدة منتهية` : `Wrote off ${lost} expired units`);
}
