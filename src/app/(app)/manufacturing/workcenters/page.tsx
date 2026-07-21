import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { createWorkCenter, toggleWorkCenter, deleteWorkCenter, setWorkCenterAlternatives } from "../actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function WorkCentersPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const centers = await prisma.workCenter.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { operations: true, workOrders: true } },
      alternatives: { select: { id: true } },
    },
    take: 200,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "مراكز العمل" : "Work centers"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(centers.length)} مركز — محطات الإنتاج التي تنفّذ مراحل قوائم المواد وتحمل كلفة الساعة.`
                : `${formatNumber(centers.length)} centers — the production stations that execute BOM routing stages and carry the hourly rate.`}
            </p>
          </div>
          <Link href="/manufacturing" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "التصنيع" : "Manufacturing"}
          </Link>
        </div>

        {canManage ? (
          <form action={createWorkCenter} className="card card-pad space-y-4" noValidate>
            <div className="text-sm font-bold">{ar ? "مركز عمل جديد" : "New work center"}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
                <input name="name" className="input" required maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "الاسم الإنجليزي" : "English name"}
                </label>
                <input name="nameEn" className="input" maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "كلفة الساعة" : "Cost / hour"}
                </label>
                <input type="number" name="costPerHour" min={0} step="0.01" defaultValue={0} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "الكفاءة ٪" : "Efficiency %"}
                </label>
                <input type="number" name="efficiency" min={1} max={500} defaultValue={100} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "دقائق التجهيز" : "Setup min"}
                </label>
                <input type="number" name="setupMinutes" min={0} defaultValue={0} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {ar ? "دقائق التنظيف" : "Cleanup min"}
                </label>
                <input type="number" name="cleanupMinutes" min={0} defaultValue={0} className="input" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                {ar ? "إنشاء مركز العمل" : "Create work center"}
              </button>
            </div>
          </form>
        ) : null}

        {centers.length === 0 ? (
          <EmptyState
            icon={Factory}
            title={ar ? "لا مراكز عمل بعد" : "No work centers yet"}
            description={
              ar
                ? "أنشئ مراكز العمل (خلط، تشكيل، تعبئة…) ثم أسند إليها مراحل قوائم المواد."
                : "Create work centers (mixing, forming, packing…) then assign BOM routing stages to them."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرمز" : "Code"}</th>
                  <th>{ar ? "الاسم" : "Name"}</th>
                  <th>{ar ? "كلفة الساعة" : "Cost / hour"}</th>
                  <th>{ar ? "الكفاءة" : "Efficiency"}</th>
                  <th>{ar ? "تجهيز/تنظيف" : "Setup / cleanup"}</th>
                  <th>{ar ? "الاستخدام" : "Usage"}</th>
                  <th>{ar ? "البدائل" : "Alternatives"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {centers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono">{c.code}</td>
                    <td>
                      {c.name}
                      {c.nameEn ? (
                        <span style={{ color: "var(--ink-muted)", fontSize: 12 }}> · {c.nameEn}</span>
                      ) : null}
                    </td>
                    <td className="font-mono">{formatMoney(Number(c.costPerHour))}</td>
                    <td className="font-mono">{c.efficiency}%</td>
                    <td className="font-mono">
                      {formatNumber(Number(c.setupMinutes))} / {formatNumber(Number(c.cleanupMinutes))}{" "}
                      {ar ? "د" : "min"}
                    </td>
                    <td className="font-mono">
                      {formatNumber(c._count.operations)} {ar ? "مرحلة" : "ops"} ·{" "}
                      {formatNumber(c._count.workOrders)} {ar ? "أمر" : "WOs"}
                    </td>
                    <td>
                      {canManage && centers.length > 1 ? (
                        <details>
                          <summary style={{ cursor: "pointer", fontSize: 12.5 }}>
                            {formatNumber(c.alternatives.length)} {ar ? "بديل" : "alt"}
                          </summary>
                          <form
                            action={setWorkCenterAlternatives}
                            className="mt-2 space-y-1"
                            style={{ minWidth: 180 }}
                          >
                            <input type="hidden" name="id" value={c.id} />
                            {centers
                              .filter((other) => other.id !== c.id)
                              .map((other) => (
                                <label key={other.id} className="flex items-center gap-1.5" style={{ fontSize: 12.5 }}>
                                  <input
                                    type="checkbox"
                                    name="alternativeIds"
                                    value={other.id}
                                    defaultChecked={c.alternatives.some((a) => a.id === other.id)}
                                  />
                                  {other.name}
                                </label>
                              ))}
                            <button type="submit" className="btn-ghost text-sm mt-1">
                              {ar ? "حفظ" : "Save"}
                            </button>
                          </form>
                        </details>
                      ) : (
                        <span className="font-mono">{formatNumber(c.alternatives.length)}</span>
                      )}
                    </td>
                    <td>
                      <span className={c.active ? "badge-emerald" : "badge-slate"}>
                        {c.active ? (ar ? "فعّال" : "Active") : ar ? "متوقف" : "Inactive"}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="flex gap-2">
                        <form action={toggleWorkCenter}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="btn-ghost text-sm">
                            {c.active ? (ar ? "إيقاف" : "Deactivate") : ar ? "تفعيل" : "Activate"}
                          </button>
                        </form>
                        {c._count.operations === 0 ? (
                          <form action={deleteWorkCenter}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "حذف" : "Delete"}
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
