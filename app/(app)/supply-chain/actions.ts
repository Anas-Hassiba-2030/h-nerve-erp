"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/softDelete";
import { flashToast } from "@/lib/toast";
import { logActivity } from "@/lib/activityLog";
import { getLocale } from "@/lib/i18n.server";

const forecastSchema = z.object({
  sourceCompanyId: z.string().min(1),
  targetCompanyId: z.string().min(1),
  category: z.enum(["DAIRY", "PRODUCE", "MEAT", "BAKERY", "BEVERAGE"]),
  productLabel: z.string().min(1).max(160),
  unit: z.string().max(20).default("kg"),
  predictedDemand: z.coerce.number().min(0),
  confidence: z.coerce.number().min(0).max(1).default(0.7),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  signal: z.string().min(1).max(1000),
  status: z.enum(["DRAFT", "APPROVED", "EXECUTED", "DISMISSED"]).default("DRAFT"),
});

export async function createForecast(formData: FormData) {
  const user = await requireRole("MANAGER");
  const data = forecastSchema.parse({
    sourceCompanyId: formData.get("sourceCompanyId"),
    targetCompanyId: formData.get("targetCompanyId"),
    category: formData.get("category"),
    productLabel: formData.get("productLabel"),
    unit: formData.get("unit") || "kg",
    predictedDemand: formData.get("predictedDemand"),
    confidence: formData.get("confidence") ?? 0.7,
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    signal: formData.get("signal"),
    status: formData.get("status") || "DRAFT",
  });

  const created = await prisma.supplyForecast.create({
    data: {
      sourceCompanyId: data.sourceCompanyId,
      targetCompanyId: data.targetCompanyId,
      category: data.category,
      productLabel: data.productLabel,
      unit: data.unit,
      predictedDemand: data.predictedDemand,
      confidence: data.confidence,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      signal: data.signal,
      status: data.status,
      generatedById: user.id,
    },
  });
  await logActivity({
    action: "FORECAST",
    entity: "FORECAST",
    entityId: created.id,
    summary: `تنبؤ جديد: ${data.productLabel} — ${data.predictedDemand} ${data.unit}`,
    summaryEn: `Forecast: ${data.productLabel} — ${data.predictedDemand} ${data.unit}`,
    module: "SUPPLY",
    meta: { confidence: data.confidence, category: data.category },
  });
  revalidatePath("/supply-chain");
  redirect("/supply-chain");
}

export async function setForecastStatus(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const before = await prisma.supplyForecast.findUnique({ where: { id } });
  await prisma.supplyForecast.update({ where: { id }, data: { status } });
  if (before) {
    await logActivity({
      action: status === "APPROVED" ? "APPROVE" : status === "DISMISSED" ? "REJECT" : "UPDATE",
      entity: "FORECAST",
      entityId: id,
      summary: `تنبؤ "${before.productLabel}" → ${status}`,
      summaryEn: `Forecast "${before.productLabel}" → ${status}`,
      module: "SUPPLY",
      meta: { from: before.status, to: status },
    });
  }
  revalidatePath("/supply-chain");
}

export async function deleteForecast(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.supplyForecast.findUnique({ where: { id } });
  await softDelete("forecast", id);
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "FORECAST",
      entityId: id,
      summary: `حذف تنبؤ "${before.productLabel}"`,
      summaryEn: `Deleted forecast "${before.productLabel}"`,
      module: "SUPPLY",
    });
  }
  flashToast({
    type: "deleted",
    entity: "forecast",
    id,
    label: deletedLabel("forecast"),
    restorePath: "/api/toast/undo",
  });
}

export async function restoreForecast(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softRestore("forecast", id);
  const after = await prisma.supplyForecast.findUnique({ where: { id } });
  if (after) {
    await logActivity({
      action: "RESTORE",
      entity: "FORECAST",
      entityId: id,
      summary: `استعادة تنبؤ "${after.productLabel}"`,
      summaryEn: `Restored forecast "${after.productLabel}"`,
      module: "SUPPLY",
    });
  }
  flashToast({
    type: "restored",
    entity: "forecast",
    id,
    label: restoredLabel("forecast"),
  });
}

