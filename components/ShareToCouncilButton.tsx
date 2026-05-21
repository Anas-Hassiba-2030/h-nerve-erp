"use client";

// Phase V3-P5 — "Share to Council" button. Drop-in for any insight
// card. Native confirm() is the cheapest UX that satisfies the spec
// (server action immediately redirects to /brain/council on success).

import { MessageSquareShare } from "lucide-react";
import { shareInsightToCouncil } from "@/app/actions/council";

export function ShareToCouncilButton({
  insightId,
  title,
  body,
  ar,
  size = "sm",
}: {
  insightId?: string;
  title: string;
  body: string;
  ar: boolean;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? "px-3 py-1.5 text-[12px]" : "px-2 py-1 text-[11px]";
  return (
    <form
      action={shareInsightToCouncil}
      onSubmit={(e) => {
        const msg = ar
          ? "مشاركة هذه الرؤية مع المجلس؟ سيراها بقية المدراء في خيط نقاش."
          : "Share this insight to the Council? Other admins will see it in the Council thread.";
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      {insightId ? <input type="hidden" name="insightId" value={insightId} /> : null}
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 ${px} font-mono font-extrabold uppercase tracking-[0.18em] transition`}
        style={{
          border: "1px solid var(--heri-rule-strong, #b8a98c)",
          color: "var(--heri-ink, #1a1612)",
          background: "transparent",
          borderRadius: 0,
        }}
        title={ar ? "مشاركة مع المجلس" : "Share to Council"}
      >
        <MessageSquareShare className="h-3 w-3" strokeWidth={1.5} />
        {ar ? "للمجلس" : "Council"}
      </button>
    </form>
  );
}
