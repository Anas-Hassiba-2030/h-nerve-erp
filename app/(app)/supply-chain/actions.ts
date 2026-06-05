"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/db/softDelete";
import { flashToast } from "@/lib/utils/toast";
import { logActivity } from "@/lib/auth/activityLog";
import { getLocale, t } from "@/lib/i18n/i18n.server";
import { formatNumber } from "@/lib/utils/utils";
import { approveForecastWithBridge } from "@/lib/supply/bridge";

const forecastSchema = z.object({
  sourceCompanyId: z.string().min(1),
  targetCompanyId: z.string().min(1),
  category: z.enum(["DAIRY", "PRODUCE", "MEAT", "BAKERY", "BEVERAGE"]),
  productLabel: z.string().min(1).max(160),
  productLabelEn: z.string().max(160).optional().or(z.literal("")),
  unit: z.string().max(20).default("kg"),
  predictedDemand: z.coerce.number().min(0),
  confidence: z.coerce.number().min(0).max(1).default(0.7),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  signal: z.string().min(1).max(1000),
  status: z.enum(["DRAFT", "APPROVED", "EXECUTED", "DISMISSED"]).default("DRAFT"),
})
  .refine((d) => new Date(d.periodEnd) > new Date(d.periodStart), {
    message: "periodEnd must be after periodStart",
    path: ["periodEnd"],
  })
  .refine((d) => d.sourceCompanyId !== d.targetCompanyId, {
    message: "source and target companies must differ",
    path: ["targetCompanyId"],
  });

