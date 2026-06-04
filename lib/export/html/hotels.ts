import "server-only";
import { prisma } from "@/lib/db";
import { hotelsAnalytics, type ExportAnalytics } from "@/lib/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderHotels(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "الضيافة — الفنادق والحجوزات" : "Hospitality — Hotels & Bookings";
  const bookings = await prisma.booking.findMany({
    orderBy: { checkIn: "desc" },
    include: { hotel: { include: { company: true } } },
    take: 500,
  });
  const analytics = hotelsAnalytics(bookings as any);
  const recordCount = bookings.length;
  const subtitle = ar
    ? `${bookings.length} حجز عبر شبكة الفنادق`
    : `${bookings.length} bookings across the hotel network`;
  const html = tableFromRows(
    ar
      ? ["مرجع", "فندق", "ضيف", "غرفة", "وصول", "مغادرة", "إيراد", "حالة"]
      : ["Ref", "Hotel", "Guest", "Room", "Check-in", "Check-out", "Revenue", "Status"],
    bookings.map((b) => [
      { v: b.reference, num: true },
      { v: b.hotel.name },
      { v: b.guestName },
      { v: b.roomType },
      { v: b.checkIn.toISOString().slice(0, 10), num: true },
      { v: b.checkOut.toISOString().slice(0, 10), num: true },
      { v: NUM(b.revenue), num: true },
      { v: b.status },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
