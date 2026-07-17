import { getLocale } from "@/lib/i18n/i18n.server";
import { CustomerForm } from "../CustomerForm";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">{ar ? "عميل جديد" : "New customer"}</h1>
        <CustomerForm ar={ar} />
      </div>
    </div>
  );
}
