import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { createTreasury } from "../actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function NewTreasuryPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-md mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "خزينة جديدة" : "New treasury"}</h1>
        <form action={createTreasury} className="card card-pad space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "الاسم" : "Name"} *</label>
            <input name="name" className="input" required maxLength={120} placeholder={ar ? "الصندوق الرئيسي" : "Main cash box"} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "النوع" : "Type"}</label>
            <select name="type" defaultValue="CASH" className="select">
              <option value="CASH">{ar ? "نقدي" : "Cash"}</option>
              <option value="BANK">{ar ? "بنكي" : "Bank"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "العملة" : "Currency"}</label>
            <input name="currency" defaultValue="JOD" className="input font-mono uppercase" maxLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{ar ? "رمز الحساب المحاسبي" : "Ledger account code"} *</label>
            <input name="accountCode" className="input font-mono" required maxLength={20} placeholder="1000" />
            <p className="mt-1" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              {ar ? "يُنشأ حساب أصول جديد بهذا الرمز تلقائياً." : "A new ASSET ledger account is created with this code automatically."}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <Link href="/treasuries" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              {ar ? "العودة" : "Back"}
            </Link>
            <button type="submit" className="btn btn-primary">
              {ar ? "إضافة خزينة" : "Add treasury"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
