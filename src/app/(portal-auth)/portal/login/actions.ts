"use server";

// Client-portal login — separate identity from staff auth (lib/auth/session.ts).
// See lib/auth/portalSession.ts + lib/portal/portal.ts.

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { authenticatePortalAccount } from "@/lib/portal/portal";
import { getPortalSession } from "@/lib/auth/portalSession";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function portalLogin(formData: FormData): Promise<void> {
  const ar = (await getLocale()) === "ar";
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الدخول غير صالحة" : "Invalid login" });
    return;
  }

  const result = await authenticatePortalAccount(prisma, parsed.data);
  if (!result) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Incorrect email or password",
    });
    return;
  }

  const session = await getPortalSession();
  session.customer = result;
  await session.save();

  redirect("/portal");
}