// =================================================================
// AUTO-GENERATE: scan upcoming bookings and produce forecast drafts
// for any hotel-week with occupancy above threshold.
// This is the "AI bridge" demo — heuristic now, swappable for an LLM
// or stats model later.
// =================================================================
export async function autoGenerateForecasts(): Promise<void> {
  const user = await requireUser();
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  // Phase P4 — count newly-created forecasts so we can toast a real
  // result number instead of leaving the user staring at a refreshed
  // page wondering whether the click did anything.
  let generated = 0;

  const [hotels, maha, loran] = await Promise.all([
    prisma.hotel.findMany({
      include: {
        company: true,
        bookings: {
          where: {
            checkIn: { lte: horizon },
            checkOut: { gte: now },
            status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
          },
        },
      },
    }),
    prisma.company.findFirst({ where: { sector: "DAIRY" } }),
    prisma.company.findFirst({ where: { sector: "AGRICULTURE" } }),
  ]);

  if (!maha || !loran) {
    revalidatePath("/supply-chain");
    return;
  }

  for (const hotel of hotels) {
    const occupiedRooms = hotel.bookings.reduce((acc, b) => acc + b.rooms, 0);
    if (!hotel.totalRooms) continue;
    const occupancy = Math.min(occupiedRooms / hotel.totalRooms, 1);
    // Phase P4 — lowered from 0.55 so the demo doesn't silently skip
    // every hotel during off-peak windows. 0.20 still filters out
    // genuinely-idle properties; for a denser cutoff in production,
    // raise this back to 0.5.
    if (occupancy < 0.2) continue;

    // Approx. 1.7 guests per room, 1.2 L dairy per guest per day, 7-day window
    const guests = occupiedRooms * 1.7;
    const dairyDemand = Math.round(guests * 1.2 * 7);
    const produceDemand = Math.round(guests * 0.6 * 7);
    const confidence = Math.min(0.5 + occupancy * 0.5, 0.97);

    const periodStart = new Date(now);
    const periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Avoid duplicate auto-drafts in the same window for the same hotel
    const existing = await prisma.supplyForecast.findFirst({
      where: {
        sourceCompanyId: hotel.companyId,
        status: "DRAFT",
        deletedAt: null,
        periodStart: { gte: now, lte: horizon },
        productLabel: { contains: hotel.name },
      },
    });
    if (existing) continue;

    await prisma.supplyForecast.create({
      data: {
        sourceCompanyId: hotel.companyId,
        targetCompanyId: maha.id,
        category: "DAIRY",
        productLabel: `حليب وألبان لـ ${hotel.name}`,
        unit: "لتر",
        predictedDemand: dairyDemand,
        confidence,
        periodStart,
        periodEnd,
        signal: `إشغال ${Math.round(occupancy * 100)}% خلال الأسبوع القادم في ${hotel.name} — توقع استهلاك ألبان مرتفع للإفطارات.`,
        status: "DRAFT",
        generatedById: user.id,
      },
    });

    await prisma.supplyForecast.create({
      data: {
        sourceCompanyId: hotel.companyId,
        targetCompanyId: loran.id,
        category: "PRODUCE",
        productLabel: `خضروات طازجة لـ ${hotel.name}`,
        unit: "كغ",
        predictedDemand: produceDemand,
        confidence: Math.max(0.45, confidence - 0.1),
        periodStart,
        periodEnd,
        signal: `نفس إشارة إشغال ${hotel.name} — توقع استهلاك مطبخ مرتفع، اقتراح حصاد أولوية من دفيئات لوران.`,
        status: "DRAFT",
        generatedById: user.id,
      },
    });
    generated += 2;
  }

  // Phase P4 — visible result. Same flashToast shape used elsewhere in
  // this file. Honest copy: tells the user exactly how many forecasts
  // landed (or "no busy hotels" when the heuristic skipped everyone).
  flashToast({
    type: "info",
    entity: "info",
    label:
      generated > 0
        ? `${generated} forecasts generated · ${generated} توقعات`
        : "No occupancy signal above 20% — Run engine produced no forecasts · لا إشغال يتجاوز ٢٠٪",
  });

  revalidatePath("/supply-chain");
  revalidatePath("/dashboard");
}

// =================================================================
// Phase P7-MVP — Approve / Reject a SupplyForecast draft.
// Approve advances status DRAFT → APPROVED and stamps an audit log
// entry. Creating a downstream PurchaseOrder requires linking to a
// real Supplier + Product row on the target tenant — left as a
// follow-up; documented inline so the UX is honest about what
// Approve means today: "intent recorded, procurement flow next."
// =================================================================
export async function approveForecast(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const f = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!f) return;
  if (f.status !== "DRAFT") return; // idempotent — only DRAFTs advance
  await prisma.supplyForecast.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  const ar = getLocale() === "ar";
  // Phase NS-FIX — toast + audit log use ar/en switch via getLocale
  // instead of one combined "ar · en" string. Matches the rest of
  // the codebase (see lib/toast usage in admin/users/actions.ts).
  await logActivity({
    action: "UPDATE",
    entity: "FORECAST",
    entityId: id,
    summary: `اعتمد التنبؤ: ${f.productLabel}`,
    summaryEn: `Approved forecast: ${f.productLabel}`,
    module: "SUPPLY",
  });
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "اعتُمد التنبؤ" : "Forecast approved",
  });
  revalidatePath("/supply-chain");
}

export async function rejectForecast(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.supplyForecast.update({
    where: { id },
    data: { status: "DISMISSED" },
  });
  const ar = getLocale() === "ar";
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "رُفض التنبؤ" : "Forecast dismissed",
  });
  revalidatePath("/supply-chain");
}
