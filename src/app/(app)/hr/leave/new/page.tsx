import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { LeaveForm } from "../LeaveForm";
import "../../../daylight.css";

export const dynamic = "force-dynamic";

export default async function NewLeaveRequestPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: { not: "TERMINATED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "طلب إجازة جديد" : "New leave request"}</h1>
        <LeaveForm employees={employees} ar={ar} />
      </div>
    </div>
  );
}
