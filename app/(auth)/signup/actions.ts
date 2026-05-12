"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getSession, type SessionUser } from "@/lib/session";

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    redirect(
      `/signup?error=${encodeURIComponent("يرجى تعبئة كل الحقول. كلمة المرور 6 أحرف على الأقل.")}`
    );
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
  };
  await session.save();
  redirect("/dashboard");
}
