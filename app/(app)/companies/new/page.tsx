import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { CompanyForm } from "../CompanyForm";
import { createCompany } from "../actions";
import "../../daylight.css";

export default function NewCompanyPage() {
  return (
    <DaylightShell>
      <DaylightHeader
        eyebrow="السجل القابض"
        title="إضافة شركة جديدة"
        subtitle="سجل وحدة أعمال جديدة تحت مظلة مجموعة الحوراني."
      />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <CompanyForm action={createCompany} submitLabel="حفظ الشركة" />
        </div>
      </div>
    </DaylightShell>
  );
}
