import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { SupplierForm } from "../../SupplierForm";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.deletedAt) notFound();

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "تعديل المورّد" : "Edit supplier"}</h1>
        <SupplierForm ar={ar} defaults={supplier} />
      </div>
    </div>
  );
}
