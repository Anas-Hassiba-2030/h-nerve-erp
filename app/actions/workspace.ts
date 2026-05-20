"use server";

// Phase C — enter / exit a company workspace. Setting the cookie makes
// the scoped Prisma client (lib/db.ts) filter allow-listed models to this
// company until the user exits.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
// CROSS-TENANT INTENT: the workspace switcher must see every Company
// for validation, regardless of the active workspace. Company is not in
// any scoped set today, but using prismaUnscoped makes the intent
// explicit for future readers.
import { prismaUnscoped } from "@/lib/db";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { TENANT_COOKIE, COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy";

export async function enterWorkspace(formData: FormData) {
  await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  // Validate against the UNSCOPED client — the switcher must see every
  // company regardless of any active workspace.
  const company = await prismaUnscoped.company.findUnique({
    where: { id: companyId },
    select: { id: true, code: true },
  });
  if (!company) redirect("/companies");
  cookies().set(WORKSPACE_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  // Phase F3 — also bind the tenant slug. Without this, switching the
  // workspace would scope companyId-keyed models but leave opaque-
  // tenantId models cross-tenant.
  const slug = COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? null;
  if (slug) {
    cookies().set(TENANT_COOKIE, slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookies().delete(TENANT_COOKIE);
  }
  redirect("/workspace"); // Phase G1: land on the Company Command Center
}

export async function exitWorkspace() {
  await requireUser();
  cookies().delete(WORKSPACE_COOKIE);
  cookies().delete(TENANT_COOKIE);
  redirect("/companies");
}
