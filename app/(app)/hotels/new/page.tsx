import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { createHotel } from "../actions";
import { HotelForm } from "../HotelForm";
import "../../daylight.css";

export default async function NewHotelPage() {
  const companies = await prisma.company.findMany({
    where: { sector: { in: ["HOSPITALITY", "INVESTMENT"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  });

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="الضيافة والفنادق"
        title="إضافة فندق جديد"
        subtitle="عقّد عقاراً جديداً تحت ذراع الضيافة في المجموعة."
      />
      <div className="panel reveal">
        <HotelForm action={createHotel} companies={companies} />
      </div>
    </DaylightShell>
  );
}
