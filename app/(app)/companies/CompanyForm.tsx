"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { Field, SubmitButton, FormErrorBanner } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/formState";

type Company = {
  id?: string;
  code?: string;
  name?: string;
  nameEn?: string;
  sector?: string;
  country?: string;
  city?: string | null;
  foundedYear?: number | null;
  employees?: number;
  status?: string;
  description?: string | null;
};

const SECTORS = [
  ["HOSPITALITY", "ضيافة وفنادق"],
  ["DAIRY", "صناعات غذائية - ألبان"],
  ["AGRICULTURE", "زراعة وثروة حيوانية"],
  ["EDUCATION", "تعليم وأبحاث"],
  ["INVESTMENT", "استثمار قابض"],
  ["TRADE", "تجارة وتوزيع"],
] as const;

const STATUSES = [
  ["ACTIVE", "نشطة"],
  ["RAMPING", "في طور التوسع"],
  ["PAUSED", "متوقفة"],
] as const;

export function CompanyForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Company;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialFormState);
  const errs = state.errors ?? {};

  return (
    <form action={formAction} className="card card-pad space-y-5" noValidate>
      <FormErrorBanner message={state.formError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="code"
          label="الكود"
          required
          error={errs.code}
          help="معرّف داخلي قصير (2-12 حرف)."
        >
          <input
            defaultValue={defaults?.code ?? ""}
            className="input font-mono uppercase"
            placeholder="ARENA"
            maxLength={12}
          />
        </Field>

        <Field name="status" label="الحالة" error={errs.status}>
          <select defaultValue={defaults?.status ?? "ACTIVE"} className="select">
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field name="name" label="الاسم العربي" required error={errs.name}>
          <input
            defaultValue={defaults?.name ?? ""}
            className="input"
            placeholder="أرينا سبيس للضيافة"
          />
        </Field>

        <Field name="nameEn" label="English name" required error={errs.nameEn}>
          <input
            defaultValue={defaults?.nameEn ?? ""}
            className="input"
            placeholder="Arena Space Hospitality"
            dir="ltr"
          />
        </Field>

        <Field name="sector" label="القطاع" error={errs.sector}>
          <select
            defaultValue={defaults?.sector ?? "HOSPITALITY"}
            className="select"
          >
            {SECTORS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field name="country" label="الدولة (ISO-2)" error={errs.country}>
          <input
            defaultValue={defaults?.country ?? "JO"}
            className="input font-mono uppercase"
            maxLength={2}
          />
        </Field>

        <Field name="city" label="المدينة" error={errs.city}>
          <input
            defaultValue={defaults?.city ?? ""}
            className="input"
            placeholder="عمّان"
          />
        </Field>

        <Field name="foundedYear" label="سنة التأسيس" error={errs.foundedYear}>
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            defaultValue={defaults?.foundedYear ?? ""}
            className="input"
          />
        </Field>

        <Field name="employees" label="عدد الموظفين" error={errs.employees}>
          <input
            type="number"
            min={0}
            defaultValue={defaults?.employees ?? 0}
            className="input"
          />
        </Field>
      </div>

      <Field name="description" label="الوصف" error={errs.description}>
        <textarea
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className="textarea"
          placeholder="وصف مختصر يسلط الضوء على دور الشركة في المجموعة."
        />
      </Field>

      <div
        className="flex items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: "var(--line)" }}
      >
        <Link href="/companies" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          العودة
        </Link>
        <SubmitButton label={submitLabel} pendingLabel="جارٍ الحفظ…" />
      </div>
    </form>
  );
}
