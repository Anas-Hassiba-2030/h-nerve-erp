// WorkspaceBanner — fixed top banner shown while a company workspace is
// active. Lets the user step back out to the full group view. Reuses the
// existing .view-as-banner styles for design consistency (no new CSS).
//
// Phase C of docs/PRODUCTION-ROADMAP.md.

import { LayoutGrid } from "lucide-react";
import { exitWorkspace } from "@/app/actions/workspace";

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
