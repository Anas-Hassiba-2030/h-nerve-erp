"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { resolveOwnCompanyId } from "@/lib/auth/adminActionScope";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { generateNumber } from "@/lib/utils/utils";
import { logActivity } from "@/lib/auth/activityLog";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";
import { COMPANY_CODE_TO_TENANT_SLUG, SECTOR_TO_TENANT_SLUG } from "@/lib/tenancy/tenancy";
import {
  parseFormState,
  formStateFromError,
  type FormState,
} from "@/lib/utils/formState";

const hotelSchema = z.object({
  companyId: z.string().min(1, "الشركة المالكة مطلوبة"),
  name: z.string().min(1, "الاسم العربي مطلوب").max(120),
  nameEn: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(1, "المدينة مطلوبة").max(80),
  country: z.string().length(2, "كود الدولة من حرفين").default("JO"),
  tier: z.enum(["LUXURY", "BUSINESS", "RESORT", "BOUTIQUE"]).default("BUSINESS"),
  totalRooms: z.coerce.number().int().min(1, "أدخل عدد الغرف (1 على الأقل)").default(1),
  starRating: z.coerce.number().int().min(1).max(5).default(4),
  baselineADR: z.coerce.number().min(0).default(120),
  description: z.string().max(2000).optional().or(z.literal("")),
});

const bookingSchema = z.object({
  hotelId: z.string().min(1),
  guestName: z.string().min(1).max(120),
  roomType: z.enum(["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"]).default("STANDARD"),
  rooms: z.coerce.number().int().min(1).default(1),
  guests: z.coerce.number().int().min(1).default(2),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  revenue: z.coerce.number().min(0).default(0),
  status: z
    .enum(["CONFIRMED", "ACTIVE", "CHECKED_IN", "COMPLETED", "CANCELLED"])
    .default("CONFIRMED"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function createHotel(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("MANAGER");
  const parsed = parseFormState(hotelSchema, {
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    nameEn: formData.get("nameEn") ?? "",
    city: formData.get("city"),
    country: formData.get("country") || "JO",
    tier: formData.get("tier") || "BUSINESS",
    totalRooms: formData.get("totalRooms") ?? 1,
    starRating: formData.get("starRating") ?? 4,
    baselineADR: formData.get("baselineADR") ?? 120,
    description: formData.get("description") ?? "",
  });
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  let created;
  try {
    created = await prisma.hotel.create({
      data: {
        companyId: resolveOwnCompanyId(data.companyId, getActiveWorkspaceId()),
        name: data.name,
        nameEn: data.nameEn || null,
        city: data.city,
        country: data.country,
        tier: data.tier,
        totalRooms: data.totalRooms,
        starRating: data.starRating,
        baselineADR: data.baselineADR,
        description: data.description || null,
      },
    });
  } catch (err) {
    return formStateFromError(err);
  }

  await logActivity({
    action: "CREATE",
    entity: "HOTEL",
    entityId: created.id,
    summary: `إنشاء فندق ${data.name} في ${data.city}`,
    summaryEn: `Created hotel ${data.name} in ${data.city}`,
    module: "HOSPITALITY",
  });
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function deleteHotel(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.hotel.findUnique({ where: { id } });
  await prisma.hotel.delete({ where: { id } });
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "HOTEL",
      entityId: id,
      summary: `حذف فندق ${before.name}`,
      summaryEn: `Deleted hotel ${before.name}`,
      module: "HOSPITALITY",
    });
  }
  revalidatePath("/hotels");
}

export async function createBooking(formData: FormData) {
  await requireRole("MANAGER");
  const ar = getLocale() === "ar";
  // bookingSchema.parse() + the check-out>check-in guard both throw; without a
  // catch the booking form silently re-renders with no message. Toast on any
  // failure so the button never looks dead.
  try {
    const data = bookingSchema.parse({
      hotelId: formData.get("hotelId"),
      guestName: formData.get("guestName"),
      roomType: formData.get("roomType") || "STANDARD",
      rooms: formData.get("rooms") ?? 1,
      guests: formData.get("guests") ?? 2,
      checkIn: formData.get("checkIn"),
      checkOut: formData.get("checkOut"),
      revenue: formData.get("revenue") ?? 0,
      status: formData.get("status") || "CONFIRMED",
      notes: formData.get("notes") ?? "",
    });

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    if (checkOut <= checkIn) {
      throw new Error("checkout-before-checkin");
    }

    // Phase F4 — derive tenantId from the parent hotel's company.
    const parentHotel = await prisma.hotel.findUnique({
      where: { id: data.hotelId },
      select: { company: { select: { code: true, sector: true } } },
    });
    const tenantSlug =
      (parentHotel && COMPANY_CODE_TO_TENANT_SLUG[parentHotel.company.code]) ||
      (parentHotel && SECTOR_TO_TENANT_SLUG[parentHotel.company.sector]) ||
      "hourani-hotels";

    const booking = await prisma.booking.create({
      data: {
        hotelId: data.hotelId,
        tenantId: tenantSlug,
        reference: generateNumber("BK"),
        guestName: data.guestName,
        roomType: data.roomType,
        rooms: data.rooms,
        guests: data.guests,
        checkIn,
        checkOut,
        revenue: data.revenue,
        status: data.status,
        notes: data.notes || null,
      },
    });
    await logActivity({
      action: "CREATE",
      entity: "BOOKING",
      entityId: booking.id,
      summary: `حجز جديد ${booking.reference} للضيف ${data.guestName}`,
      summaryEn: `New booking ${booking.reference} for ${data.guestName}`,
      module: "HOSPITALITY",
      meta: { revenue: data.revenue, rooms: data.rooms },
    });
  } catch (e) {
    const dateErr = (e as Error)?.message === "checkout-before-checkin";
    flashToast({
      type: "info", entity: "info", id: "create-booking",
      label: dateErr
        ? (ar ? "تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول" : "Check-out must be after check-in")
        : (ar ? "تعذّر إنشاء الحجز — تحقّق من المدخلات" : "Couldn't create booking — check the inputs"),
    });
    revalidatePath("/hotels");
    return;
  }
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function deleteBooking(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.booking.findUnique({ where: { id } });
  await prisma.booking.delete({ where: { id } });
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "BOOKING",
      entityId: id,
      summary: `حذف حجز ${before.reference}`,
      summaryEn: `Deleted booking ${before.reference}`,
      module: "HOSPITALITY",
    });
  }
  revalidatePath("/hotels");
}

export async function setBookingStatus(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const before = await prisma.booking.findUnique({ where: { id } });
  await prisma.booking.update({ where: { id }, data: { status } });
  if (before) {
    await logActivity({
      action: "UPDATE",
      entity: "BOOKING",
      entityId: id,
      summary: `تحديث حالة الحجز ${before.reference} إلى ${status}`,
      summaryEn: `Booking ${before.reference} status → ${status}`,
      module: "HOSPITALITY",
      meta: { from: before.status, to: status },
    });
  }
  revalidatePath("/hotels");
}
