"use client";

// Phase P4 — client wrapper around rebuildBrainGraph that gates the
// click on window.confirm(). Server actions can be invoked from a
// client form's action attribute; the onSubmit handler is where we
// inject the confirm.

import { Brain } from "lucide-react";
import { rebuildBrainGraph } from "./actions";

export function ConfirmRebuildForm({ ar }: { ar: boolean }) {
  return (
    <form
      action={rebuildBrainGraph}
      onSubmit={(e) => {
        const msg = ar
          ? "إعادة بناء الرسم السببي من الصفر. الحواف المُتعلَّمة محفوظة. تستغرق ~30 ثانية. متابعة؟"
          : "Rebuild the causal graph from scratch. Learned edges are preserved. Takes ~30 seconds. Continue?";
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <button type="submit" className="br-btn br-btn-primary">
        <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
        {ar ? "إعادة بناء الدماغ" : "Rebuild brain"}
      </button>
    </form>
  );
}
