"use server";

// Manual journal entry (docs/HOURANI-ERP-GAPS.md #2 — the entry point
// that lets an accountant tag a cost centre onto a journal line; every
// OTHER posting path in the app is automated and doesn't set one yet).
// Posts through the SAME postJournalEntry used by every automated
// caller — balance validation, period-closed check, and D1-safe
// draft-then-flip posting all apply identically here.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { postJournalEntry, type JournalLineInput } from "@/lib/finance/accounting";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

// The form renders a fixed set of MAX_ROWS line inputs (accountCode /
// debit / credit / costCenterId) — a dynamic add-row client component
// hits the Claude_Browser preview limitation noted in memory
// (env_local_preview_limits.md: dynamic useState rows don't hydrate in
// preview), and a fixed generous count is simpler anyway for a manual
// correcting entry, which rarely needs more than a handful of lines.
const MAX_ROWS = 8;

export async function postManualJournalEntry(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();

  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const dateRaw = String(formData.get("date") ?? "").trim();
  if (!description) {
    await flashToast({ type: "info", entity: "info", label: ar ? "الوصف مطلوب" : "Description is required" });
    return;
  }

  const lines: JournalLineInput[] = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    const accountCode = String(formData.get(`accountCode_${i}`) ?? "").trim();
    const debit = Number(formData.get(`debit_${i}`) ?? 0) || 0;
    const credit = Number(formData.get(`credit_${i}`) ?? 0) || 0;
    const costCenterId = String(formData.get(`costCenterId_${i}`) ?? "").trim();
    if (!accountCode || (debit === 0 && credit === 0)) continue;
    lines.push({ accountCode, debit, credit, costCenterId: costCenterId || null });
  }

  if (lines.length < 2) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "أدخل سطرين على الأقل (مدين ودائن)" : "Enter at least two lines (a debit and a credit)",
    });
    return;
  }

  try {
    const result = await postJournalEntry(prisma, {
      tenantId,
      description,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      lines,
    });
    if (!result) {
      await flashToast({ type: "info", entity: "info", label: ar ? "لا شيء لترحيله (الصفر=الصفر)" : "Nothing to post (zero equals zero)" });
      return;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? `تعذّر الترحيل: ${message}` : `Could not post: ${message}`,
    });
    return;
  }

  revalidatePath("/admin/journal");
  redirect("/admin/journal");
}
