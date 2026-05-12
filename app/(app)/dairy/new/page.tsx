import { Topbar } from "@/components/Topbar";
import { prisma } from "@/lib/db";
import { createBatch } from "../actions";
import { BatchForm } from "../BatchForm";

export default async function NewBatchPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["DAIRY", "AGRICULTURE", "INVESTMENT"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <Topbar
        eyebrow="الصناعات الغذائية"
        title="دفعة إنتاج جديدة"
        subtitle="تسجيل دفعة طازجة من خط إنتاج المها."
      />
      <div className="flex-1 p-6">
        <BatchForm action={createBatch} companies={companies} />
      </div>
    </>
  );
}
