import { Topbar } from "@/components/Topbar";
import { prisma } from "@/lib/db";
import { createHotel } from "../actions";
import { HotelForm } from "../HotelForm";

export default async function NewHotelPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["HOSPITALITY", "INVESTMENT"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <Topbar
        eyebrow="الضيافة والفنادق"
        title="إضافة فندق جديد"
        subtitle="عقّد عقاراً جديداً تحت ذراع الضيافة في المجموعة."
      />
      <div className="flex-1 p-6">
        <HotelForm action={createHotel} companies={companies} />
      </div>
    </>
  );
}
