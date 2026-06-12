"use client";

// Tiny clipboard copy button used in the Webhook panel. Client-only because
// navigator.clipboard is browser-side; everything else on the page is server.

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, ar, label }: { value: string; ar: boolean; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        } catch {
          /* clipboard blocked — silently no-op */
        }
      }}
      className="dl-btn dl-btn-secondary"
      aria-label={ar ? "نسخ" : "Copy"}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{ok ? (ar ? "تم النسخ" : "Copied") : label ?? (ar ? "نسخ" : "Copy")}</span>
    </button>
  );
}
