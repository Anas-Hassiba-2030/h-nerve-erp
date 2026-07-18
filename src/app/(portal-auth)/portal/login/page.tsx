import { getLocale } from "@/lib/i18n/i18n.server";
import { portalLogin } from "./actions";
import "../../../(app)/daylight.css";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const ar = (await getLocale()) === "ar";

  return (
    <div className="dl-page min-h-screen flex items-center justify-center" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="card card-pad space-y-5">
          <div>
            <h1 className="text-xl font-bold">{ar ? "بوابة العميل" : "Client Portal"}</h1>
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              {ar ? "اطّلع على فواتيرك وحالة حسابك" : "View your invoices and account balance"}
            </p>
          </div>
          <form action={portalLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "البريد الإلكتروني" : "Email"}</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "كلمة المرور" : "Password"}</label>
              <input name="password" type="password" required className="input" />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              {ar ? "دخول" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
