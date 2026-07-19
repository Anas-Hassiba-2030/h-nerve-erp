// /admin/suppliers → permanent redirect to the canonical /suppliers.
//
// There were TWO supplier surfaces: this legacy admin-family CRUD page and
// the richer /suppliers registry (detail [id] + /new + payment terms), which
// the Sidebar and the Operations console (admin/page.tsx) already treat as the
// single home. Per the "one home per thing" doctrine we collapsed the dup:
// /suppliers is canonical; this route just forwards so old bookmarks/search
// deep-links keep resolving. Its former Forms/actions were removed.
import { redirect } from "next/navigation";

export default function LegacyAdminSuppliersRedirect() {
  redirect("/suppliers");
}
