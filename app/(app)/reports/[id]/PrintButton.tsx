"use client";

import { Printer } from "lucide-react";

// Real client component: triggers window.print() via onClick. The previous
// inline version used <form action="javascript:window.print()"> inside a
// server component, which the app's CSP (form-action 'self', next.config.mjs)
// blocks — and browsers neutralize javascript: form actions anyway — so the
// button was dead. A plain button + onClick has no such problem.
export default function PrintButton({ ar }: { ar: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary btn-sm"
    >
      <Printer className="h-3 w-3" />
      {ar ? "طباعة / PDF" : "Print / PDF"}
    </button>
  );
}
