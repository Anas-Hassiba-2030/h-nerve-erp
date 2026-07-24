import "./brain-readable.css";
import { getLocale } from "@/lib/i18n/i18n.server";
import { BrainBackLink } from "@/components/brain/BrainBackLink";

export default async function BrainLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const lc: "ar" | "en" = locale === "ar" ? "ar" : "en";

  return (
    <div>
      <div
        className="px-4 py-2"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <BrainBackLink locale={lc} />
      </div>
      {children}
    </div>
  );
}
