"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, verifyPassword } from "@/lib/auth";
import { getSession, type SessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";

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

  // Phase 4 — deactivated accounts cannot sign in.
  if (!user.active) {
    redirect(
      `/login?error=${encodeURIComponent("هذا الحساب معطّل. تواصل مع مدير النظام.")}&email=${encodeURIComponent(email)}`
    );
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    title: user.title,
  };
  await session.save();

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

  redirect("/dashboard");
}
