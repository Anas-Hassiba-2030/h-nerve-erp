// /admin/customers — Customer entities (Phase 7). Promoted from the
// legacy SalesOrder customer strings. Mirror of /admin/suppliers.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { formatNumber, orderStatusBadge, ORDER_STATUS_AR, ORDER_STATUS_EN } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { NewCustomerForm, EditCustomerForm, DeleteCustomerButton } from "./CustomerForms";
import "../../daylight.css";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) redirect("/dashboard");

  const q = str(searchParams.q);
  const deep = str(searchParams.customer);

  const where: Prisma.CustomerWhereInput = { deletedAt: null };
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [allCount, activeCount, soLinked, fulfilledThisMonth, customers] =
    await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { deletedAt: null } }),
      // SO.customerId is non-null post-Schema-2 → every non-deleted SO is linked.
      prisma.salesOrder.count({ where: { deletedAt: null } }),
      prisma.salesOrder.count({
        where: { status: "FULFILLED", updatedAt: { gte: monthStart }, deletedAt: null },
      }),
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        take: 300,
        include: {
          _count: { select: { salesOrders: true } },
          salesOrders: {
            select: { id: true, soNumber: true, status: true },
            take: 50,
            orderBy: { orderedAt: "desc" },
          },
        },
      }),
    ]);

  const tenantDefault =
    customers.length > 0
      ? [...customers.reduce((m, c) => m.set(c.tenantId, (m.get(c.tenantId) ?? 0) + 1), new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])[0][0]
      : "hourani-hotels";
  const dash = "—";
  const oLabel = (s: string) => (ar ? ORDER_STATUS_AR : ORDER_STATUS_EN)[s] ?? s;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العلاقات" : "Relationships"}
        title={ar ? "العملاء" : "Customers"}
        subtitle={
          ar
            ? "كيانات حقيقية — رُقّيت من سلاسل العميل في أوامر البيع"
            : "Real entities — promoted from the SalesOrder customer strings"
        }
        actions={<AdminFamilyNav current="/admin/customers" ar={ar} />}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الإجمالي" : "Total"} value={formatNumber(allCount)} />
        <DaylightKpi label={ar ? "نشط" : "Active"} value={formatNumber(activeCount)} />
        <DaylightKpi label={ar ? "أوامر بيع مرتبطة" : "SOs linked"} value={formatNumber(soLinked)} />
        <DaylightKpi label={ar ? "نُفِّذت هذا الشهر" : "Fulfilled this month"} value={formatNumber(fulfilledThisMonth)} />
      </DaylightKpiGrid>

      <div className="mt-3">
        <NewCustomerForm tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="panel reveal mt-3">
        <form method="GET" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={ar ? "بحث بالاسم أو البريد…" : "Search name or email…"}
            className="input w-full text-xs"
            aria-label={ar ? "بحث" : "Search"}
          />
          <button type="submit" className="btn-secondary btn-sm">{ar ? "بحث" : "Search"}</button>
          {q ? <Link href="/admin/customers" className="btn-ghost btn-sm">{ar ? "مسح" : "Clear"}</Link> : null}
        </form>
      </div>

      {customers.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {ar ? "لا عملاء" : "No customers"}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {customers.map((c) => (
            <details key={c.id} className="panel reveal overflow-hidden" open={deep === c.id}>
              <summary
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                style={{ listStyle: "none" }}
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink-muted)" }} aria-hidden />
                <span className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>{c.name}</span>
                {c.email ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{c.email}</span> : null}
                {c.phone ? <span className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>{c.phone}</span> : null}
                <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                  {c.paymentTerms ? <span className="badge-slate">{c.paymentTerms}</span> : null}
                  <span className="badge-violet">{ar ? "أوامر بيع" : "SOs"} {c._count.salesOrders}</span>
                </span>
              </summary>

              <div className="flex flex-col gap-4 px-4 py-3" style={{ borderTop: "1px solid var(--line)" }}>
                <EditCustomerForm customer={c} ar={ar} />

                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                    {ar ? "أوامر البيع" : "Sales orders"}
                  </div>
                  {c.salesOrders.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{dash}</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-xs">
                      {c.salesOrders.map((so) => (
                        <li key={so.id} className="flex items-center gap-2">
                          <Link href={`/admin/sales-orders?so=${encodeURIComponent(so.soNumber)}`} className="font-mono underline decoration-dotted underline-offset-2" style={{ color: "var(--brand-deep)" }}>
                            {so.soNumber}
                          </Link>
                          <span className={orderStatusBadge(so.status)}>{oLabel(so.status)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <DeleteCustomerButton id={c.id} name={c.name} ar={ar} />
                </div>
              </div>
            </details>
          ))}
        </section>
      )}
    </DaylightShell>
  );
}
