"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Sparkles, AlertTriangle, Lightbulb, Info, X } from "lucide-react";

export type NotifItem = {
  id: string;
  module: string;
  severity: "INFO" | "WARN" | "CRITICAL" | "OPPORTUNITY";
  title: string;
  body: string;
  createdAt: string | Date;
};

const SEV_TONE: Record<string, string> = {
  INFO: "bg-blue-50 text-blue-700 ring-blue-100",
  WARN: "bg-amber-50 text-amber-700 ring-amber-100",
  CRITICAL: "bg-red-50 text-red-700 ring-red-100",
  OPPORTUNITY: "bg-amber-50 text-amber-700 ring-amber-100",
};

function iconFor(sev: string) {
  if (sev === "CRITICAL" || sev === "WARN") return AlertTriangle;
  if (sev === "OPPORTUNITY") return Lightbulb;
  return Info;
}

export function NotificationPanel({
  items,
  count,
  locale,
}: {
  items: NotifItem[];
  count: number;
  locale: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative hidden items-center justify-center rounded-xl p-2 transition hover:scale-110 md:inline-flex"
        style={{
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
        }}
        aria-label={ar ? "الإشعارات" : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black anim-pop"
            style={{
              background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
              color: "white",
              boxShadow: "0 0 0 2px var(--surface-elevated)",
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute end-0 z-50 mt-2 w-[min(96vw,420px)] overflow-hidden rounded-2xl shadow-glow anim-fade-up"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3"
                 style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "var(--brand)" }} />
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    {ar ? "إشارات H‑Nerve" : "H‑Nerve Insights"}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {ar ? `${count} مفتوحة` : `${count} open`}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1" aria-label="close">
                <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <div className="max-h-[60vh] divide-y overflow-y-auto" style={{ borderColor: "var(--border)" }}>
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {ar ? "لا توجد إشارات حالياً." : "No insights right now."}
                </div>
              ) : items.map((it) => {
                const Icon = iconFor(it.severity);
                return (
                  <Link
                    key={it.id}
                    href="/insights"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-[var(--brand-soft)]"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${SEV_TONE[it.severity]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                        {it.title}
                      </div>
                      <div className="line-clamp-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {it.body}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span className="rounded-full px-2 py-0.5" style={{ background: "color-mix(in srgb, var(--text-muted) 14%, transparent)" }}>
                          {it.module}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="px-4 py-2" style={{ borderTop: "1px solid var(--border)" }}>
              <Link
                href="/insights"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-bold"
                style={{ color: "var(--brand)" }}
              >
                {ar ? "عرض كل الإشارات ←" : "View all insights ←"}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
