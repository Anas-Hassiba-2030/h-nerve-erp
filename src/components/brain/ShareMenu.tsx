"use client";

// Reusable "Share" control — the universal-sharing primitive. Drops onto any
// surface (insight card, plan, What-If scenario, dashboard metric). Opens a
// small popover with two paths:
//   • To Council  → shareToCouncil (a debatable subject)
//   • To member   → shareToMember (straight into a colleague's DM feed)
//
// Styled inline (no external CSS) so it renders correctly on both the cream
// Heritage surfaces and the dark brain/cosmic surfaces.

import { useEffect, useRef, useState } from "react";
import { Share2, MessageSquareShare, Send, X } from "lucide-react";
import { shareToCouncil, shareToMember } from "@/app/actions/share";

export type ShareTarget = { id: string; name: string };

export function ShareMenu({
  title,
  body,
  insightId,
  refType,
  refId,
  members,
  ar,
  label,
  tone = "auto",
}: {
  title: string;
  body: string;
  insightId?: string;
  refType?: string;
  refId?: string;
  members: ShareTarget[];
  ar: boolean;
  /** Optional override for the trigger label. */
  label?: string;
  /** "light" on cream surfaces, "dark" on cosmic; "auto" = neutral. */
  tone?: "light" | "dark" | "auto";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dark = tone === "dark";
  const panelBg = dark ? "rgba(13,31,26,.97)" : "#ffffff";
  const panelBorder = dark ? "1px solid rgba(194,163,90,.35)" : "1px solid var(--heri-rule-strong, #d8cdb6)";
  const ink = dark ? "#e9e3d4" : "var(--heri-ink, #1a1612)";
  const subInk = dark ? "rgba(220,195,138,.85)" : "#6b6459";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-extrabold uppercase tracking-[0.16em] transition"
        style={{
          border: panelBorder,
          color: dark ? "#dcc38a" : ink,
          background: "transparent",
          borderRadius: 0,
          cursor: "pointer",
        }}
        aria-expanded={open}
        title={ar ? "مشاركة" : "Share"}
      >
        <Share2 className="h-3 w-3" strokeWidth={1.6} />
        {label ?? (ar ? "مشاركة" : "Share")}
      </button>

      {open ? (
        <div
          dir={ar ? "rtl" : "ltr"}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineEnd: 0,
            zIndex: 50,
            minWidth: 240,
            background: panelBg,
            border: panelBorder,
            borderRadius: 10,
            boxShadow: "0 18px 44px -20px rgba(0,0,0,.55)",
            padding: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: subInk }}>
              {ar ? "مشاركة" : "Share"}
            </span>
            <button type="button" onClick={() => setOpen(false)} style={{ color: subInk, lineHeight: 0 }} aria-label="close">
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* To Council */}
          <form action={shareToCouncil}>
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="body" value={body} />
            {insightId ? <input type="hidden" name="insightId" value={insightId} /> : null}
            <button
              type="submit"
              className="w-full inline-flex items-center gap-2 px-2.5 py-2 text-[12px] font-bold transition"
              style={{ color: ink, background: "transparent", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              <MessageSquareShare className="h-4 w-4" strokeWidth={1.6} />
              {ar ? "إلى المجلس" : "To the Council"}
            </button>
          </form>

          <div style={{ height: 1, background: dark ? "rgba(194,163,90,.2)" : "var(--heri-rule, #e8e0cf)", margin: "6px 0" }} />

          {/* To member */}
          <form action={shareToMember} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="body" value={body} />
            {refType ? <input type="hidden" name="refType" value={refType} /> : null}
            {refId ? <input type="hidden" name="refId" value={refId} /> : null}
            <span style={{ fontSize: 11, fontWeight: 700, color: subInk, paddingInlineStart: 4 }}>
              {ar ? "إلى زميل" : "To a colleague"}
            </span>
            <select
              name="toUserId"
              defaultValue=""
              required
              style={{
                width: "100%", fontSize: 12.5, padding: "7px 8px", borderRadius: 8,
                border: panelBorder, background: dark ? "rgba(8,18,14,.7)" : "#faf8f2", color: ink,
              }}
            >
              <option value="" disabled>{ar ? "اختر زميلاً…" : "Pick a colleague…"}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-2.5 py-2 text-[12px] font-extrabold transition"
              style={{
                color: dark ? "#0d1f1a" : "#fff",
                background: dark ? "#dcc38a" : "var(--heri-ink, #1a1612)",
                border: "none", borderRadius: 8, cursor: "pointer",
              }}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
              {ar ? "أرسل إلى الزميل" : "Send to colleague"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
