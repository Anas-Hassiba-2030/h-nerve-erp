"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BrainBackLink({ locale }: { locale: "ar" | "en" }) {
  const pathname = usePathname();
  const ar = locale === "ar";

  // Only show the back link on sub-pages, not on the hub itself
  if (pathname === "/brain") return null;

  return (
    <Link
      href="/brain"
      className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
      style={{ fontSize: 12, color: "var(--heri-ink-3)", textDecoration: "none" }}
    >
      {ar ? (
        <>
          <span>مركز الدماغ</span>
          <ArrowLeft className="h-3 w-3 rotate-180" strokeWidth={1.5} />
        </>
      ) : (
        <>
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          <span>Brain hub</span>
        </>
      )}
    </Link>
  );
}
