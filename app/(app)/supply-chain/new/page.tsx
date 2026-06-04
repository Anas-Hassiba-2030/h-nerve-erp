import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createForecast } from "../actions";
import "../../daylight.css";

export default async function NewForecastPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="سلسلة التوريد"
        title="تنبؤ توريد جديد"
        subtitle="ربط يدوي بين شركة-مصدر وشركة-هدف، مع إشارة تفسير."
      />
      <div className="panel reveal mx-auto max-w-3xl">
        <form action={createForecast} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sourceCompanyId">من شركة (المصدر)</label>
              <select id="sourceCompanyId" name="sourceCompanyId" required className="select" defaultValue="">
                <option value="" disabled>اختر</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="targetCompanyId">إلى شركة (الهدف)</label>
              <select id="targetCompanyId" name="targetCompanyId" required className="select" defaultValue="">
                <option value="" disabled>اختر</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="category">الفئة</label>
              <select id="category" name="category" defaultValue="DAIRY" className="select">
                <option value="DAIRY">ألبان</option>
                <option value="PRODUCE">خضروات وفواكه</option>
                <option value="MEAT">لحوم</option>
                <option value="BAKERY">مخبوزات</option>
                <option value="BEVERAGE">مشروبات</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">الحالة</label>
              <select id="status" name="status" defaultValue="DRAFT" className="select">
                <option value="DRAFT">مسودة</option>
                <option value="APPROVED">موافق عليها</option>
                <option value="EXECUTED">منفّذة</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="productLabel">وصف الطلب</label>
              <input id="productLabel" name="productLabel" required className="input" placeholder="حليب وألبان للإفطارات" />
            </div>

            <div>
              <label className="label" htmlFor="predictedDemand">الكمية المتوقعة</label>
              <input id="predictedDemand" name="predictedDemand" type="number" min={0} step={1} required defaultValue={500} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="unit">الوحدة</label>
              <input id="unit" name="unit" defaultValue="لتر" className="input" />
            </div>

            <div>
              <label className="label" htmlFor="confidence">الثقة (0 — 1)</label>
              <input id="confidence" name="confidence" type="number" min={0} max={1} step={0.05} defaultValue={0.8} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="periodStart">بداية الفترة</label>
              <input id="periodStart" name="periodStart" type="date" required defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="periodEnd">نهاية الفترة</label>
              <input id="periodEnd" name="periodEnd" type="date" required defaultValue={week} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="signal">إشارة التفسير</label>
            <textarea id="signal" name="signal" rows={3} required className="textarea" placeholder="مثل: تأكيد 380 حجز إضافي في أرينا عمّان للأسبوع القادم — استهلاك إفطار متوقع +42%." />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <Link href="/supply-chain" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> حفظ التنبؤ
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
