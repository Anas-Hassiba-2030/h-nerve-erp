import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { CustomerForm } from "../../CustomerForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.deletedAt) notFound();

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "تعديل العميل" : "Edit customer"}</h1>
        <CustomerForm ar={ar} defaults={customer} />
      </div>
    </div>
  );
}
