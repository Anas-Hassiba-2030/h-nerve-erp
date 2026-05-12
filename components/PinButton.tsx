"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";

// Toggle button — calls /api/pins/toggle on click.
// Optimistic UI: state flips immediately, reverts on failure.

type Tone = "default" | "compact" | "icon-only";

export function PinButton({
  entityType,
  entityId,
  label,
  labelEn,
  href,
  icon,
  initial = false,
  tone = "default",
  locale = "ar",
}: {
  entityType: string;
  entityId: string;
  label: string;
  labelEn?: string;
  href: string;
  icon?: string;
  initial?: boolean;
  tone?: Tone;
  locale?: "ar" | "en";
}) {
  const [pinned, setPinned] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ar = locale === "ar";

  async function handle() {
    const next = !pinned;
    setPinned(next); // optimistic
    try {
      const res = await fetch("/api/pins/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType, entityId, label, labelEn, href, icon,
        }),
      });
      if (!res.ok) throw new Error("toggle failed");
      const data = await res.json();
      setPinned(Boolean(data.pinned));
      // Refresh server components so any /pinned page or sidebar widget
      // shows the updated set on next render.
      startTransition(() => router.refresh());
    } catch {
      // revert
      setPinned(!next);
    }
  }

  const Icon = pinned ? Pin : PinOff;

  if (tone === "icon-only") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        title={pinned ? (ar ? "إزالة من المفضلة" : "Unpin") : (ar ? "إضافة للمفضلة" : "Pin")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:scale-110"
        style={{
          color: pinned ? "var(--brand)" : "var(--text-muted)",
          background: pinned ? "var(--brand-soft)" : "transparent",
          border: `1px solid ${pinned ? "var(--brand)" : "var(--border)"}`,
        }}
      >
        <Icon className={`h-3.5 w-3.5 ${pinned ? "anim-pop" : ""}`} fill={pinned ? "currentColor" : "none"} />
      </button>
    );
  }

  if (tone === "compact") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition"
        style={{
          color: pinned ? "var(--brand)" : "var(--text-muted)",
          background: pinned ? "var(--brand-soft)" : "transparent",
          border: `1px solid ${pinned ? "var(--brand)" : "var(--border)"}`,
        }}
      >
        <Icon className="h-3 w-3" fill={pinned ? "currentColor" : "none"} />
        {pinned ? (ar ? "مثبت" : "Pinned") : (ar ? "تثبيت" : "Pin")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="btn-secondary"
      style={
        pinned
          ? {
              background: "var(--brand-soft)",
              color: "var(--brand)",
              borderColor: "var(--brand)",
            }
          : undefined
      }
    >
      <Icon className={`h-4 w-4 ${pinned ? "anim-pop" : ""}`} fill={pinned ? "currentColor" : "none"} />
      {pinned ? (ar ? "مثبت في المفضلة" : "Pinned") : (ar ? "تثبيت في المفضلة" : "Pin")}
    </button>
  );
}
