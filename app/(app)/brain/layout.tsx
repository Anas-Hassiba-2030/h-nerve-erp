import Link from "next/link";
import { Play } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { BrainBackLink } from "@/components/brain/BrainBackLink";

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const lc: "ar" | "en" = locale === "ar" ? "ar" : "en";
  const ar = lc === "ar";

  return (
    <div>
      <div
        className="px-4 py-2"
        style={{
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <BrainBackLink locale={lc} />
        {/* The demo reel / pitch screen. Operators look for this exactly here in
            the brain header band; the green ▶ on the FabRail also reaches it. */}
        <Link
          href="/showcase"
          className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            textDecoration: "none",
            padding: "5px 12px",
            borderRadius: 999,
            background: "linear-gradient(135deg,#2E6B57,#C2A35A)",
            whiteSpace: "nowrap",
          }}
        >
          <Play className="h-3 w-3" strokeWidth={2} fill="currentColor" />
          <span>{ar ? "العرض التقديمي" : "Showcase / Pitch"}</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