export async function createForecast(formData: FormData) {
  const user = await requireRole("MANAGER");
  const data = forecastSchema.parse({
    sourceCompanyId: formData.get("sourceCompanyId"),
    targetCompanyId: formData.get("targetCompanyId"),
    category: formData.get("category"),
    productLabel: formData.get("productLabel"),
    productLabelEn: formData.get("productLabelEn") ?? "",
    unit: formData.get("unit") || "kg",
    predictedDemand: formData.get("predictedDemand"),
    confidence: formData.get("confidence") ?? 0.7,
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    signal: formData.get("signal"),
    status: formData.get("status") || "DRAFT",
  });

  // ISO-2 — a workspace-pinned operator may only create a forecast their
  // own company is party to (source OR target); a cross-company ADMIN
  // (no active workspace) may bridge any two. The scoped middleware also
  // blocks a foreign create — this just returns a graceful message first.
  const ws = getActiveWorkspaceId();
  if (ws && data.sourceCompanyId !== ws && data.targetCompanyId !== ws) {
    flashToast({
      type: "info",
      entity: "info",
      label:
        getLocale() === "ar"
          ? "⚠ يمكنك إنشاء تنبؤ لشركتك فقط"
          : "⚠ You can only create a forecast your company is part of",
    });
    return;
  }

  const created = await prisma.supplyForecast.create({
    data: {
      sourceCompanyId: data.sourceCompanyId,
      targetCompanyId: data.targetCompanyId,
      category: data.category,
      productLabel: data.productLabel,
      productLabelEn: data.productLabelEn || null,
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
  // ISO-2 ownership — the scoped client nulls a forecast outside the
  // caller's workspace (dual-FK guard), so a null row means foreign or
  // gone. Bail before the write so a pinned operator can't flip another
  // company's forecast status by id.
  const before = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!before) return;
  await prisma.supplyForecast.update({ where: { id }, data: { status } });
  await logActivity({
    action: status === "APPROVED" ? "APPROVE" : status === "DISMISSED" ? "REJECT" : "UPDATE",
    entity: "FORECAST",
    entityId: id,
    summary: `تنبؤ "${before.productLabel}" → ${status}`,
    summaryEn: `Forecast "${before.productLabel}" → ${status}`,
    module: "SUPPLY",
    meta: { from: before.status, to: status },
  });
  revalidatePath("/supply-chain");
}

export async function deleteForecast(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // ISO-2 ownership — null row = foreign/gone; bail before soft-deleting.
  const before = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!before) return;
  await softDelete("forecast", id);
  await logActivity({
    action: "DELETE",
    entity: "FORECAST",
    entityId: id,
    summary: `حذف تنبؤ "${before.productLabel}"`,
    summaryEn: `Deleted forecast "${before.productLabel}"`,
    module: "SUPPLY",
  });
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
  // ISO-2 ownership — findUnique returns the soft-deleted row only when the
  // caller's workspace is one of its endpoints; null = foreign/gone, bail.
  const before = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!before) return;
  await softRestore("forecast", id);
  await logActivity({
    action: "RESTORE",
    entity: "FORECAST",
    entityId: id,
    summary: `استعادة تنبؤ "${before.productLabel}"`,
    summaryEn: `Restored forecast "${before.productLabel}"`,
    module: "SUPPLY",
  });
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
  const locale = getLocale();
  const ar = locale === "ar";
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  // Phase P4 — count newly-created forecasts so we can toast a real
  // result number instead of leaving the user staring at a refreshed
  // page wondering whether the click did anything.
  let generated = 0;

  let hotels: any[] = [];
  let maha: { id: string } | null = null;
  let loran: { id: string } | null = null;
  try {
    [hotels, maha, loran] = await Promise.all([
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
  } catch (e) {
    flashToast({
      type: "info", entity: "info",
      label: ar
        ? `تعذّر استرجاع البيانات: ${(e as Error).message}`
        : `Could not load source data: ${(e as Error).message}`,
    });
    revalidatePath("/supply-chain");
    return;
  }

  if (!maha || !loran) {
    flashToast({
      type: "info", entity: "info",
      label: ar
        ? "بيانات الموردين ناقصة — شركة ألبان أو زراعة مفقودة."
        : "Supplier data incomplete — dairy or agri company missing.",
    });
    revalidatePath("/supply-chain");
    return;
  }

  for (const hotel of hotels) {
    const occupiedRooms = hotel.bookings.reduce((acc: number, b: { rooms: number }) => acc + b.rooms, 0);
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

    // Avoid duplicate auto-drafts for the same hotel. BUGFIX: the old guard
    // keyed on `periodStart >= now`, but a stored draft's periodStart is the
    // PREVIOUS run's `now` (already in the past on a re-run), so it never
    // matched and "Auto-generate" piled up duplicates. Re-key on a still-
    // pending DRAFT for this hotel whose period hasn't ended yet
    // (periodEnd >= now) — that catches an earlier run's drafts.
    const existing = await prisma.supplyForecast.findFirst({
      where: {
        sourceCompanyId: hotel.companyId,
        status: "DRAFT",
        deletedAt: null,
        periodEnd: { gte: now },
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
  // E14 — locale-aware via the i18n dictionary (was a stacked ar·en label).
  flashToast({
    type: "info",
    entity: "info",
    label:
      generated > 0
        ? t("toast.err.forecastsGenerated", locale).replace("{n}", formatNumber(generated))
        : t("toast.err.noOccupancySignal", locale),
  });

  revalidatePath("/supply-chain");
  revalidatePath("/dashboard");
}

// =================================================================
// Phase NS-1 — Approve a SupplyForecast draft + cross-tenant PO bridge.
//
// Approve advances DRAFT → APPROVED, then — if the forecast's TARGET
// company maps to an in-system tenant — drafts a PurchaseOrder on the
// BUYER's tenant and back-links it.
//
// Two coordinate systems meet here. The forecast lives in Company-space
// (sourceCompanyId / targetCompanyId). PurchaseOrder / Supplier live in
// Tenant-slug-space (the opaque `tenantId` column = Tenant.slug). The
// bridge crosses both via COMPANY_CODE_TO_TENANT_SLUG. Because the PO
// belongs on the BUYER's tenant — which is NOT necessarily the approver's
// active tenant (a Maha manager could approve a Hotels→Maha forecast) —
// the create runs through prismaUnscoped with an explicit tenantId, so
// the request-scoped middleware can't mis-stamp it or block it.
// =================================================================
export async function approveForecast(formData: FormData): Promise<void> {
  // Mutating + financial side effects (drafts a cross-tenant PO) → same
  // MANAGER floor as createForecast, not just any logged-in user.
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const f = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!f) return;
  if (f.status !== "DRAFT") return; // idempotent — only DRAFTs advance

  // --- Atomic approve + cross-tenant PO bridge --------------------
  // One transaction does the DRAFT→APPROVED flip, the PO insert, and the
  // forecast back-link (lib/supply/bridge.ts). No half-applied state, and
  // a concurrent duplicate is swallowed as an idempotent no-op.
  const result = await approveForecastWithBridge(id);
  if (!result.approved) {
    // Already approved by a concurrent call — nothing more to do.
    revalidatePath("/supply-chain");
    return;
  }
  const poNumberCreated = result.po?.poNumber ?? null;
  const supplierNameCreated = result.po?.supplierName ?? null;

  const ar = getLocale() === "ar";
  // Phase NS-FIX/NS-1 — toast + audit use ar/en switch via getLocale.
  // When a PO was drafted, append its number + supplier to both summaries.
  const poTailAr = poNumberCreated
    ? ` وأنشأ أمر شراء ${poNumberCreated} لـ ${supplierNameCreated}`
    : "";
  const poTailEn = poNumberCreated
    ? ` and created PO ${poNumberCreated} for ${supplierNameCreated}`
    : "";
  await logActivity({
    action: "UPDATE",
    entity: "FORECAST",
    entityId: id,
    summary: `اعتمد التنبؤ: ${f.productLabel}${poTailAr}`,
    summaryEn: `Approved forecast: ${f.productLabel}${poTailEn}`,
    module: "SUPPLY",
  });
  flashToast({
    type: "info",
    entity: "info",
    label: poNumberCreated
      ? ar
        ? `اعتُمد التنبؤ — أمر شراء ${poNumberCreated}`
        : `Forecast approved — PO ${poNumberCreated}`
      : ar
        ? "اعتُمد التنبؤ"
        : "Forecast approved",
  });
  revalidatePath("/supply-chain");
}

export async function rejectForecast(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // ISO-2 ownership — null row = foreign/gone; bail before dismissing.
  const f = await prisma.supplyForecast.findUnique({ where: { id } });
  if (!f) return;
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
