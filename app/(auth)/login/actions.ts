"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, verifyPassword } from "@/lib/auth";
import { getSession, type SessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resolveTenantSlugForUser, TENANT_COOKIE } from "@/lib/tenancy";
import { isOwnerEmail } from "@/lib/owner";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("البريد الإلكتروني وكلمة المرور مطلوبان")}&email=${encodeURIComponent(email)}`
    );
  }

  const user = await findUserByEmail(email);
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent("بيانات اعتماد غير صحيحة")}&email=${encodeURIComponent(email)}`
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    redirect(
      `/login?error=${encodeURIComponent("بيانات اعتماد غير صحيحة")}&email=${encodeURIComponent(email)}`
    );
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
    redirect(
      `/login?error=${encodeURIComponent("هذا الحساب معطّل. تواصل مع مدير النظام.")}&email=${encodeURIComponent(email)}`
    );
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
    cookies().set(WORKSPACE_COOKIE, user.companyId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  // Phase F3 — set the tenant cookie too. Middleware uses it to scope
  // all opaque-tenantId models (Product, Supplier, ...). Null slug
  // means cross-tenant; no cookie written.
  if (pinWorkspace && tenantSlug) {
    cookies().set(TENANT_COOKIE, tenantSlug, {
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

  redirect("/orrery");
}
