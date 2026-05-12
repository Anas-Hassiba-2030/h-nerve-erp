"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { generateNumber } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import {
  parseFormState,
  formStateFromError,
  type FormState,
} from "@/lib/formState";

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
    .enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"])
    .default("CONFIRMED"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function createHotel(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
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
        companyId: data.companyId,
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
  await requireUser();
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
  await requireUser();
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
    throw new Error("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.");
  }

  const booking = await prisma.booking.create({
    data: {
      hotelId: data.hotelId,
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
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function deleteBooking(formData: FormData) {
  await requireUser();
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
