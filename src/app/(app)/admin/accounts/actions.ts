"use server";

// Server action for /admin/accounts (Phase 8) — add a custom ledger
// account. Mirrors the suppliers/mappings action conventions. Accounts
// are never deleted from the UI (referenced by immutable JEs); only
// added or left inactive.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "COGS"];

export async function createLedgerAccount(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = (await getLocale()) === "ar";
  const fail = async (label: string) => {
    await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
    revalidatePath("/admin/accounts");
  };

  // Phase 11 authz — never trust a submitted tenantId; resolve against the
  // session. Pinned user → forced to own tenantSlug; cross-tenant ADMIN may pass through.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return await fail(ar ? "المستأجر مطلوب" : "tenantId is required");
  const tenantId = scope.tenantId.slice(0, 64);
  const code = String(formData.get("code") ?? "").trim().slice(0, 20);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "").trim().toUpperCase();
  const description =
    String(formData.get("description") ?? "").trim().slice(0, 200) || null;

  if (!code || !name) {
    return await fail(ar ? "الرمز والاسم مطلوبة" : "code and name are required");
  }
  if (!TYPES.includes(type)) {
    return await fail(ar ? `النوع يجب أن يكون أحد: ${TYPES.join(", ")}` : `type must be one of: ${TYPES.join(", ")}`);
  }
  try {
    await prisma.ledgerAccount.create({
      data: { tenantId, code, name, type, description },
    });
  } catch {
    return await fail(
      ar
        ? `يوجد حساب بالرمز ${code} لهذا المستأجر`
        : `an account with code ${code} already exists for this tenant`,
    );
  }
  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? `تم إنشاء الحساب ${code}` : `Account ${code} created`,
  });
  revalidatePath("/admin/accounts");
}
