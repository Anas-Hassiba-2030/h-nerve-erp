"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ALERT_KINDS, seedDefaultRules, type AlertKind } from "@/lib/alertEngine";
import { logActivity } from "@/lib/activityLog";
import { flashToast } from "@/lib/toast";
import { getLocale } from "@/lib/i18n.server";

const updateSchema = z.object({
  id: z.string().min(1),
  threshold: z.coerce.number().min(0).max(1000),
  severity: z.enum(["INFO", "WARN", "CRITICAL", "OPPORTUNITY"]),
  cooldownHours: z.coerce.number().int().min(1).max(168).default(24),
});

export async function toggleRule(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule) return;
  await prisma.alertRule.update({
    where: { id },
    data: { isActive: !rule.isActive },
  });
  await logActivity({
    action: "UPDATE",
    entity: "INSIGHT",
    entityId: id,
    summary: `${!rule.isActive ? "تفعيل" : "إيقاف"} قاعدة "${rule.name}"`,
    summaryEn: `${!rule.isActive ? "Activated" : "Paused"} rule "${rule.nameEn ?? rule.name}"`,
  });
  revalidatePath("/alerts");
}

export async function updateRule(formData: FormData) {
  await requireUser();
  const data = updateSchema.parse({
    id: formData.get("id"),
    threshold: formData.get("threshold"),
    severity: formData.get("severity") || "WARN",
    cooldownHours: formData.get("cooldownHours") || 24,
  });
  await prisma.alertRule.update({
    where: { id: data.id },
    data: {
      threshold: data.threshold,
      severity: data.severity,
      cooldownHours: data.cooldownHours,
    },
  });
  const locale = getLocale();
  flashToast({
    type: "info",
    entity: "insight",
    id: data.id,
    label:
      locale === "ar"
        ? "تم حفظ إعدادات القاعدة"
        : "Rule settings saved",
  });
  revalidatePath("/alerts");
}

export async function seedRules() {
  const user = await requireUser();
  const result = await seedDefaultRules(user.id);
  await logActivity({
    action: "CREATE",
    entity: "INSIGHT",
    summary: `إنشاء ${result.seeded} قاعدة تنبيه افتراضية`,
    summaryEn: `Seeded ${result.seeded} default alert rules`,
  });
  flashToast({
    type: "info",
    entity: "insight",
    id: "seed",
    label:
      result.seeded > 0
        ? `تم إنشاء ${result.seeded} قاعدة افتراضية`
        : "القواعد موجودة بالفعل",
  });
  revalidatePath("/alerts");
}

export async function deleteRule(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  await prisma.alertRule.delete({ where: { id } });
  if (rule) {
    await logActivity({
      action: "DELETE",
      entity: "INSIGHT",
      entityId: id,
      summary: `حذف قاعدة "${rule.name}"`,
      summaryEn: `Deleted rule "${rule.nameEn ?? rule.name}"`,
    });
  }
  revalidatePath("/alerts");
}
