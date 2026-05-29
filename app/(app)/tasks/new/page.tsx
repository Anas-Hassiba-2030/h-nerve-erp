import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { createTask } from "../actions";

export default async function NewTaskPage() {
  const ar = getLocale() === "ar";
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <Topbar
        eyebrow={ar ? "المهام" : "Tasks"}
        title={ar ? "مهمة جديدة" : "New task"}
        subtitle={ar ? "المهام الجانبية تمنح ضعف النقاط (1.5x)." : "Side tasks earn 1.5x points."}
      />
      <div className="flex-1 p-6">
        <form action={createTask} className="card card-pad mx-auto max-w-2xl space-y-5">
          <div>
            <label className="label" htmlFor="title">{ar ? "العنوان" : "Title"}</label>
            <input id="title" name="title" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">{ar ? "الوصف" : "Description"}</label>
            <textarea id="description" name="description" rows={3} className="textarea" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="kind">{ar ? "النوع" : "Kind"}</label>
              <select id="kind" name="kind" defaultValue="CORE" className="select">
                <option value="CORE">{ar ? "أساسية" : "Core"}</option>
                <option value="SIDE">{ar ? "جانبية (1.5x)" : "Side (1.5x)"}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="priority">{ar ? "الأولوية" : "Priority"}</label>
              <select id="priority" name="priority" defaultValue="MEDIUM" className="select">
                <option value="LOW">{ar ? "منخفضة" : "Low"}</option>
                <option value="MEDIUM">{ar ? "متوسطة" : "Medium"}</option>
                <option value="HIGH">{ar ? "عالية" : "High"}</option>
                <option value="URGENT">{ar ? "عاجل" : "Urgent"}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="module">{ar ? "الوحدة" : "Module"}</label>
              <select id="module" name="module" defaultValue="GENERAL" className="select">
                <option value="GENERAL">{ar ? "عامة" : "General"}</option>
                <option value="HOTELS">{ar ? "الفنادق" : "Hotels"}</option>
                <option value="DAIRY">{ar ? "الألبان" : "Dairy"}</option>
                <option value="FARMS">{ar ? "المزارع" : "Farms"}</option>
                <option value="SUPPLY">{ar ? "سلسلة التوريد" : "Supply"}</option>
                <option value="FINANCE">{ar ? "المالية" : "Finance"}</option>
                <option value="PROJECTS">{ar ? "المشاريع" : "Projects"}</option>
                <option value="SUSTAINABILITY">{ar ? "الاستدامة" : "Sustainability"}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="points">{ar ? "النقاط" : "Points"}</label>
              <input id="points" name="points" type="number" min={1} defaultValue={15} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dueAt">{ar ? "موعد الاستحقاق" : "Due date"}</label>
              <input id="dueAt" name="dueAt" type="date" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="assigneeId">{ar ? "المسؤول" : "Assignee"}</label>
              <select id="assigneeId" name="assigneeId" className="select" defaultValue="">
                <option value="">{ar ? "أنا" : "Me"}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--heri-rule)" }}>
            <Link href="/tasks" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> {ar ? "العودة" : "Back"}</Link>
            <button type="submit" className="btn-primary"><Save className="h-4 w-4" /> {ar ? "حفظ" : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
