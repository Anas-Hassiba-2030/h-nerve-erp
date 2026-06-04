"use server";

// Server actions for /admin/mappings (Phase 4).
//
// CRUD over TenantImportMapping. JSON columns are validated here (parse
// + must be a flat object) before write, with a toast on bad input —
// we never persist malformed JSON, and never 500 the page for it.
//
// Phase 11 authz — tenant scope is enforced via resolveAdminTenantId(): a
// pinned user is forced to their own tenantSlug, foreign ids get overridden,
// only a cross-tenant ADMIN may target an arbitrary tenantId.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function ok(ar: boolean, label: string) {
  flashToast({ type: "info", entity: "info", label });
  revalidatePath("/admin/mappings");
}

function fail(ar: boolean, label: string) {
  flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/admin/mappings");
}

// Parse a JSON string to a flat object. Returns the canonical
// re-stringified form, or null if invalid / not a plain object.
function normalizeJsonObject(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export async function createMapping(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = getLocale() === "ar";
  // Phase 11 authz — pinned user can only create a mapping in their own tenant.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return fail(ar, ar ? "المستأجر مطلوب" : "tenantId is required");
  const tenantId = scope.tenantId.slice(0, 64);
  const sourceSystem = String(formData.get("sourceSystem") ?? "")
    .trim()
    .slice(0, 64);
  const description =
    String(formData.get("description") ?? "").trim().slice(0, 200) || null;
  const fieldMapRaw = String(formData.get("fieldMapJson") ?? "{}");
  const defaultsRaw = String(formData.get("defaultsJson") ?? "").trim();

  if (!sourceSystem) {
    return fail(ar, ar ? "نظام المصدر مطلوب" : "sourceSystem is required");
  }
  const fieldMapJson = normalizeJsonObject(fieldMapRaw);
  if (!fieldMapJson) {
    return fail(ar, ar ? "خريطة الحقول JSON غير صالحة" : "fieldMap is not valid JSON object");
  }
  let defaultsJson: string | null = null;
  if (defaultsRaw) {
    defaultsJson = normalizeJsonObject(defaultsRaw);
    if (!defaultsJson) {
      return fail(ar, ar ? "الافتراضيات JSON غير صالحة" : "defaults is not valid JSON object");
    }
  }

  try {
    await prisma.tenantImportMapping.create({
      data: { tenantId, sourceSystem, description, fieldMapJson, defaultsJson },
    });
  } catch {
    return fail(
      ar,
      ar
        ? `يوجد بالفعل خريطة لـ (${tenantId}, ${sourceSystem})`
        : `a mapping for (${tenantId}, ${sourceSystem}) already exists`,
    );
  }
  ok(ar, ar ? "تم إنشاء الخريطة" : "Mapping created");
}

export async function updateMapping(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const description =
    String(formData.get("description") ?? "").trim().slice(0, 200) || null;
  const fieldMapJson = normalizeJsonObject(
    String(formData.get("fieldMapJson") ?? "{}"),
  );
  if (!fieldMapJson) {
    return fail(ar, ar ? "خريطة الحقول JSON غير صالحة" : "fieldMap is not valid JSON object");
  }
  const defaultsRaw = String(formData.get("defaultsJson") ?? "").trim();
  let defaultsJson: string | null = null;
  if (defaultsRaw) {
    defaultsJson = normalizeJsonObject(defaultsRaw);
    if (!defaultsJson) {
      return fail(ar, ar ? "الافتراضيات JSON غير صالحة" : "defaults is not valid JSON object");
    }
  }
  await prisma.tenantImportMapping.update({
    where: { id },
    data: { description, fieldMapJson, defaultsJson },
  });
  ok(ar, ar ? "تم تحديث الخريطة" : "Mapping updated");
}

export async function toggleMappingActive(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const current = await prisma.tenantImportMapping.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!current) return;
  await prisma.tenantImportMapping.update({
    where: { id },
    data: { active: !current.active },
  });
  ok(
    ar,
    !current.active
      ? ar ? "تم تفعيل الخريطة" : "Mapping activated"
      : ar ? "تم تعطيل الخريطة" : "Mapping deactivated",
  );
}

export async function deleteMapping(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.tenantImportMapping.delete({ where: { id } });
  ok(ar, ar ? "تم حذف الخريطة" : "Mapping deleted");
}
