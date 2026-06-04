"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";

// Drops on any detail page. Click → POSTs to /api/messages/discuss which
// finds-or-creates an ENTITY-anchored thread for this record, then routes
// the user to it. Officials converge on a single canonical thread per
// record rather than fragmenting into per-user side-threads.
//
// Pass the entity's display label so first-time creation gets a sensible
// thread title (e.g. "حليب وألبان لـ أرينا سبيس عمّان").
export function DiscussButton({
  entityType,
  entityId,
  label,
  variant = "secondary",
  size = "md",
}: {
  entityType: string;
  entityId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ar =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";

  function handle() {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/messages/discuss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType, entityId, label }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          threadId?: string;
        };
        if (res.ok && data.ok && data.threadId) {
          router.push(`/messages/${data.threadId}`);
          router.refresh();
        }
      } catch {
        // Silent fail — keeps the button reusable without a toast dep here.
        // The user can retry; the route handler is idempotent (find-or-create).
      }
    });
  }

  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "ghost"
      ? "btn-ghost"
      : "btn-secondary";
  const sizeCls = size === "sm" ? "btn-sm" : "";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${cls} ${sizeCls}`.trim()}
      title={ar ? "افتح نقاشاً عن هذا العنصر" : "Open a discussion about this item"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {ar ? "ناقش هذا" : "Discuss this"}
    </button>
  );
}
