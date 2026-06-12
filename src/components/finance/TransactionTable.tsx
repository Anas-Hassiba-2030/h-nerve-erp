"use client";

import { Trash2 } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BulkActionBar, BulkCheckbox, useBulkSelect, type BulkAction } from "@/components/ui/BulkActionBar";
import { bulkDeleteTransactions, deleteTransaction } from "@/app/(app)/finance/actions";
import { formatMoney, formatShortDate } from "@/lib/utils/utils";

const KIND_LABEL: Record<string, { ar: string; en: string; tone: string }> = {
  REVENUE:  { ar: "إيراد",  en: "Revenue",  tone: "badge-emerald" },
  EXPENSE:  { ar: "مصروف",  en: "Expense",  tone: "badge-red" },
  TRANSFER: { ar: "تحويل",  en: "Transfer", tone: "badge-blue" },
};

type TxRow = {
  id: string;
  reference: string;
  occurredAt: Date | string;
  kind: string;
  category: string;
  amount: number;
  currency: string;
  company: { name: string; nameEn: string };
  createdBy: { name: string } | null;
};

export function TransactionTable({
  transactions,
  ar,
  canManage,
}: {
  transactions: TxRow[];
  ar: boolean;
  canManage: boolean;
}) {
  const ids = transactions.map((t) => t.id);
  const { selected, toggle, selectAll, clearAll } = useBulkSelect(ids);

  const bulkActions: BulkAction[] = canManage
    ? [
        {
          id: "delete",
          label: "Delete selected",
          labelAr: "حذف المحدد",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: "danger",
          action: (selectedIds) => bulkDeleteTransactions(selectedIds),
        },
      ]
    : [];

  return (
    <div>
      {canManage && ids.length > 1 && (
        <BulkActionBar
          ids={ids}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={clearAll}
          actions={bulkActions}
          ar={ar}
        />
      )}

      <div className="heri-card" style={{ padding: 0 }}>
        <div className="table-wrap rounded-none border-0 shadow-none">
          <table className="table">
            <thead>
              <tr>
                {canManage && <th style={{ width: 32 }}></th>}
                <th>{ar ? "المرجع" : "Ref"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "الشركة" : "Company"}</th>
                <th>{ar ? "النوع" : "Type"}</th>
                <th>{ar ? "التصنيف" : "Category"}</th>
                <th>{ar ? "المبلغ" : "Amount"}</th>
                <th>{ar ? "سُجّلت بواسطة" : "Logged by"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    background: selected.has(t.id)
                      ? "color-mix(in srgb, var(--heri-ochre) 6%, transparent)"
                      : undefined,
                  }}
                >
                  {canManage && (
                    <td style={{ paddingInlineEnd: 0 }}>
                      <BulkCheckbox id={t.id} selected={selected} onToggle={toggle} />
                    </td>
                  )}
                  <td className="font-mono text-xs" style={{ color: "var(--heri-ink-3)" }}>{t.reference}</td>
                  <td className="text-xs">{formatShortDate(new Date(t.occurredAt))}</td>
                  <td className="font-bold" style={{ color: "var(--heri-ink)" }}>{ar ? t.company.name : t.company.nameEn}</td>
                  <td>
                    <span className={KIND_LABEL[t.kind]?.tone ?? "badge-slate"}>
                      {ar ? KIND_LABEL[t.kind]?.ar ?? t.kind : KIND_LABEL[t.kind]?.en ?? t.kind}
                    </span>
                  </td>
                  <td style={{ color: "var(--heri-ink-2)" }}>{t.category}</td>
                  <td
                    className="font-mono font-bold"
                    style={{
                      color:
                        t.kind === "REVENUE"
                          ? "var(--heri-teal, #1f4e4a)"
                          : t.kind === "EXPENSE"
                            ? "var(--heri-terracotta, #b85c38)"
                            : "var(--heri-ochre-2, #a87a32)",
                    }}
                  >
                    {formatMoney(t.amount, t.currency)}
                  </td>
                  <td className="text-xs" style={{ color: "var(--heri-ink-3)" }}>{t.createdBy?.name ?? "—"}</td>
                  <td>
                    {canManage && (
                      <DeleteButton
                        action={deleteTransaction}
                        payload={{ id: t.id }}
                        label={`${ar ? "حذف العملية" : "Delete"} ${t.reference}؟`}
                        description={ar ? "سيتم حذف هذه الحركة المالية من السجل." : "This entry will be removed from the ledger."}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
