import Link from "next/link";
import { Plus, ListTree, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteBom } from "../actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function BomsPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const boms = await prisma.billOfMaterials.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { product: true, _count: { select: { lines: true, orders: true } } },
    take: 100,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/manufacturing" className="btn-ghost text-sm mb-2 inline-flex">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "التصنيع" : "Manufacturing"}
            </Link>
            <h1 className="text-xl font-bold">{ar ? "قوائم المواد" : "Bills of materials"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(boms.length)} قائمة` : `${formatNumber(boms.length)} BOMs`}
            </p>
          </div>
          {canManage ? (
            <Link href="/manufacturing/boms/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "قائمة مواد جديدة" : "New BOM"}
            </Link>
          ) : null}
        </div>

        {boms.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title={ar ? "لا قوائم مواد بعد" : "No bills of materials yet"}
            description={
              ar
                ? "قائمة المواد تصف كيف يُجمّع منتج نهائي من مكوّناته."
                : "A bill of materials describes how a finished product is assembled from its components."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الرقم" : "Number"}</th>
                  <th>{ar ? "الاسم" : "Name"}</th>
                  <th>{ar ? "المنتج الناتج" : "Output product"}</th>
                  <th>{ar ? "المكوّنات" : "Components"}</th>
                  <th>{ar ? "كلفة إضافية / دورة" : "Labor+OH / run"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {boms.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono">{b.bomNumber}</td>
                    <td>{b.name}</td>
                    <td>
                      {b.product.name}
                      {b.outputQty > 1 ? (
                        <span style={{ color: "var(--ink-muted)" }}> ×{b.outputQty}</span>
                      ) : null}
                    </td>
                    <td className="font-mono">{formatNumber(b._count.lines)}</td>
                    <td className="font-mono">
                      {formatMoney(Number(b.laborCost) + Number(b.overheadCost))}
                    </td>
                    {canManage ? (
                      <td>
                        {b._count.orders === 0 ? (
                          <form action={deleteBom}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "حذف" : "Delete"}
                            </button>
                          </form>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                            {ar ? `${b._count.orders} أمر` : `${b._count.orders} orders`}
                          </span>
                        )}
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
