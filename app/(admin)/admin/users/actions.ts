"use server";

// Server actions for /admin/users. User CRUD for the superadmin
// console. createUser + resetPassword return FormState so the client
// can surface the real password-policy error inline (Phase 12 password
// rules are stricter than the old "min 8" label suggested). updateUser
// + setActive + deleteUser stay void — they have lockout guards and
// nothing to say back to the user beyond the revalidated list.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { passwordError } from "@/lib/password";
import type { FormState } from "@/lib/formState";
import { isRole } from "./roles";

async function gate() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("forbidden");
  return user;
}

function done() {
  revalidatePath("/admin/users");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// True when deactivating/demoting/deleting `targetId` would leave zero
// active ADMINs. Pass the post-change predicate target.
async function wouldStrandAdmin(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ADMIN" || !target.active) return false;
  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", active: true, id: { not: targetId } },
  });
  return otherActiveAdmins === 0;
}

export async function createUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await gate();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(formData.get("role") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  const ar = String(formData.get("__locale") ?? "en") === "ar";
  // Phase F-UX — companyId from the picker. "" = no company (admin /
  // cross-tenant roamer). Stored as null. The middleware does not scope
  // User, so the picker validation lives here.
  const rawCompanyId = String(formData.get("companyId") ?? "").trim();
  const companyId = rawCompanyId || null;

  const errors: Record<string, string> = {};
  if (!name) errors.name = ar ? "الاسم مطلوب" : "Name is required";
  if (!EMAIL_RE.test(email)) errors.email = ar ? "بريد إلكتروني غير صالح" : "Invalid email";
  if (!isRole(role)) errors.role = ar ? "دور غير صالح" : "Invalid role";
  const pwErr = passwordError(password, ar);
  if (pwErr) errors.password = pwErr;

  if (companyId) {
    const exists = await prisma.company.findUnique({ where: { id: companyId } });
    if (!exists) errors.companyId = ar ? "شركة غير موجودة" : "Company not found";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      errors: {
        email: ar ? "هذا البريد مستخدم بالفعل" : "Email already in use",
      },
    };
  }

  await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password), companyId },
  });
  done();
  return {
    ok: true,
    message: ar ? `تم إنشاء المستخدم ${email}` : `User ${email} created`,
  };
}

export async function updateUser(formData: FormData): Promise<void> {
  const me = await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return done();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || null;
  const role = String(formData.get("role") ?? "").trim().toUpperCase();
  // Phase F-UX — companyId picker. "" = unassigned (null in DB).
  const rawCompanyId = String(formData.get("companyId") ?? "").trim();
  const companyId = rawCompanyId || null;
  // Phase V3-P13 — reportsToId picker. "" = no manager (root / CEO).
  const rawReportsTo = String(formData.get("reportsToId") ?? "").trim();
  const reportsToId = rawReportsTo || null;
  if (!name || !isRole(role)) return done();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();

  const demotingFromAdmin = target.role === "ADMIN" && role !== "ADMIN";
  if (demotingFromAdmin) {
    if (id === me.id) return done();
    if (await wouldStrandAdmin(id)) return done();
  }

  if (companyId) {
    const exists = await prisma.company.findUnique({ where: { id: companyId } });
    if (!exists) return done(); // silently ignore invalid id
  }

  // Phase V3-P13 — prevent self-report (would create a cycle of len 1).
  // Deeper cycle prevention is a follow-up; UI offers a curated list.
  const safeReportsTo = reportsToId === id ? null : reportsToId;
  await prisma.user.update({
    where: { id },
    data: { name, title, role, companyId, reportsToId: safeReportsTo },
  });
  done();
}

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ar = String(formData.get("__locale") ?? "en") === "ar";

  if (!id) return { ok: false, formError: ar ? "معرّف غير صالح" : "Invalid id" };
  const pwErr = passwordError(password, ar);
  if (pwErr) return { ok: false, errors: { password: pwErr } };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, formError: ar ? "المستخدم غير موجود" : "User not found" };

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  done();
  return {
    ok: true,
    message: ar ? "تم تحديث كلمة المرور" : "Password updated",
  };
}

export async function setActive(formData: FormData): Promise<void> {
  const me = await gate();
  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return done();

  if (!active) {
    if (id === me.id) return done();
    if (await wouldStrandAdmin(id)) return done();
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();
  await prisma.user.update({ where: { id }, data: { active } });
  done();
}

// Hard delete. Same lockout guards as setActive(false): the federation
// must never lose its last reachable ADMIN, and an admin can't delete
// themselves out of the console. Sibling rows that reference the user
// (auditLog, comments, etc.) keep their `userId` value — there is no
// explicit FK from those tables to User in the current schema, so a
// User row can be removed without cascade orphans.
export async function deleteUser(formData: FormData): Promise<void> {
  const me = await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return done();
  if (id === me.id) return done();
  if (await wouldStrandAdmin(id)) return done();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();
  await prisma.user.delete({ where: { id } });
  done();
}
