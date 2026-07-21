import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { BomForm } from "../../BomForm";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

export default async function NewBomPage() {
  const ar = (await getLocale()) === "ar";
  const session = await getCurrentUser();
  if (!hasRole(session, "MANAGER")) redirect("/manufacturing/boms");

  const [products, workCenters] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
      take: 500,
    }),
    prisma.workCenter.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, code: true },
      take: 200,
    }),
  ]);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-xl font-bold">{ar ? "قائمة مواد جديدة" : "New bill of materials"}</h1>
        <BomForm ar={ar} products={products} workCenters={workCenters} />
      </div>
    </div>
  );
}
