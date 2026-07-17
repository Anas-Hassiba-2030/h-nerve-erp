import Link from "next/link";
import { Plus, Landmark } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteTreasury } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  CASH: { ar: "نقدي", en: "Cash" },
  BANK: { ar: "بنكي", en: "Bank" },
};

export default async function TreasuriesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const treasuries = await prisma.treasury.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { payments: true } } },
    take: 100,
  });

  // Balance = customer payments IN minus supplier payments OUT (see the
  // Treasury model comment in finance.prisma).
  const [inflows, outflows] = await Promise.all([
    prisma.payment.groupBy({ by: ["treasuryId"], _sum: { amount: true } }),
    prisma.supplierPayment.groupBy({ by: ["treasuryId"], _sum: { amount: true } }),
  ]);
  const balanceByTreasury = new Map(inflows.map((b) => [b.treasuryId, Number(b._sum.amount ?? 0)]));
  for (const o of outflows) {
    balanceByTreasury.set(o.treasuryId, (balanceByTreasury.get(o.treasuryId) ?? 0) - Number(o._sum.amount ?? 0));
  }

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ar ? "الخزائن" : "Treasuries"}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar ? `${formatNumber(treasuries.length)} خزينة` : `${formatNumber(treasuries.length)} treasuries`}
            </p>
          </div>
          {canManage ? (
            <Link href="/treasuries/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {ar ? "خزينة جديدة" : "New treasury"}
            </Link>
          ) : null}
        </div>

        {treasuries.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={ar ? "لا خزائن بعد" : "No treasuries yet"}
            description={
              ar
                ? "أضف خزينة نقدية أو حساباً بنكياً لتسجيل الدفعات."
                : "Add a cash box or bank account to start recording payments."
            }
            action={
              canManage ? (
                <Link href="/treasuries/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "خزينة جديدة" : "New treasury"}
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
                  <th>{ar ? "النوع" : "Type"}</th>
                  <th>{ar ? "رمز الحساب" : "Account code"}</th>
                  <th>{ar ? "الرصيد" : "Balance"}</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {treasuries.map((t) => {
                  const type = TYPE_LABEL[t.type] ?? { ar: t.type, en: t.type };
                  return (
                    <tr key={t.id}>
                      <td className="font-medium">{t.name}</td>
                      <td>{ar ? type.ar : type.en}</td>
                      <td className="font-mono">{t.accountCode}</td>
                      <td className="font-mono">{formatMoney(balanceByTreasury.get(t.id) ?? 0, t.currency)}</td>
                      {canManage ? (
                        <td>
                          <form action={deleteTreasury}>
                            <input type="hidden" name="id" value={t.id} />
                            <button type="submit" className="btn-ghost text-sm">
                              {ar ? "حذف" : "Delete"}
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
