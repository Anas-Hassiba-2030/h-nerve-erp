// /workspace/finance — company-scoped P&L + transaction ledger.

import { redirect } from "next/navigation";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getAsOf, formatAsOfLabel } from "@/lib/utils/timemachine";
import { formatMoney } from "@/lib/utils/utils";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function WorkspaceFinancePage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";

  // Time-Machine aware — when the user has scrubbed back, the whole
  // P&L + ledger reconstructs the company's books as of that date.
  const { asOf, isTraveling } = getAsOf();
  const txns = await prisma.transaction.findMany({
    where: asOf ? { occurredAt: { lte: asOf } } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 1200,
  });

  const rev = txns
    .filter((t) => t.kind === "REVENUE")
    .reduce((a, t) => a + t.amount, 0);
  const exp = txns
    .filter((t) => t.kind === "EXPENSE")
    .reduce((a, t) => a + t.amount, 0);
  const net = rev - exp;
  const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية" : "Finance"}
        title={ar ? "القيادة المالية" : "Financial command"}
        subtitle={
          isTraveling && asOf
            ? ar
              ? `الحالة كما في ${formatAsOfLabel(asOf, "ar")}`
              : `State as of ${formatAsOfLabel(asOf, "en")}`
            : ar
              ? "مفلتر لهذه الشركة فقط"
              : "Filtered to this company only"
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الإيرادات" : "Revenue"} value={formatMoney(rev)} />
        <DaylightKpi label={ar ? "المصاريف" : "Expenses"} value={formatMoney(exp)} />
        <DaylightKpi label={ar ? "الصافي" : "Net"} value={formatMoney(net)} />
        <DaylightKpi label={ar ? "الهامش" : "Margin"} value={`${margin}%`} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "القيادة المالية" : "Financial command"}>
        <WorkspaceFinancials ar={ar} txns={txns.map((t) => ({ kind: t.kind, amount: t.amount, occurredAt: t.occurredAt }))} />
      </DaylightPanel>

      <DaylightPanel title={ar ? "سجل الحركات" : "Transaction ledger"}>
        <table className="dl-table">
          <thead>
            <tr>
              <th>{ar ? "البيان" : "Description"}</th>
              <th>{ar ? "النوع" : "Kind"}</th>
              <th className="num">{ar ? "المبلغ" : "Amount"}</th>
              <th className="num">{ar ? "التاريخ" : "Date"}</th>
            </tr>
          </thead>
          <tbody>
            {txns.slice(0, 40).map((t) => (
              <tr key={t.id}>
                <td>
                  {(t as any).description ?? (t as any).note ?? (ar ? "حركة" : "Transaction")}
                </td>
                <td>{t.kind}</td>
                <td
                  className="num"
                  style={{
                    color:
                      t.kind === "REVENUE"
                        ? "var(--emerald)"
                        : t.kind === "EXPENSE"
                          ? "var(--brick)"
                          : "var(--ink)",
                  }}
                >
                  {t.kind === "EXPENSE" ? "−" : "+"}
                  {formatMoney(t.amount)}
                </td>
                <td className="num">
                  {new Intl.DateTimeFormat(
                    ar ? "ar-JO-u-nu-latn" : "en-US",
                    { day: "numeric", month: "short", year: "2-digit" },
                  ).format(new Date(t.occurredAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DaylightPanel>
    </DaylightShell>
  );
}
