import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { PurchaseInvoiceForm } from "../PurchaseInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewPurchaseInvoicePage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const [suppliers, taxRates] = await Promise.all([
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500 }),
    prisma.taxRate.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 100 }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "فاتورة مشتريات جديدة" : "New purchase invoice"}</h1>
        <PurchaseInvoiceForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          taxRates={taxRates.map((r) => ({ id: r.id, name: r.name, rate: Number(r.rate) }))}
          ar={ar}
        />
      </div>
    </div>
  );
}
