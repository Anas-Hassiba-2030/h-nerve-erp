import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { createInsight } from "../actions";
import "../../daylight.css";

export default function NewInsightPage() {
  return (
    <DaylightShell dir="rtl">
      <DaylightHeader
        eyebrow="إشارات H‑Nerve"
        title="تسجيل إشارة جديدة"
        subtitle="ملاحظة، تنبيه، أو فرصة استراتيجية تستحق انتباه الإدارة العليا."
      />
      <div style={{ padding: "0 0 24px" }}>
        <form action={createInsight} className="card card-pad mx-auto max-w-2xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="module">الوحدة</label>
              <select id="module" name="module" defaultValue="HOTELS" className="select">
                <option value="HOTELS">الفنادق</option>
                <option value="DAIRY">الألبان</option>
                <option value="FARMS">المزارع</option>
                <option value="SUPPLY">سلسلة التوريد</option>
                <option value="FINANCE">المالية</option>
                <option value="EDUCATION">التعليم</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="severity">الأهمية</label>
              <select id="severity" name="severity" defaultValue="INFO" className="select">
                <option value="INFO">معلومة</option>
                <option value="WARN">تحذير</option>
                <option value="CRITICAL">حرج</option>
                <option value="OPPORTUNITY">فرصة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="title">العنوان</label>
            <input id="title" name="title" required className="input" placeholder="مثل: ارتفاع غير معتاد في حجوزات أرينا صوفيا" />
          </div>

          <div>
            <label className="label" htmlFor="body">التفاصيل</label>
            <textarea id="body" name="body" required rows={6} className="textarea" placeholder="اكتب الإشارة بلغة الإدارة — ما الملاحظة، أين، ولماذا تستحق التحرك؟" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <Link href="/insights" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> نشر الإشارة
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
