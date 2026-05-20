"use server";

// Server action for /admin/accounts (Phase 8) — add a custom ledger
// account. Mirrors the suppliers/mappings action conventions. Accounts
// are never deleted from the UI (referenced by immutable JEs); only
// added or left inactive.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { flashToast } from "@/lib/toast";

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "COGS"];

export async function createLedgerAccount(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = getLocale() === "ar";
  const fail = (label: string) => {
    flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
    revalidatePath("/admin/accounts");
  };

  const tenantId = String(formData.get("tenantId") ?? "").trim().slice(0, 64);
  const code = String(formData.get("code") ?? "").trim().slice(0, 20);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "").trim().toUpperCase();
  const description =
    String(formData.get("description") ?? "").trim().slice(0, 200) || null;

  if (!tenantId || !code || !name) {
    return fail(ar ? "المستأجر والرمز والاسم مطلوبة" : "tenantId, code and name are required");
  }
  if (!TYPES.includes(type)) {
    return fail(ar ? `النوع يجب أن يكون أحد: ${TYPES.join(", ")}` : `type must be one of: ${TYPES.join(", ")}`);
  }
  try {
    await prisma.ledgerAccount.create({
      data: { tenantId, code, name, type, description },
    });
  } catch {
    return fail(
      ar
        ? `يوجد حساب بالرمز ${code} لهذا المستأجر`
        : `an account with code ${code} already exists for this tenant`,
    );
  }
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? `تم إنشاء الحساب ${code}` : `Account ${code} created`,
  });
  revalidatePath("/admin/accounts");
}
