import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteSupplier } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseInvoices: true, purchaseOrders: true } } },
    take: 200,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الموردون" : "Suppliers"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(suppliers.length)} مورّد` : `${formatNumber(suppliers.length)} suppliers`}
            </p>
          </div>
          {canManage ? (
            <Link href="/suppliers/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "مورّد جديد" : "New supplier"}
            </Link>
          ) : null}
        </div>

        {suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={ar ? "لا موردون بعد" : "No suppliers yet"}
            description={
              ar
                ? "أضف أول مورّد لتتمكن من تسجيل فواتير مشتريات له."
                : "Add your first supplier so you can bill purchase invoices against them."
            }
            action={
              canManage ? (
                <Link href="/suppliers/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "مورّد جديد" : "New supplier"}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الاسم" : "Name"}</th>
                  <th>{ar ? "البريد الإلكتروني" : "Email"}</th>
                  <th>{ar ? "الهاتف" : "Phone"}</th>
                  <th>{ar ? "فواتير المشتريات" : "Purchase invoices"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {canManage ? (
                        <Link href={`/suppliers/${s.id}/edit`} className="font-medium">
                          {s.name}
                        </Link>
                      ) : (
                        s.name
                      )}
                    </td>
                    <td dir="ltr">{s.email ?? "—"}</td>
                    <td dir="ltr">{s.phone ?? "—"}</td>
                    <td className="font-mono">{formatNumber(s._count.purchaseInvoices)}</td>
                    {canManage ? (
                      <td className="flex gap-2">
                        <Link href={`/suppliers/${s.id}/edit`} className="btn-ghost text-sm">
                          {ar ? "تعديل" : "Edit"}
                        </Link>
                        <form action={deleteSupplier}>
                          <input type="hidden" name="id" value={s.id} />
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
