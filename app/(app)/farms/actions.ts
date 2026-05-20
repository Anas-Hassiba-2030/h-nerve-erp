"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { logActivity } from "@/lib/activityLog";
import { COMPANY_CODE_TO_TENANT_SLUG, SECTOR_TO_TENANT_SLUG } from "@/lib/tenancy";

const farmSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(120),
  nameEn: z.string().max(120).optional().or(z.literal("")),
  type: z.enum(["GREENHOUSE", "OPEN_FIELD", "LIVESTOCK", "POULTRY"]),
  location: z.string().min(1).max(160),
  areaDunum: z.coerce.number().min(0).default(0),
  description: z.string().max(2000).optional().or(z.literal("")),
});

const sensorSchema = z.object({
  tempC: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  humidity: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
  soilMoisture: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
  alertLevel: z.enum(["OK", "WARN", "CRITICAL"]).default("OK"),
});

const cropSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(1).max(80),
  variety: z.string().max(80).optional().or(z.literal("")),
  plantedAt: z.string().min(1),
  expectedHarvest: z.string().min(1),
  expectedYieldKg: z.coerce.number().min(0).default(0),
  status: z.enum(["GROWING", "HARVESTING", "HARVESTED", "FAILED"]).default("GROWING"),
});

export async function createFarm(formData: FormData) {
  await requireRole("MANAGER");
  const data = farmSchema.parse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    nameEn: formData.get("nameEn") ?? "",
    type: formData.get("type"),
    location: formData.get("location"),
    areaDunum: formData.get("areaDunum") ?? 0,
    description: formData.get("description") ?? "",
  });
  const created = await prisma.farm.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      nameEn: data.nameEn || null,
      type: data.type,
      location: data.location,
      areaDunum: data.areaDunum,
      description: data.description || null,
    },
  });
  await logActivity({
    action: "CREATE",
    entity: "FARM",
    entityId: created.id,
    summary: `إنشاء مزرعة ${data.name} (${data.type})`,
    summaryEn: `Created farm ${data.name} (${data.type})`,
    module: "AGRICULTURE",
  });
  revalidatePath("/farms");
  redirect("/farms");
}

export async function updateSensors(farmId: string, formData: FormData) {
  await requireRole("MANAGER");
  const data = sensorSchema.parse({
    tempC: formData.get("tempC") ?? "",
    humidity: formData.get("humidity") ?? "",
    soilMoisture: formData.get("soilMoisture") ?? "",
    alertLevel: formData.get("alertLevel") || "OK",
  });
  await prisma.farm.update({
    where: { id: farmId },
    data: {
      tempC: data.tempC ?? null,
      humidity: data.humidity ?? null,
      soilMoisture: data.soilMoisture ?? null,
      alertLevel: data.alertLevel,
      lastReadAt: new Date(),
    },
  });
  revalidatePath("/farms");
  revalidatePath(`/farms/${farmId}`);
}

export async function deleteFarm(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.farm.findUnique({ where: { id } });
  await prisma.farm.delete({ where: { id } });
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "FARM",
      entityId: id,
      summary: `حذف مزرعة ${before.name}`,
      summaryEn: `Deleted farm ${before.name}`,
      module: "AGRICULTURE",
    });
  }
  revalidatePath("/farms");
}

export async function createCrop(formData: FormData) {
  await requireRole("MANAGER");
  const data = cropSchema.parse({
    farmId: formData.get("farmId"),
    name: formData.get("name"),
    variety: formData.get("variety") ?? "",
    plantedAt: formData.get("plantedAt"),
    expectedHarvest: formData.get("expectedHarvest"),
    expectedYieldKg: formData.get("expectedYieldKg") ?? 0,
    status: formData.get("status") || "GROWING",
  });
  // Phase F4 — derive tenantId from the parent farm's company.
  const parentFarm = await prisma.farm.findUnique({
    where: { id: data.farmId },
    select: { company: { select: { code: true, sector: true } } },
  });
  const tenantSlug =
    (parentFarm && COMPANY_CODE_TO_TENANT_SLUG[parentFarm.company.code]) ||
    (parentFarm && SECTOR_TO_TENANT_SLUG[parentFarm.company.sector]) ||
    "loran-agri";

  const created = await prisma.crop.create({
    data: {
      farmId: data.farmId,
      tenantId: tenantSlug,
      name: data.name,
      variety: data.variety || null,
      plantedAt: new Date(data.plantedAt),
      expectedHarvest: new Date(data.expectedHarvest),
      expectedYieldKg: data.expectedYieldKg,
      status: data.status,
    },
  });
  await logActivity({
    action: "CREATE",
    entity: "CROP",
    entityId: created.id,
    summary: `زراعة ${data.name}${data.variety ? ` (${data.variety})` : ""}`,
    summaryEn: `Planted ${data.name}${data.variety ? ` (${data.variety})` : ""}`,
    module: "AGRICULTURE",
  });
  revalidatePath("/farms");
  revalidatePath(`/farms/${data.farmId}`);
}

export async function deleteCrop(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const crop = await prisma.crop.findUnique({ where: { id } });
  if (!crop) return;
  await prisma.crop.delete({ where: { id } });
  revalidatePath("/farms");
  revalidatePath(`/farms/${crop.farmId}`);
}
