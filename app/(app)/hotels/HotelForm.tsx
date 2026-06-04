"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFormState } from "react-dom";
import { Field, SubmitButton, FormErrorBanner } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/utils/formState";

type CompanyOption = { id: string; name: string };

export function HotelForm({
  action,
  companies,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  companies: CompanyOption[];
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
        <Field name="companyId" label="الشركة المالكة" required error={errs.companyId}>
          <select className="select" defaultValue="">
            <option value="" disabled>
              اختر شركة
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field name="tier" label="الفئة" error={errs.tier}>
          <select defaultValue="BUSINESS" className="select">
            <option value="LUXURY">فاخر</option>
            <option value="BUSINESS">أعمال</option>
            <option value="RESORT">منتجع</option>
            <option value="BOUTIQUE">بوتيك</option>
          </select>
        </Field>

        <Field name="name" label="الاسم العربي" required error={errs.name}>
          <input className="input" placeholder="أرينا سبيس عمّان" />
        </Field>

        <Field
          name="nameEn"
          label="English name (اختياري)"
          error={errs.nameEn}
        >
          <input className="input" placeholder="Arena Space Amman" dir="ltr" />
        </Field>

        <Field name="city" label="المدينة" required error={errs.city}>
          <input className="input" placeholder="عمّان" />
        </Field>

        <Field name="country" label="الدولة (ISO-2)" error={errs.country}>
          <input
            defaultValue="JO"
            maxLength={2}
            className="input font-mono uppercase"
          />
        </Field>

        <Field name="totalRooms" label="عدد الغرف" required error={errs.totalRooms}>
          <input type="number" min={1} defaultValue={120} className="input" />
        </Field>

        <Field name="starRating" label="التقييم" error={errs.starRating}>
          <select defaultValue={4} className="select">
            {[3, 4, 5].map((s) => (
              <option key={s} value={s}>
                {s} نجوم
              </option>
            ))}
          </select>
        </Field>

        <Field
          name="baselineADR"
          label="السعر اليومي المرجعي (د.أ)"
          error={errs.baselineADR}
        >
          <input
            type="number"
            min={0}
            step={5}
            defaultValue={150}
            className="input"
          />
        </Field>
      </div>

      <Field name="description" label="الوصف" error={errs.description}>
        <textarea
          rows={3}
          className="textarea"
          placeholder="موقع العقار، شريحة الضيوف المستهدفة، وما يميّزه."
        />
      </Field>

      <div
        className="flex items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: "var(--line)" }}
      >
        <Link href="/hotels" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> العودة
        </Link>
        <SubmitButton label="حفظ الفندق" pendingLabel="جارٍ الحفظ…" />
      </div>
    </form>
  );
}
