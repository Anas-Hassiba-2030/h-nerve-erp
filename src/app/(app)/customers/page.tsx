import Link from "next/link";
import { Plus, UserSquare2 } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteCustomer } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
    take: 200,
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "العملاء" : "Customers"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(customers.length)} عميل` : `${formatNumber(customers.length)} customers`}
            </p>
          </div>
          {canManage ? (
            <Link href="/customers/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "عميل جديد" : "New customer"}
            </Link>
          ) : null}
        </div>

        {customers.length === 0 ? (
          <EmptyState
            icon={UserSquare2}
            title={ar ? "لا عملاء بعد" : "No customers yet"}
            description={
              ar
                ? "أضف أول عميل لتتمكن من إصدار فواتير له."
                : "Add your first customer so you can issue invoices to them."
            }
            action={
              canManage ? (
                <Link href="/customers/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "عميل جديد" : "New customer"}
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
                  <th>{ar ? "الفواتير" : "Invoices"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {canManage ? (
                        <Link href={`/customers/${c.id}/edit`} className="font-medium">
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                    </td>
                    <td dir="ltr">{c.email ?? "—"}</td>
                    <td dir="ltr">{c.phone ?? "—"}</td>
                    <td className="font-mono">{formatNumber(c._count.invoices)}</td>
                    {canManage ? (
                      <td className="flex gap-2">
                        <Link href={`/customers/${c.id}/edit`} className="btn-ghost text-sm">
                          {ar ? "تعديل" : "Edit"}
                        </Link>
                        <form action={deleteCustomer}>
                          <input type="hidden" name="id" value={c.id} />
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
