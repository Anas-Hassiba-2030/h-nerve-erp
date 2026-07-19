// /admin/customers → permanent redirect to the canonical /customers.
//
// There were TWO customer surfaces: this legacy admin-family CRUD page and
// the richer /customers registry (detail [id] + /new + customer portal), which
// the Sidebar and the Operations console (admin/page.tsx) already treat as the
// single home. Per the "one home per thing" doctrine we collapsed the dup:
// /customers is canonical; this route just forwards so old bookmarks/search
// deep-links keep resolving. Its former Forms/actions were removed.
import { redirect } from "next/navigation";

export default function LegacyAdminCustomersRedirect() {
  redirect("/customers");
}
