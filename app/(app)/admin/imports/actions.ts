"use server";

// Server action for the import-audit admin page.
//
//   clearTestImports — deletes ImportLog batches whose source starts
//   with "legacy-" OR contains "test", and their ImportRow children.
//   This intentionally nukes the n8n "legacy-warehouse-db-…" payloads
//   too (the confirm dialog spells that out). Dedup is Phase 3.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prismaUnscoped } from "@/lib/db";
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
    ],
  };

  const doomed = await prismaUnscoped.importLog.findMany({
    where,
    select: { id: true },
  });
  const ids = doomed.map((d) => d.id);

  // Delete children then parents in one transaction — robust regardless
  // of how SQLite handles the relation's onDelete: Cascade.
  await prismaUnscoped.$transaction([
    prismaUnscoped.importRow.deleteMany({ where: { importLogId: { in: ids } } }),
    prismaUnscoped.importLog.deleteMany({ where: { id: { in: ids } } }),
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
