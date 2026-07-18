import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPortalCustomer } from "@/lib/auth/portalSession";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../../(app)/daylight.css";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ar = (await getLocale()) === "ar";
  const customer = await getCurrentPortalCustomer();
  if (!customer) redirect("/portal/login");

  return (
    <div className="dl-page min-h-screen" dir={ar ? "rtl" : "ltr"}>
      <header className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/portal" className="font-bold">
            {ar ? "بوابة العميل" : "Client Portal"}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "var(--ink-muted)" }}>{customer.customerName}</span>
            <Link href="/portal/logout" className="btn-ghost text-sm">
              {ar ? "خروج" : "Sign out"}
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
