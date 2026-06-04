import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createTransaction } from "../actions";
import "../../daylight.css";

export default async function NewTransactionPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="المركز المالي"
        title="عملية مالية جديدة"
        subtitle="تدخل مباشرة في تقارير صافي الربح والمساهمة بين الشركات."
      />
      <div className="flex-1 p-6">
        <form action={createTransaction} className="panel reveal mx-auto max-w-2xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="companyId">الشركة</label>
              <select id="companyId" name="companyId" required className="select" defaultValue="">
                <option value="" disabled>اختر</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="kind">النوع</label>
              <select id="kind" name="kind" defaultValue="REVENUE" className="select">
                <option value="REVENUE">إيراد</option>
                <option value="EXPENSE">مصروف</option>
                <option value="TRANSFER">تحويل</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">التصنيف</label>
              <input id="category" name="category" required className="input" placeholder="حجوزات / رواتب / تسويق…" />
            </div>

            <div>
              <label className="label" htmlFor="amount">المبلغ</label>
              <input id="amount" name="amount" type="number" min={0} step={1} required defaultValue={1000} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="currency">العملة</label>
              <input id="currency" name="currency" defaultValue="JOD" maxLength={3} className="input font-mono uppercase" />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="occurredAt">تاريخ العملية</label>
              <input id="occurredAt" name="occurredAt" type="date" required defaultValue={today} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">الوصف</label>
            <textarea id="description" name="description" rows={3} className="textarea" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <Link href="/finance" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> حفظ العملية
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
