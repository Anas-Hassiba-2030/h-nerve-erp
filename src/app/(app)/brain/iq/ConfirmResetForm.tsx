"use client";

// Phase P4 — client wrapper around clearMetaHistory with a confirm
// dialog. Reset trajectory wipes the Brain IQ history; users should
// see explicit wording before committing.

import { Trash2 } from "lucide-react";
import { clearMetaHistory } from "./actions";

export function ConfirmResetForm({ ar }: { ar: boolean }) {
  return (
    <form
      action={clearMetaHistory}
      onSubmit={(e) => {
        const msg = ar
          ? "مسح كل سجل مسار ذكاء الدماغ. لن تتمكن من استعادة الرسوم البيانية التاريخية. متابعة؟"
          : "Clear the entire Brain IQ trajectory history. Historical charts cannot be recovered. Continue?";
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="br-btn danger"
        style={{ padding: "6px 12px", fontSize: 12 }}
      >
        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
        {ar ? "مسح المسار" : "Reset trajectory"}
      </button>
    </form>
  );
}
