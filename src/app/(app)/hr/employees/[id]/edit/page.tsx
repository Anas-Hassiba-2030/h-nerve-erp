import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { EmployeeForm } from "../../EmployeeForm";
import "../../../../daylight.css";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.deletedAt) notFound();

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "تعديل الموظف" : "Edit employee"}</h1>
        <EmployeeForm
          ar={ar}
          defaults={{
            id: employee.id,
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            department: employee.department,
            position: employee.position,
            baseSalary: Number(employee.baseSalary),
            note: employee.note,
          }}
        />
      </div>
    </div>
  );
}
