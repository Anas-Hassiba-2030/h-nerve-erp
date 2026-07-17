import Link from "next/link";
import { Plus, Building2, TimerReset } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatDate, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { bookValue } from "@/lib/finance/assets";
import { deleteFixedAsset, disposeAsset, runDepreciation } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const assets = await prisma.fixedAsset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { depreciation: { select: { amount: true } } },
    take: 200,
  });

  const enriched = assets.map((a) => {
    const accumulated = a.depreciation.reduce((s, d) => s + Number(d.amount), 0);
    return {
      ...a,
      accumulated,
      book: bookValue(Number(a.purchaseCost), Number(a.salvageValue), accumulated),
    };
  });
  const totalCost = enriched.reduce((s, a) => s + Number(a.purchaseCost), 0);
  const totalBook = enriched.reduce((s, a) => s + a.book, 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الأصول الثابتة" : "Fixed Assets"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? `${formatNumber(assets.length)} أصل · التكلفة ${formatMoney(totalCost)} · القيمة الدفترية ${formatMoney(totalBook)}`
                : `${formatNumber(assets.length)} assets · cost ${formatMoney(totalCost)} · book value ${formatMoney(totalBook)}`}
            </p>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <form action={runDepreciation}>
                <button type="submit" className="btn">
                  <TimerReset className="h-4 w-4" />
                  {ar ? "تشغيل إهلاك الشهر" : "Run monthly depreciation"}
                </button>
              </form>
              <Link href="/assets/new" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "أصل جديد" : "New asset"}
              </Link>
            </div>
          ) : null}
        </div>

        {assets.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={ar ? "لا أصول ثابتة بعد" : "No fixed assets yet"}
            description={
              ar
                ? "سجّل أول أصل (معدات، مركبات، مبانٍ) لبدء احتساب الإهلاك الشهري تلقائياً."
                : "Register your first asset (equipment, vehicles, buildings) to start monthly depreciation."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "الأصل" : "Asset"}</th>
                  <th>{ar ? "تاريخ الشراء" : "Purchased"}</th>
                  <th>{ar ? "التكلفة" : "Cost"}</th>
                  <th>{ar ? "الإهلاك المتراكم" : "Accumulated"}</th>
                  <th>{ar ? "القيمة الدفترية" : "Book value"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {enriched.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.assetNumber}</td>
                    <td>
                      {a.name}
                      {a.category ? (
                        <span style={{ fontSize: 12, color: "var(--ink-muted)", marginInlineStart: 6 }}>{a.category}</span>
                      ) : null}
                    </td>
                    <td>{formatDate(a.purchaseDate, ar ? "ar" : "en")}</td>
                    <td className="font-mono">{formatMoney(Number(a.purchaseCost))}</td>
                    <td className="font-mono">{formatMoney(a.accumulated)}</td>
                    <td className="font-mono">{formatMoney(a.book)}</td>
                    <td>
                      <span className={a.status === "ACTIVE" ? "badge-emerald" : "badge-slate"}>
                        {a.status === "ACTIVE" ? (ar ? "نشط" : "Active") : (ar ? "مستبعد" : "Disposed")}
                      </span>
                    </td>
                    {canManage ? (
                      <td>
                        <div className="flex items-center gap-2">
                          {a.status === "ACTIVE" ? (
                            <form action={disposeAsset}>
                              <input type="hidden" name="id" value={a.id} />
                              <button type="submit" className="btn-ghost text-sm">
                                {ar ? "استبعاد" : "Dispose"}
                              </button>
                            </form>
                          ) : null}
                          <form action={deleteFixedAsset}>
                            <input type="hidden" name="id" value={a.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "حذف" : "Delete"}
                            </button>
                          </form>
                        </div>
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
