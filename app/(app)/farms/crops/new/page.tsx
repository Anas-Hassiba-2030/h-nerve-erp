import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createCrop } from "../../actions";
import "../../../daylight.css";

export default async function NewCropPage({
  searchParams,
}: {
  searchParams: { farmId?: string };
}) {
  const farms = await prisma.farm.findMany({
    orderBy: { name: "asc" },
    include: { company: true },
    take: 100,
  });

  const today = new Date().toISOString().slice(0, 10);
  const harvestDefault = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="الزراعة الذكية"
        title="إضافة محصول جديد"
        subtitle="ينضم تلقائياً إلى نموذج التنبؤ بالإنتاج."
      />
      <div className="panel reveal mx-auto max-w-2xl">
        <form action={createCrop} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="farmId">المزرعة</label>
              <select id="farmId" name="farmId" required className="select" defaultValue={searchParams.farmId ?? ""}>
                <option value="" disabled>اختر مزرعة</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="name">المحصول</label>
              <input id="name" name="name" required className="input" placeholder="طماطم" />
            </div>
            <div>
              <label className="label" htmlFor="variety">الصنف</label>
              <input id="variety" name="variety" className="input" placeholder="Cherry F1" />
            </div>

            <div>
              <label className="label" htmlFor="plantedAt">تاريخ الزراعة</label>
              <input id="plantedAt" name="plantedAt" type="date" required defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="expectedHarvest">تاريخ الحصاد المتوقع</label>
              <input id="expectedHarvest" name="expectedHarvest" type="date" required defaultValue={harvestDefault} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="expectedYieldKg">إنتاج متوقع (كغ)</label>
              <input id="expectedYieldKg" name="expectedYieldKg" type="number" min={0} step={50} defaultValue={2000} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="status">الحالة</label>
              <select id="status" name="status" defaultValue="GROWING" className="select">
                <option value="GROWING">ينمو</option>
                <option value="HARVESTING">في الحصاد</option>
                <option value="HARVESTED">تم الحصاد</option>
                <option value="FAILED">متعثر</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <Link href="/farms" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Save className="h-4 w-4" /> حفظ المحصول
            </button>
          </div>
        </form>
      </div>
    </DaylightShell>
  );
}
