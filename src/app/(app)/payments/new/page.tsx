import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { PaymentForm } from "../PaymentForm";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>;
}) {
  const { customerId, invoiceId } = await searchParams;
  const locale = await getLocale();
  const ar = locale === "ar";

  const [customers, treasuries, invoices] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500 }),
    prisma.treasury.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.invoice.findMany({
      where: { deletedAt: null, status: { in: ["UNPAID", "PARTIAL", "DUE", "OVERDUE"] } },
      orderBy: { issueDate: "desc" },
      include: { payments: { select: { amount: true } } },
      take: 500,
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "دفعة جديدة" : "New payment"}</h1>
        <PaymentForm
          ar={ar}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          treasuries={treasuries.map((t) => ({ id: t.id, name: t.name, currency: t.currency }))}
          invoices={invoices.map((i) => ({
            id: i.id,
            customerId: i.customerId,
            invoiceNumber: i.invoiceNumber,
            total: Number(i.total),
            paid: i.payments.reduce((sum, p) => sum + Number(p.amount), 0),
            currency: i.currency,
          }))}
          defaultCustomerId={customerId}
          defaultInvoiceId={invoiceId}
        />
      </div>
    </div>
  );
}
