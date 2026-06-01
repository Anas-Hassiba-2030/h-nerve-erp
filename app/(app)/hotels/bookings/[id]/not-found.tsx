import Link from "next/link";
import { ArrowLeft, Calendar, FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 anim-fade-up">
      <div className="card card-pad max-w-md text-center anim-pop">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #b06a1a 22%, transparent) 0%, color-mix(in srgb, var(--gold) 22%, transparent) 100%)",
            color: "#b06a1a",
          }}
        >
          <Calendar className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          الحجز غير موجود
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          ربما تمّ إلغاء هذا الحجز أو حذفه. ارجع لقائمة الحجوزات الحديثة في صفحة الفنادق.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/hotels" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            الفنادق
          </Link>
          <Link href="/hotels/bookings/new" className="btn-ghost">
            <FileSearch className="h-4 w-4" />
            حجز جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
