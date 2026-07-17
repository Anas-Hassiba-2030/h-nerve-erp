import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { SupplierPaymentForm } from "../SupplierPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; purchaseInvoiceId?: string }>;
}) {
  const { supplierId, purchaseInvoiceId } = await searchParams;
  const locale = await getLocale();
  const ar = locale === "ar";

  const [suppliers, treasuries, purchaseInvoices] = await Promise.all([
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500 }),
    prisma.treasury.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.purchaseInvoice.findMany({
      where: { deletedAt: null, status: { in: ["UNPAID", "PARTIAL", "DUE", "OVERDUE"] } },
      orderBy: { issueDate: "desc" },
      include: { payments: { select: { amount: true } } },
      take: 500,
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "دفعة مورّد جديدة" : "New supplier payment"}</h1>
        <SupplierPaymentForm
          ar={ar}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          treasuries={treasuries.map((t) => ({ id: t.id, name: t.name, currency: t.currency }))}
          purchaseInvoices={purchaseInvoices.map((i) => ({
            id: i.id,
            supplierId: i.supplierId,
            purchaseInvoiceNumber: i.purchaseInvoiceNumber,
            total: Number(i.total),
            paid: i.payments.reduce((sum, p) => sum + Number(p.amount), 0),
            currency: i.currency,
          }))}
          defaultSupplierId={supplierId}
          defaultPurchaseInvoiceId={purchaseInvoiceId}
        />
      </div>
    </div>
  );
}
