"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFormState } from "react-dom";
import { Field, SubmitButton, FormErrorBanner } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/utils/formState";

type CompanyOption = { id: string; name: string };

export function ProjectForm({
  action,
  companies,
  ar,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  companies: CompanyOption[];
  ar: boolean;
}) {
  const [state, formAction] = useFormState(action, initialFormState);
  const errs = state.errors ?? {};

  return (
    <form
      action={formAction}
      className="card card-pad mx-auto max-w-3xl space-y-5"
      noValidate
    >
      <FormErrorBanner message={state.formError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="companyId"
          label={ar ? "الشركة المالكة" : "Owning company"}
          required
          error={errs.companyId}
          className="sm:col-span-2"
        >
          <select className="select" defaultValue="">
            <option value="" disabled>
              {ar ? "اختر" : "Select"}
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          name="title"
          label={ar ? "العنوان" : "Title"}
          required
          error={errs.title}
          className="sm:col-span-2"
        >
          <input
            className="input"
            placeholder={ar ? "مثل: أرينا سبيس العقبة" : "e.g. Arena Space Aqaba"}
          />
        </Field>

        <Field
          name="description"
          label={ar ? "الوصف" : "Description"}
          error={errs.description}
          className="sm:col-span-2"
        >
          <textarea rows={3} className="textarea" />
        </Field>

        <Field name="stage" label={ar ? "المرحلة" : "Stage"} error={errs.stage}>
          <select defaultValue="IDEA" className="select">
            <option value="IDEA">{ar ? "فكرة" : "Idea"}</option>
            <option value="RESEARCH">{ar ? "أبحاث" : "Research"}</option>
            <option value="PLANNED">{ar ? "مخطط" : "Planned"}</option>
            <option value="APPROVED">{ar ? "معتمد" : "Approved"}</option>
            <option value="IN_PROGRESS">{ar ? "قيد التنفيذ" : "In progress"}</option>
            <option value="ON_HOLD">{ar ? "معلّق" : "On hold"}</option>
            <option value="DONE">{ar ? "مكتمل" : "Done"}</option>
          </select>
        </Field>

        <Field
          name="priority"
          label={ar ? "الأولوية" : "Priority"}
          error={errs.priority}
        >
          <select defaultValue="MEDIUM" className="select">
            <option value="LOW">{ar ? "منخفضة" : "Low"}</option>
            <option value="MEDIUM">{ar ? "متوسطة" : "Medium"}</option>
            <option value="HIGH">{ar ? "عالية" : "High"}</option>
            <option value="URGENT">{ar ? "عاجل" : "Urgent"}</option>
          </select>
        </Field>

        <Field
          name="budgetJod"
          label={ar ? "الميزانية (د.أ)" : "Budget (JOD)"}
          error={errs.budgetJod}
        >
          <input
            type="number"
            min={0}
            step={1000}
            defaultValue={100000}
            className="input"
          />
        </Field>

        <Field
          name="progressPct"
          label={ar ? "نسبة الإنجاز ٪" : "Progress %"}
          error={errs.progressPct}
        >
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="input"
          />
        </Field>

        <Field
          name="startQuarter"
          label={ar ? "بداية" : "Start quarter"}
          error={errs.startQuarter}
        >
          <input className="input font-mono" placeholder="2026-Q3" />
        </Field>

        <Field
          name="targetQuarter"
          label={ar ? "هدف" : "Target quarter"}
          error={errs.targetQuarter}
        >
          <input className="input font-mono" placeholder="2027-Q2" />
        </Field>

        <Field
          name="ownerName"
          label={ar ? "المسؤول" : "Owner"}
          error={errs.ownerName}
          className="sm:col-span-2"
        >
          <input className="input" />
        </Field>

        <Field
          name="kpis"
          label="KPIs"
          error={errs.kpis}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            className="textarea"
            placeholder={ar ? "مؤشرات النجاح المتوقعة." : "Expected success metrics."}
          />
        </Field>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: "var(--line)" }}
      >
        <Link href="/projects" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> {ar ? "العودة" : "Back"}
        </Link>
        <SubmitButton
          label={ar ? "حفظ" : "Save"}
          pendingLabel={ar ? "جارٍ الحفظ…" : "Saving…"}
        />
      </div>
    </form>
  );
}
