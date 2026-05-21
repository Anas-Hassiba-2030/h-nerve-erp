// WorkspaceBanner — Heritage-Modern strip identifying the active company
// workspace. Phase V3-P1 + P2: no fixed positioning, no animation, no
// layout shift. Renders inline as a static block at the top of the
// content area. Visibility is controlled by an EXPLICIT allowlist of
// route prefixes (below) — never an exclusion list. Adding a new
// tenant-scoped operational page? Add its prefix to SHOW_ON_PREFIXES.
//
// The layout passes `pathname` (sourced from middleware's x-pathname
// header) so the decision is server-side at SSR time. Cookie-driven
// content is resolved in the same pass — no client hydration mismatch.

import { LayoutGrid } from "lucide-react";
import { exitWorkspace } from "@/app/actions/workspace";

// SHOW the banner ONLY on these prefixes. Exact match OR descendant match.
// Every other route hides the banner unconditionally.
//
// Phase BUG-5 — /workspace REMOVED from this list because that route
// has its own ws-band header (the company command band rendered by
// workspace/layout.tsx) carrying the same "Exit to all companies"
// affordance. Showing both created the visible duplicate-header the
// user screenshot.
const SHOW_ON_PREFIXES = [
  "/dairy",
  "/hotels",
  "/farms",
  "/education",
  "/admin/products",
  "/admin/suppliers",
  "/admin/customers",
  "/admin/warehouses",
  "/admin/purchase-orders",
  "/admin/sales-orders",
  "/admin/inventory-movements",
  "/admin/movements",
  "/admin/transfers",
];

export function shouldShowWorkspaceBanner(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return SHOW_ON_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function WorkspaceBanner({
  companyName,
  locale,
}: {
  companyName: string;
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <div className="view-as-banner" role="status">
      <div className="view-as-banner-inner">
        <span className="view-as-banner-icon">
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="view-as-banner-text">
          <span className="view-as-banner-key">
            {ar ? "مساحة العمل" : "WORKSPACE"}
          </span>
          <span>{companyName}</span>
        </span>
        <form action={exitWorkspace}>
          <button type="submit" className="view-as-banner-exit">
            {ar ? "الخروج إلى كل الشركات" : "Exit to all companies"}
          </button>
        </form>
      </div>
    </div>
  );
}
