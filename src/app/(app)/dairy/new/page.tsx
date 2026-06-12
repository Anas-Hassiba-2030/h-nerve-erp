import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createBatch } from "../actions";
import { BatchForm } from "../BatchForm";
import "../../daylight.css";

export default async function NewBatchPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["DAIRY", "AGRICULTURE", "INVESTMENT"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  });

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="الصناعات الغذائية"
        title="دفعة إنتاج جديدة"
        subtitle="تسجيل دفعة طازجة من خط إنتاج المها."
      />
      <div className="flex-1 p-6">
        <BatchForm action={createBatch} companies={companies} />
      </div>
    </DaylightShell>
  );
}
