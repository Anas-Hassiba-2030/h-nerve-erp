import { notFound } from "next/navigation";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { CompanyForm } from "../../CompanyForm";
import { updateCompany } from "../../actions";
import { prisma } from "@/lib/db";
import "../../../daylight.css";

export default async function EditCompanyPage({ params }: { params: { id: string } }) {
  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) notFound();

  const action = updateCompany.bind(null, company.id);

  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="السجل القابض"
        title={`تعديل: ${company.name}`}
        subtitle={company.nameEn}
      />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <CompanyForm
            action={action}
            defaults={{
              code: company.code,
              name: company.name,
              nameEn: company.nameEn,
              sector: company.sector,
              country: company.country,
              city: company.city,
              foundedYear: company.foundedYear,
              employees: company.employees,
              status: company.status,
              description: company.description,
            }}
            submitLabel="حفظ التغييرات"
          />
        </div>
      </div>
    </DaylightShell>
  );
}
