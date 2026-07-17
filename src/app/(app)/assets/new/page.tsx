import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { createFixedAsset } from "../actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "أصل ثابت جديد" : "New fixed asset"}</h1>
        <form action={createFixedAsset} className="card card-pad space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "اسم الأصل" : "Asset name"} *</label>
            <input name="name" className="input" required maxLength={160} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "الفئة" : "Category"}</label>
              <input
                name="category"
                className="input"
                maxLength={80}
                placeholder={ar ? "معدات، مركبات، مبانٍ…" : "Equipment, vehicles, buildings…"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "تاريخ الشراء" : "Purchase date"}</label>
              <input type="date" name="purchaseDate" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "تكلفة الشراء" : "Purchase cost"} *</label>
              <input type="number" name="purchaseCost" min={0} step="0.01" className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "القيمة المتبقية" : "Salvage value"}</label>
              <input type="number" name="salvageValue" min={0} step="0.01" className="input" defaultValue={0} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "العمر الإنتاجي (بالأشهر)" : "Useful life (months)"} *</label>
              <input type="number" name="usefulLifeMonths" min={1} max={1200} step={1} className="input" required defaultValue={60} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "ملاحظة" : "Note"}</label>
            <textarea name="note" rows={2} className="textarea" />
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            {ar
              ? "طريقة الإهلاك: القسط الثابت — (التكلفة − القيمة المتبقية) ÷ العمر بالأشهر. يُسجّل قيد الشراء تلقائياً (أصول ثابتة / ذمم دائنة)."
              : "Depreciation method: straight-line — (cost − salvage) ÷ life in months. The acquisition journal (Fixed Assets / Accounts Payable) posts automatically."}
          </p>
          <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <Link href="/assets" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "العودة" : "Back"}
            </Link>
            <button type="submit" className="btn btn-primary">
              {ar ? "إنشاء الأصل" : "Create asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
