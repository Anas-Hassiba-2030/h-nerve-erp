"use server";

// Server actions for the import-audit admin page.
//
//   clearTestImports — deletes ImportLog batches whose source starts
//   with "legacy-" OR contains "test", and their ImportRow children.
//   This intentionally nukes the n8n "legacy-warehouse-db-…" payloads
//   too (the confirm dialog spells that out). Dedup is Phase 3.
//   sendTestBatch — creates a small in-DB sample batch (4 rows, 3 accepted
//   + 1 rejected) so an operator can see what an inbound flow looks like
//   without having to wire n8n first. Writes through Prisma directly,
//   mirroring the shape /api/import/test produces.

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { flashToast } from "@/lib/toast";

export async function clearTestImports(): Promise<void> {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = getLocale() === "ar";

  const where = {
    OR: [
      { source: { startsWith: "legacy-" } },
      { source: { contains: "test" } },
      { source: null }, // source-less batches (NULL)
      { source: "" }, // empty-string source
      { tenantId: "flood-tenant" }, // the rate-limit flood rows
    ],
  };

  const doomed = await prisma.importLog.findMany({
    where,
    select: { id: true },
  });
  const ids = doomed.map((d) => d.id);

  // Delete children then parents in one transaction — robust regardless
  // of how SQLite handles the relation's onDelete: Cascade.
  await prisma.$transaction([
    prisma.importRow.deleteMany({ where: { importLogId: { in: ids } } }),
    prisma.importLog.deleteMany({ where: { id: { in: ids } } }),
  ]);

  flashToast({
    type: "info",
    entity: "info",
    label: ar
      ? `تم حذف ${ids.length} دفعة استيراد تجريبية`
      : `Cleared ${ids.length} test import batch${ids.length === 1 ? "" : "es"}`,
  });
  revalidatePath("/admin/imports");
}

export async function sendTestBatch(): Promise<void> {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = getLocale() === "ar";

  // Mirror the real endpoint shape (one ImportLog + N ImportRows). The
  // source carries "test" so clearTestImports() can sweep it later.
  const batchTenant = user.tenantSlug ?? "demo";
  const rows = [
    { sku: "DEMO-001", productName: "Sample Product A", quantity: 12, unitCost: "4.50", supplier: "Demo Supplier", warehouse: "Main", status: "ACCEPTED" as const, error: null as string | null },
    { sku: "DEMO-002", productName: "Sample Product B", quantity: 25, unitCost: "1.20", supplier: "Demo Supplier", warehouse: "Main", status: "ACCEPTED" as const, error: null },
    { sku: "DEMO-003", productName: "Sample Product C", quantity: 8, unitCost: "7.80", supplier: "Demo Supplier", warehouse: "Main", status: "ACCEPTED" as const, error: null },
    { sku: "", productName: "Invalid row (missing SKU)", quantity: null as number | null, unitCost: null as string | null, supplier: null, warehouse: null, status: "REJECTED" as const, error: "sku is required" },
  ];

  await prisma.importLog.create({
    data: {
      endpoint: "test",
      source: `demo-test-batch-${Date.now()}`,
      tenantId: batchTenant,
      accepted: rows.filter((r) => r.status === "ACCEPTED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
      status: "PARTIAL",
      rows: {
        create: rows.map((r) => ({
          sku: r.sku || null,
          productName: r.productName,
          quantity: r.quantity ?? undefined,
          unitCost: r.unitCost ? new Prisma.Decimal(r.unitCost) : undefined,
          supplier: r.supplier,
          warehouse: r.warehouse,
          status: r.status,
          error: r.error,
          rowData: JSON.stringify({
            sku: r.sku, name: r.productName, quantity: r.quantity, unitCost: r.unitCost,
            supplier: r.supplier, warehouse: r.warehouse,
          }),
        })),
      },
    },
  });

  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم إنشاء دفعة تجريبية (٤ سجلات)" : "Demo batch created (4 rows)",
  });
  revalidatePath("/admin/imports");
}
