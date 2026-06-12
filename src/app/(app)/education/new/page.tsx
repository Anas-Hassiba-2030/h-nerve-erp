import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createProgram } from "../actions";
import "../../daylight.css";

export default async function NewProgramPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["EDUCATION", "INVESTMENT"] } },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="حاضنة The Tank"
        title="تسجيل مشروع ناشئ"
        subtitle="انضمام مشروع جديد إلى دورة الحاضنة الحالية."
      />
      <div className="flex-1 p-6">
        <form action={createProgram} className="panel reveal mx-auto max-w-3xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="companyId">الكيان الراعي</label>
              <select id="companyId" name="companyId" required className="select" defaultValue="">
                <option value="" disabled>اختر</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="name">اسم المشروع</label>
              <input id="name" name="name" required className="input" placeholder="نيرف لابز" />
            </div>
            <div>
              <label className="label" htmlFor="nameEn">English (اختياري)</label>
              <input id="nameEn" name="nameEn" className="input" dir="ltr" placeholder="Nerve Labs" />
            </div>

            <div>
              <label className="label" htmlFor="founder">المؤسس</label>
              <input id="founder" name="founder" required className="input" placeholder="أنس حسيبة" />
            </div>
            <div>
              <label className="label" htmlFor="vertical">القطاع</label>
              <select id="vertical" name="vertical" defaultValue="AI" className="select">
                <option value="AI">ذكاء اصطناعي</option>
                <option value="FINTECH">تقنية مالية</option>
                <option value="ECOMMERCE">تجارة إلكترونية</option>
                <option value="AGRITECH">تقنية زراعية</option>
                <option value="EDTECH">تقنية تعليم</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="stage">المرحلة</label>
              <select id="stage" name="stage" defaultValue="INTAKE" className="select">
                <option value="INTAKE">استقبال</option>
                <option value="ACCELERATING">في التسريع</option>
                <option value="GRADUATED">متخرج</option>
                <option value="STALLED">متعثر</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cohort">الكوهورت</label>
              <input id="cohort" name="cohort" defaultValue="2026-S1" className="input font-mono" />
            </div>

            <div>
              <label className="label" htmlFor="fundingJod">التمويل (د.أ)</label>
              <input id="fundingJod" name="fundingJod" type="number" min={0} step={500} defaultValue={5000} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="teamSize">حجم الفريق</label>
              <input id="teamSize" name="teamSize" type="number" min={1} defaultValue={2} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">الوصف</label>
            <textarea id="description" name="description" rows={3} className="textarea" placeholder="ماذا يبني المشروع، وما علاقته بشركات المجموعة؟" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <Link href="/education" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> حفظ المشروع
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
