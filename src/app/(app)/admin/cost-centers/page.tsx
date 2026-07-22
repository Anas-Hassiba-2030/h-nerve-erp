// /admin/cost-centers — the analytic dimension registry
// (docs/HOURANI-ERP-GAPS.md #2 🔴). Each row can be tagged onto a manual
// journal entry line (/admin/journal) and later filtered in the P&L
// (/statements?costCenter=code) to answer "what did THIS business unit
// cost me, separately from the others."
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { createCostCenter, deleteCostCenter } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function CostCentersPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const costCenters = await prisma.costCenter.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    include: { _count: { select: { lines: true } } },
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <AdminFamilyNav current="/admin/cost-centers" ar={ar} />
        <div>
          <h1 className="text-xl font-bold">{ar ? "مراكز التكلفة" : "Cost Centres"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? "بُعد تحليلي على القيود المحاسبية — يفصل الأرباح والخسائر لكل وحدة عمل."
              : "An analytic dimension on journal entries — splits the P&L per business unit."}
          </p>
        </div>

        {canManage ? (
          <form action={createCostCenter} className="card card-pad flex flex-wrap items-end gap-3" noValidate>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "الرمز" : "Code"} *</label>
              <input name="code" className="input font-mono" required maxLength={20} placeholder="AMMAN-HTL" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
              <input name="name" className="input" required maxLength={120} placeholder={ar ? "فندق عمّان" : "Amman Hotel"} />
            </div>
            <button type="submit" className="btn btn-primary">
              {ar ? "إضافة" : "Add"}
            </button>
          </form>
        ) : null}

        {costCenters.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={ar ? "لا مراكز تكلفة بعد" : "No cost centres yet"}
            description={
              ar
                ? "أضف مركز تكلفة أعلاه، ثم اربطه بسطور القيود اليدوية في /admin/journal."
                : "Add a cost centre above, then tag it on manual journal lines at /admin/journal."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرمز" : "Code"}</th>
                  <th>{ar ? "الاسم" : "Name"}</th>
                  <th style={{ textAlign: "end" }}>{ar ? "سطور مرتبطة" : "Tagged lines"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {costCenters.map((cc) => (
                  <tr key={cc.id}>
                    <td className="font-mono">{cc.code}</td>
                    <td>{cc.name}</td>
                    <td className="font-mono" style={{ textAlign: "end" }}>{formatNumber(cc._count.lines)}</td>
                    {canManage ? (
                      <td>
                        <form action={deleteCostCenter}>
                          <input type="hidden" name="id" value={cc.id} />
                          <button type="submit" className="btn-ghost text-sm">
                            {ar ? "حذف" : "Delete"}
                          </button>
                        </form>
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
