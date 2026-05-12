import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Thermometer,
  Droplets,
  Beaker,
  Plus,
  Save,
  Activity,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteButton } from "@/components/DeleteButton";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  ar,
  FARM_TYPES_AR,
  formatNumber,
  formatRelative,
  formatShortDate,
} from "@/lib/utils";
import { updateSensors, deleteCrop } from "../actions";

export default async function FarmDetailPage({ params }: { params: { id: string } }) {
  const farm = await prisma.farm.findUnique({
    where: { id: params.id },
    include: { company: true, crops: { orderBy: { expectedHarvest: "asc" } } },
  });
  if (!farm) notFound();

  const sensorsAction = updateSensors.bind(null, farm.id);
  const pinned = await isPinned("FARM", farm.id);

  return (
    <>
      <Topbar
        eyebrow={`${farm.company.name} • ${ar(FARM_TYPES_AR, farm.type)}`}
        title={farm.name}
        subtitle={`${farm.location} • ${formatNumber(farm.areaDunum)} دونم`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/farms" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> العودة
            </Link>
            <PinButton
              entityType="FARM"
              entityId={farm.id}
              label={farm.name}
              labelEn={farm.nameEn ?? undefined}
              href={`/farms/${farm.id}`}
              icon="Sprout"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <div className="section-title">حالة المستشعرات</div>
              <span className="text-[11px] text-slate-500">
                <Activity className="me-1 inline h-3.5 w-3.5" />
                آخر قراءة: {formatRelative(farm.lastReadAt)}
              </span>
            </div>

            <form action={sensorsAction} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="tempC">
                    <Thermometer className="me-1 inline h-3.5 w-3.5 text-amber-600" />
                    حرارة (°م)
                  </label>
                  <input
                    id="tempC"
                    name="tempC"
                    type="number"
                    step={0.1}
                    defaultValue={farm.tempC ?? ""}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="humidity">
                    <Droplets className="me-1 inline h-3.5 w-3.5 text-sky-600" />
                    رطوبة (٪)
                  </label>
                  <input
                    id="humidity"
                    name="humidity"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={farm.humidity ?? ""}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="soilMoisture">
                    <Beaker className="me-1 inline h-3.5 w-3.5 text-emerald-600" />
                    رطوبة تربة (٪)
                  </label>
                  <input
                    id="soilMoisture"
                    name="soilMoisture"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={farm.soilMoisture ?? ""}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor="alertLevel">مستوى التنبيه</label>
                  <select
                    id="alertLevel"
                    name="alertLevel"
                    defaultValue={farm.alertLevel}
                    className="select"
                  >
                    <option value="OK">طبيعي</option>
                    <option value="WARN">تحذير</option>
                    <option value="CRITICAL">حرج</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">
                  <Save className="h-4 w-4" /> حفظ القراءة
                </button>
              </div>
            </form>
          </div>

          <div className="card card-pad">
            <div className="section-title">عن المزرعة</div>
            {farm.description ? (
              <p className="mt-3 text-sm text-slate-700">{farm.description}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">لا يوجد وصف.</p>
            )}
            <div className="mt-4 grid gap-2 text-xs text-slate-600">
              <div>النوع: {ar(FARM_TYPES_AR, farm.type)}</div>
              <div>الموقع: {farm.location}</div>
              <div>المساحة: {formatNumber(farm.areaDunum)} دونم</div>
              <div>الشركة: {farm.company.name}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="section-title">المحاصيل</div>
            <Link href={`/farms/crops/new?farmId=${farm.id}`} className="btn-secondary btn-sm">
              <Plus className="h-3.5 w-3.5" /> إضافة محصول
            </Link>
          </div>
          {farm.crops.length === 0 ? (
            <div className="card card-pad text-sm text-slate-500">لا توجد محاصيل مسجلة.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المحصول</th>
                    <th>الصنف</th>
                    <th>زرع</th>
                    <th>حصاد متوقع</th>
                    <th>إنتاج متوقع (كغ)</th>
                    <th>إنتاج فعلي (كغ)</th>
                    <th>الحالة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {farm.crops.map((c) => (
                    <tr key={c.id}>
                      <td className="font-bold text-brand-900">{c.name}</td>
                      <td className="text-slate-600">{c.variety ?? "—"}</td>
                      <td className="text-xs">{formatShortDate(c.plantedAt)}</td>
                      <td className="text-xs">{formatShortDate(c.expectedHarvest)}</td>
                      <td>{formatNumber(c.expectedYieldKg)}</td>
                      <td>{c.actualYieldKg != null ? formatNumber(c.actualYieldKg) : "—"}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>
                        <DeleteButton action={deleteCrop} payload={{ id: c.id }} label={`حذف ${c.name}؟`} description="سيتم حذف المحصول من سجلات هذه المزرعة." />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
