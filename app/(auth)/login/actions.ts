"use server";

import { findUserByEmail, verifyPassword } from "@/lib/auth/auth";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { resolveTenantSlugForUser, TENANT_COOKIE } from "@/lib/tenancy/tenancy";
import { isOwnerEmail } from "@/lib/auth/owner";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/tenancy/workspace";

// The login form drives a cinematic "dive into the cosmos" transition on the
// client. To let the client decide WHEN to navigate (after the dive plays) and
// to shake the card on a real failure, the action RETURNS state instead of
// redirecting: { ok:true } on success (session cookies are already set, the
// client then navigates to /orrery), or { ok:false, error } on failure.
export type LoginState = { ok: boolean; error?: string; email?: string };

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ar = ((await cookies()).get("h_nerve_locale")?.value ?? "ar") !== "en";

  if (!email || !password) {
    return {
      ok: false,
      email,
      error: ar ? "البريد الإلكتروني وكلمة المرور مطلوبان" : "Email and password are required",
    };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, email, error: ar ? "بيانات اعتماد غير صحيحة" : "Invalid credentials" };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { ok: false, email, error: ar ? "بيانات اعتماد غير صحيحة" : "Invalid credentials" };
  }

  // Owner auto-admin: the product owner is always ADMIN regardless of
  // signup order. Promote the row once so the rest of the app (and future
  // logins) see ADMIN. See lib/owner.ts.
  if (isOwnerEmail(user.email) && user.role !== "ADMIN") {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      user.role = "ADMIN";
    } catch {
      /* non-fatal — fall through with existing role */
    }
  }

  // Phase 4 — deactivated accounts cannot sign in.
  if (!user.active) {
    return {
      ok: false,
      email,
      error: ar ? "هذا الحساب معطّل. تواصل مع مدير النظام." : "This account is disabled. Contact your administrator.",
    };
  }

  const session = await getSession();
  // Phase F1 — resolve the user's tenant slug at login so downstream
  // server actions / middleware can scope queries without re-touching
  // the DB on every request. companyId is optional on User; admins
  // and unassigned roamers stay null and remain cross-tenant.
  const tenantSlug = await resolveTenantSlugForUser(
    user.companyId,
    (id) => prisma.company.findUnique({ where: { id }, select: { code: true } }),
  );
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    title: user.title,
    companyId: user.companyId ?? null,
    tenantSlug,
  };
  await session.save();

  // Phase F2 — bind the user to their company workspace so the
  // workspaceScope middleware filters the scoped models from the
  // first page load. Users without a companyId (admins, roamers)
  // get no cookie and stay cross-tenant. The manual workspace
  // switcher (enterWorkspace / exitWorkspace) can still override.
  // ADMIN is a cross-tenant superadmin: do NOT pin them to a single
  // company workspace. Pinning scopes the executive dashboard (and every
  // module) to their home company and zeroes out the group-wide metrics
  // when that home company owns no operational rows. Admins start
  // group-wide and can still drill into any company via the workspace
  // switcher. Non-admins are pinned to their company exactly as before.
  const pinWorkspace = (user.role as string) !== "ADMIN";

  if (pinWorkspace && user.companyId) {
    (await cookies()).set(WORKSPACE_COOKIE, user.companyId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  // Phase F3 — set the tenant cookie too. Middleware uses it to scope
  // all opaque-tenantId models (Product, Supplier, ...). Null slug
  // means cross-tenant; no cookie written.
  if (pinWorkspace && tenantSlug) {
    (await cookies()).set(TENANT_COOKIE, tenantSlug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // Audit trail: log the login (best-effort, never block).
  try {
    await prisma.activityLog.create({
      data: {
        action: "LOGIN",
        entity: "AUTH",
        entityId: user.id,
        summary: `تسجيل دخول: ${user.name}`,
        summaryEn: `Login: ${user.name}`,
        actorId: user.id,
        actorName: user.name,
      },
    });
  } catch {
    /* swallow */
  }

  // Success: cookies are set on this response. The client plays the dive
  // animation, then navigates to /orrery with the fresh session.
  return { ok: true };
}
