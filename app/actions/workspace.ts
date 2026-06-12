"use server";

// Phase C — enter / exit a company workspace. Setting the cookie makes
// the scoped Prisma client (lib/db.ts) filter allow-listed models to this
// company until the user exits.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
// CROSS-TENANT INTENT: the workspace switcher must see every Company
// for validation, regardless of the active workspace. Company is not in
// any scoped set today, but using prismaUnscoped makes the intent
// explicit for future readers.
import { prismaUnscoped } from "@/lib/db/db";
import { WORKSPACE_COOKIE } from "@/lib/tenancy/workspace";
import { TENANT_COOKIE, COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy/tenancy";

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
  (await cookies()).set(WORKSPACE_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  // Phase F3 — also bind the tenant slug. Without this, switching the
  // workspace would scope companyId-keyed models but leave opaque-
  // tenantId models cross-tenant.
  const slug = COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? null;
  if (slug) {
    (await cookies()).set(TENANT_COOKIE, slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    (await cookies()).delete(TENANT_COOKIE);
  }
  redirect("/workspace"); // Phase G1: land on the Company Command Center
}

export async function exitWorkspace() {
  await requireUser();
  (await cookies()).delete(WORKSPACE_COOKIE);
  (await cookies()).delete(TENANT_COOKIE);
  redirect("/companies");
}

// Phase F-UX — Option A. The Operations sidebar links route through
// this action instead of plain <Link>. It atomically rebinds the
// workspace + tenant cookies to whichever tenant owns the destination
// path BEFORE redirecting there, so the WorkspaceBanner is never out
// of sync with the page the user is looking at.
//
// Path → Company.code map. One entry per sector today. If a future
// tenant adds a new sector path, register it here.
const OPS_PATH_TO_COMPANY_CODE: Record<string, "HOTELS" | "MAHA" | "LORAN" | "TANK"> = {
  "/hotels": "HOTELS",
  "/dairy": "MAHA",
  "/farms": "LORAN",
  "/education": "TANK",
};

export async function enterWorkspaceByPath(formData: FormData): Promise<void> {
  await requireUser();
  const path = String(formData.get("path") ?? "");
  const code = OPS_PATH_TO_COMPANY_CODE[path];
  if (!code) redirect(path || "/dashboard");

  // CROSS-TENANT INTENT: must read every Company; the user is switching
  // workspaces, no scoping should apply.
  const company = await prismaUnscoped.company.findFirst({
    where: { code },
    select: { id: true, code: true },
  });
  if (!company) redirect(path);

  (await cookies()).set(WORKSPACE_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  const slug = COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? null;
  if (slug) {
    (await cookies()).set(TENANT_COOKIE, slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    (await cookies()).delete(TENANT_COOKIE);
  }
  redirect(path);
}
