// ViewAsBanner — fixed top banner shown to a superadmin who's "viewing
// as" a tenant. Lets them exit back to their own org's view.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import { Eye } from "lucide-react";
import { clearViewAs } from "@/app/(admin)/admin/tenants/actions";

export function ViewAsBanner({
  tenantName,
  tenantSlug,
  themeName,
  locale,
}: {
  tenantName: string;
  tenantSlug: string;
  themeName: string;
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <div className="view-as-banner" role="status">
      <div className="view-as-banner-inner">
        <span className="view-as-banner-icon">
          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="view-as-banner-text">
          <span className="view-as-banner-key">{ar ? "معاينة" : "PREVIEWING"}</span>
          <span>
            {tenantName} <code>· {tenantSlug}.h-nerve.io</code> · {themeName}
          </span>
        </span>
        <form action={clearViewAs}>
          <button type="submit" className="view-as-banner-exit">
            {ar ? "خروج من المعاينة" : "Exit preview"}
          </button>
        </form>
      </div>
    </div>
  );
}
