"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { hashPassword } from "@/lib/auth/auth";
import { passwordError } from "@/lib/auth/password";
import { getSession, type SessionUser } from "@/lib/auth/session";

// Public self-registration is CLOSED in production unless explicitly
// opted in (H_NERVE_OPEN_SIGNUP=true). The login page never linked here —
// this was an unlisted-but-open door on a deployment holding real Hourani
// operational data, and prod provisioning already guarantees admin
// accounts via scripts/seed/ensure-admins.ts, so nothing legitimate
// needs it. Dev/local keeps signup open for convenience.
function signupOpen(): boolean {
  return (
    process.env.H_NERVE_OPEN_SIGNUP === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export async function signupAction(formData: FormData) {
  if (!signupOpen()) {
    redirect(
      `/login?error=${encodeURIComponent("التسجيل الذاتي مغلق. تواصل مع مدير النظام.")}`
    );
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) {
    redirect(
      `/signup?error=${encodeURIComponent("يرجى تعبئة كل الحقول.")}`
    );
  }
  const pwErr = passwordError(password, true);
  if (pwErr) {
    redirect(`/signup?error=${encodeURIComponent(pwErr)}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(
      `/signup?error=${encodeURIComponent("هذا البريد الإلكتروني مستخدم بالفعل.")}`
    );
  }

  const userCount = await prisma.user.count();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "STAFF",
    },
  });

  const session = await getSession();
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    title: user.title,
    // Phase F1 — signup never assigns a company today, so both fields
    // are null. Kept explicit so the shape matches login.
    companyId: null,
    tenantSlug: null,
  };
  await session.save();
  redirect("/orrery");
}
