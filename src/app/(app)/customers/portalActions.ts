"use server";

// Staff-side client-portal provisioning (Phase 27 — hnerve-gap-map.md
// "Client portal" row). Grants/resets/revokes a customer's own portal
// login; the portal itself lives at app/(portal)/. See lib/portal/portal.ts.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { provisionPortalAccount, revokePortalAccount } from "@/lib/portal/portal";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const grantSchema = z.object({
  customerId: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function grantPortalAccess(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const parsed = grantSchema.safeParse({
    customerId: formData.get("customerId"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "بريد إلكتروني صالح وكلمة مرور 8 أحرف على الأقل مطلوبان"
        : "A valid email and an 8+ character password are required",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await provisionPortalAccount(t, {
        tenantId,
        customerId: data.customerId,
        email: data.email,
        password: data.password,
      });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر تفعيل بوابة العميل"
        : `Could not grant portal access${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم تفعيل بوابة العميل" : "Portal access granted" });
  revalidatePath(`/customers/${data.customerId}/edit`);
}

export async function revokePortalAccess(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId || !tenantId) return;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await revokePortalAccount(t, { tenantId, customerId });
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر إلغاء بوابة العميل" : "Could not revoke portal access" });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم إلغاء بوابة العميل" : "Portal access revoked" });
  revalidatePath(`/customers/${customerId}/edit`);
}
