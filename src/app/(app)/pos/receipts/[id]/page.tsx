import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatDate } from "@/lib/utils/utils";
import { PrintButton } from "./PrintButton";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, { ar: string; en: string }> = {
  CASH: { ar: "نقدي", en: "Cash" },
  CARD: { ar: "بطاقة", en: "Card" },
  TRANSFER: { ar: "تحويل", en: "Transfer" },
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ar = (await getLocale()) === "ar";

  const sale = await prisma.posSale.findUnique({
    where: { id },
    include: { lines: { include: { product: true } }, session: { include: { treasury: true } } },
  });
  if (!sale || sale.deletedAt) notFound();

  const method = PAYMENT_LABEL[sale.paymentMethod] ?? { ar: sale.paymentMethod, en: sale.paymentMethod };

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="max-w-sm mx-auto py-8 px-4 space-y-4">
        <div className="no-print flex items-center justify-between">
          <Link href="/pos" className="btn-ghost inline-flex">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة" : "Back"}
          </Link>
        </div>

        <div className="card card-pad space-y-3" style={{ fontFamily: "monospace" }}>
          <div className="text-center space-y-1">
            <p className="font-bold text-lg">{sale.session.treasury.name}</p>
            <p className="text-sm">{formatDate(sale.createdAt, ar ? "ar" : "en")}</p>
          </div>

          <div className="border-t border-b py-2" style={{ borderColor: "var(--line)" }}>
            {sale.lines.map((l) => (
              <div key={l.id} className="flex justify-between text-sm">
                <span>
                  {l.product.name} x{Number(l.quantity)}
                </span>
                <span>{formatMoney(Number(l.lineTotal))}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{ar ? "الإجمالي الفرعي" : "Subtotal"}</span>
              <span>{formatMoney(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discountTotal) > 0 ? (
              <div className="flex justify-between">
                <span>{ar ? "خصم" : "Discount"}</span>
                <span>-{formatMoney(Number(sale.discountTotal))}</span>
              </div>
            ) : null}
            {Number(sale.taxTotal) > 0 ? (
              <div className="flex justify-between">
                <span>{ar ? "ضريبة" : "Tax"}</span>
                <span>{formatMoney(Number(sale.taxTotal))}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: "var(--line)" }}>
              <span>{ar ? "الإجمالي" : "Total"}</span>
              <span>{formatMoney(Number(sale.total))}</span>
            </div>
          </div>

          <div className="text-center text-sm" style={{ color: "var(--ink-muted)" }}>
            <p>{sale.saleNumber}</p>
            <p>{ar ? method.ar : method.en}</p>
            {sale.status === "VOID" ? <p className="font-bold" style={{ color: "#b91c1c" }}>{ar ? "ملغاة" : "VOID"}</p> : null}
          </div>
        </div>

        <PrintButton ar={ar} />
      </div>
    </div>
  );
}
