import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { createForecast } from "../actions";
import "../../daylight.css";

export default async function NewForecastPage() {
  const ar = getLocale() === "ar";
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" }, take: 100 });
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "سلسلة التوريد" : "Supply chain"}
        title={ar ? "تنبؤ توريد جديد" : "New supply forecast"}
        subtitle={ar
          ? "ربط يدوي بين شركة-مصدر وشركة-هدف، مع إشارة تفسير."
          : "Manual link between source and target companies, with an explanation signal."}
      />
      <div className="panel reveal mx-auto max-w-3xl">
        <form action={createForecast} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sourceCompanyId">
                {ar ? "من شركة (المصدر)" : "Source company"}
              </label>
              <select id="sourceCompanyId" name="sourceCompanyId" required className="select" defaultValue="">
                <option value="" disabled>{ar ? "اختر" : "Select"}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{ar ? c.name : (c.nameEn || c.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="targetCompanyId">
                {ar ? "إلى شركة (الهدف)" : "Target company"}
              </label>
              <select id="targetCompanyId" name="targetCompanyId" required className="select" defaultValue="">
                <option value="" disabled>{ar ? "اختر" : "Select"}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{ar ? c.name : (c.nameEn || c.name)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="category">{ar ? "الفئة" : "Category"}</label>
              <select id="category" name="category" defaultValue="DAIRY" className="select">
                <option value="DAIRY">{ar ? "ألبان" : "Dairy"}</option>
                <option value="PRODUCE">{ar ? "خضروات وفواكه" : "Produce"}</option>
                <option value="MEAT">{ar ? "لحوم" : "Meat"}</option>
                <option value="BAKERY">{ar ? "مخبوزات" : "Bakery"}</option>
                <option value="BEVERAGE">{ar ? "مشروبات" : "Beverage"}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">{ar ? "الحالة" : "Status"}</label>
              <select id="status" name="status" defaultValue="DRAFT" className="select">
                <option value="DRAFT">{ar ? "مسودة" : "Draft"}</option>
                <option value="APPROVED">{ar ? "موافق عليها" : "Approved"}</option>
                <option value="EXECUTED">{ar ? "منفّذة" : "Executed"}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="productLabel">
                {ar ? "وصف الطلب (عربي)" : "Product label (Arabic)"}
              </label>
              <input
                id="productLabel"
                name="productLabel"
                required
                className="input"
                dir="rtl"
                placeholder={ar ? "حليب وألبان للإفطارات" : "e.g. حليب وألبان للإفطارات"}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="productLabelEn">
                {ar ? "وصف الطلب (إنجليزي)" : "Product label (English)"}
              </label>
              <input
                id="productLabelEn"
                name="productLabelEn"
                className="input"
                dir="ltr"
                placeholder={ar ? "اختياري — يُعرض للمستخدمين الإنجليزيين" : "Optional — shown in English UI"}
              />
            </div>

            <div>
              <label className="label" htmlFor="predictedDemand">
                {ar ? "الكمية المتوقعة" : "Predicted demand"}
              </label>
              <input id="predictedDemand" name="predictedDemand" type="number" min={0} step={1} required defaultValue={500} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="unit">{ar ? "الوحدة" : "Unit"}</label>
              <input id="unit" name="unit" defaultValue={ar ? "لتر" : "litre"} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="confidence">
                {ar ? "الثقة (0 — 1)" : "Confidence (0 – 1)"}
              </label>
              <input id="confidence" name="confidence" type="number" min={0} max={1} step={0.05} defaultValue={0.8} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="periodStart">
                {ar ? "بداية الفترة" : "Period start"}
              </label>
              <input id="periodStart" name="periodStart" type="date" required defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="periodEnd">
                {ar ? "نهاية الفترة" : "Period end"}
              </label>
              <input id="periodEnd" name="periodEnd" type="date" required defaultValue={week} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="signal">
              {ar ? "إشارة التفسير" : "Explanation signal"}
            </label>
            <textarea
              id="signal"
              name="signal"
              rows={3}
              required
              className="textarea"
              placeholder={ar
                ? "مثل: تأكيد 380 حجز إضافي في أرينا عمّان للأسبوع القادم — استهلاك إفطار متوقع +42%."
                : "e.g. 380 confirmed extra bookings at Arena Amman next week — breakfast consumption forecast +42%."}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <Link href="/supply-chain" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> {ar ? "العودة" : "Back"}
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> {ar ? "حفظ التنبؤ" : "Save forecast"}
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
