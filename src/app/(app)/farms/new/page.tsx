import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createFarm } from "../actions";
import "../../daylight.css";

export default async function NewFarmPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["AGRICULTURE", "EDUCATION"] } },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="الزراعة الذكية"
        title="إضافة مزرعة"
        subtitle="مزرعة جديدة تنضم لشبكة لوران المُراقَبة عبر H-Nerve."
      />
      <div className="panel reveal mx-auto max-w-3xl">
        <form action={createFarm} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="companyId">الشركة المالكة</label>
              <select id="companyId" name="companyId" required className="select" defaultValue="">
                <option value="" disabled>اختر شركة</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="name">الاسم العربي</label>
              <input id="name" name="name" required className="input" placeholder="دفيئة لوران 2 — الأغوار" />
            </div>
            <div>
              <label className="label" htmlFor="nameEn">English name</label>
              <input id="nameEn" name="nameEn" className="input" dir="ltr" />
            </div>

            <div>
              <label className="label" htmlFor="type">نوع المزرعة</label>
              <select id="type" name="type" defaultValue="GREENHOUSE" className="select">
                <option value="GREENHOUSE">دفيئة ذكية</option>
                <option value="OPEN_FIELD">حقل مفتوح</option>
                <option value="LIVESTOCK">ثروة حيوانية</option>
                <option value="POULTRY">دواجن</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="areaDunum">المساحة (دونم)</label>
              <input id="areaDunum" name="areaDunum" type="number" min={0} step={0.5} defaultValue={5} className="input" />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="location">الموقع</label>
              <input id="location" name="location" required className="input" placeholder="وادي الأردن — منطقة الكرامة" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">الوصف</label>
            <textarea id="description" name="description" rows={3} className="textarea" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <Link href="/farms" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> حفظ المزرعة
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
