import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { OrderForm } from "../OrderForm";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  if (!hasRole(session, "MANAGER")) redirect("/manufacturing");

  const boms = await prisma.billOfMaterials.findMany({
    where: { deletedAt: null, active: true },
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-xl font-bold">{ar ? "أمر تصنيع جديد" : "New manufacturing order"}</h1>
        <OrderForm
          ar={ar}
          boms={boms.map((b) => ({
            id: b.id,
            bomNumber: b.bomNumber,
            name: b.name,
            outputQty: b.outputQty,
            productName: b.product.name,
          }))}
        />
      </div>
    </div>
  );
}
