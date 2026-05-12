// app/m/ — Mobile-first operations view.
//
// A separate route group from (app)/ — no sidebar, no desktop chrome.
// Calm Clinical aesthetic per docs/DESIGN-SKILL.md §1.E. Phase 14 of
// docs/PHASES-INTELLIGENCE.md.

import { redirect } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "H-Nerve — اليوم",
  description: "ثلاثة لتعرف، ثلاثة لتقرّر، ثلاثة لتقرّ.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fbfaf7",
  viewportFit: "cover",
};

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?to=/m");

  const locale = getLocale();

  return (
    <div
      className="m-shell"
      data-locale={locale}
      // Calm Clinical inline tokens — overrides the Heritage palette only on
      // the mobile route. Cleared on navigation back to (app)/.
      style={
        {
          // warm white, charcoal text, soft tints
          ["--m-bg" as any]: "#fbfaf7",
          ["--m-bg-2" as any]: "#f4f2ec",
          ["--m-ink" as any]: "#1a1a1a",
          ["--m-ink-2" as any]: "#5b5b5b",
          ["--m-ink-3" as any]: "#8a8a86",
          ["--m-rule" as any]: "#e8e5dd",
          ["--m-rule-2" as any]: "#d6d2c6",
          ["--m-sage" as any]: "#a8b89a",
          ["--m-sage-soft" as any]: "#e3eadc",
          ["--m-sky" as any]: "#9bb2c4",
          ["--m-sky-soft" as any]: "#dde7ee",
          ["--m-blush" as any]: "#cf9d9d",
          ["--m-blush-soft" as any]: "#f1dede",
          ["--m-ochre" as any]: "#c89b3c",
          ["--m-ochre-soft" as any]: "#f3e5c4",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
