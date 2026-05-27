"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFormState } from "react-dom";
import { Field, SubmitButton, FormErrorBanner } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/formState";

type CompanyOption = { id: string; name: string };

export function BatchForm({
  action,
  companies,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  companies: CompanyOption[];
}) {
  const [state, formAction] = useFormState(action, initialFormState);
  const errs = state.errors ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const expiryDefault = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

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
          label="الشركة المنتجة"
          required
          error={errs.companyId}
          className="sm:col-span-2"
        >
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

        <Field name="product" label="الصنف" error={errs.product}>
          <select defaultValue="MILK" className="select">
            <option value="MILK">حليب</option>
            <option value="LABNEH">لبنة</option>
            <option value="YOGURT">زبادي</option>
            <option value="CHEESE">جبن</option>
            <option value="BUTTER">زبدة</option>
            <option value="CREAM">قشطة</option>
          </select>
        </Field>

        <Field
          name="productAr"
          label="الاسم التجاري"
          required
          error={errs.productAr}
        >
          <input className="input" placeholder="حليب طازج كامل الدسم" />
        </Field>

        <Field
          name="quantityLiters"
          label="الكمية (لتر)"
          required
          error={errs.quantityLiters}
        >
          <input
            type="number"
            min={0}
            step={50}
            defaultValue={2000}
            className="input"
          />
        </Field>

        <Field name="fatContent" label="نسبة الدسم (٪)" error={errs.fatContent}>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={3.5}
            className="input"
          />
        </Field>

        <Field name="qualityGrade" label="درجة الجودة" error={errs.qualityGrade}>
          <select defaultValue="A" className="select">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </Field>

        <Field name="status" label="الحالة" error={errs.status}>
          <select defaultValue="IN_PRODUCTION" className="select">
            <option value="IN_PRODUCTION">قيد الإنتاج</option>
            <option value="QC">ضبط جودة</option>
            <option value="READY">جاهز</option>
            <option value="DISTRIBUTED">تم التوزيع</option>
            <option value="RECALLED">مسحوب</option>
          </select>
        </Field>

        <Field
          name="productionDate"
          label="تاريخ الإنتاج"
          required
          error={errs.productionDate}
        >
          <input type="date" defaultValue={today} className="input" />
        </Field>

        <Field
          name="expiryDate"
          label="تاريخ انتهاء الصلاحية"
          required
          error={errs.expiryDate}
        >
          <input type="date" defaultValue={expiryDefault} className="input" />
        </Field>

        <Field
          name="destination"
          label="الوجهة"
          error={errs.destination}
          className="sm:col-span-2"
        >
          <input
            className="input"
            placeholder="أرينا سبيس عمّان / Retail Amman"
          />
        </Field>
      </div>

      <Field name="notes" label="ملاحظات" error={errs.notes}>
        <textarea rows={3} className="textarea" />
      </Field>

      <div
        className="flex items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: "var(--heri-rule)" }}
      >
        <Link href="/dairy" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> العودة
        </Link>
        <SubmitButton label="حفظ الدفعة" pendingLabel="جارٍ الحفظ…" />
      </div>
    </form>
  );
}
