import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { createProject } from "../actions";
import { ProjectForm } from "../ProjectForm";
import "../../daylight.css";

export default async function NewProjectPage() {
  const ar = getLocale() === "ar";
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  });
  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المشاريع المستقبلية" : "Future Projects"}
        title={ar ? "مشروع مستقبلي جديد" : "New future project"}
        subtitle={
          ar
            ? "أضف بنداً إلى خط أنابيب الطموحات."
            : "Add an item to the ambition pipeline."
        }
      />
      <div className="flex-1 p-6">
        <ProjectForm action={createProject} companies={companies} ar={ar} />
      </div>
    </DaylightShell>
  );
}
