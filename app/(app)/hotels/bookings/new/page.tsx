import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { prisma } from "@/lib/db";
import { createBooking } from "../../actions";

export default async function NewBookingPage() {
  const hotels = await prisma.hotel.findMany({
    orderBy: { name: "asc" },
    include: { company: true },
  });

  const today = new Date().toISOString().slice(0, 10);
  const tmrw = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <>
      <Topbar eyebrow="الضيافة والفنادق" title="حجز جديد" subtitle="إدخال حجز يدوي يدخل مباشرة في تنبؤات سلسلة التوريد." />
      <div className="flex-1 p-6">
        <form action={createBooking} className="card card-pad mx-auto max-w-3xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="hotelId">الفندق</label>
              <select id="hotelId" name="hotelId" required className="select" defaultValue="">
                <option value="" disabled>اختر فندقاً</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="guestName">اسم الضيف / العميل</label>
              <input id="guestName" name="guestName" required className="input" placeholder="مثل: وفد رجال الأعمال" />
            </div>
            <div>
              <label className="label" htmlFor="status">الحالة</label>
              <select id="status" name="status" defaultValue="CONFIRMED" className="select">
                <option value="CONFIRMED">مؤكد</option>
                <option value="ACTIVE">نشط</option>
                <option value="CHECKED_IN">دخل الفندق</option>
                <option value="COMPLETED">مكتمل / غادر</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="roomType">نوع الغرفة</label>
              <select id="roomType" name="roomType" defaultValue="STANDARD" className="select">
                <option value="STANDARD">عادية</option>
                <option value="DELUXE">فاخرة</option>
                <option value="SUITE">جناح</option>
                <option value="PRESIDENTIAL">جناح رئاسي</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="rooms">عدد الغرف</label>
              <input id="rooms" name="rooms" type="number" min={1} defaultValue={1} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="guests">عدد النزلاء</label>
              <input id="guests" name="guests" type="number" min={1} defaultValue={2} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="revenue">الإيراد المتوقع (د.أ)</label>
              <input id="revenue" name="revenue" type="number" min={0} step={10} defaultValue={300} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="checkIn">تاريخ الوصول</label>
              <input id="checkIn" name="checkIn" type="date" required defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="checkOut">تاريخ المغادرة</label>
              <input id="checkOut" name="checkOut" type="date" required defaultValue={tmrw} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="notes">ملاحظات</label>
            <textarea id="notes" name="notes" rows={3} className="textarea" placeholder="VIP، طلبات خاصة، تنبيهات الاستقبال…" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-surface-200 pt-4">
            <Link href="/hotels" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" /> حفظ الحجز
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
