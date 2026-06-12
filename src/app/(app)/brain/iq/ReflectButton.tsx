"use client";

// Reflect control — ports the brainiq-ops.js "thinking" affordance.
// The real mutation is the reflectNow server action (it runs a fresh
// meta-reflection then redirects to the new report). While the form is
// submitting we surface the reference's .br-thinking indicator.

import { useFormStatus } from "react-dom";
import { reflectNow } from "./actions";

function Submit({ ar }: { ar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="br-btn br-btn-primary" disabled={pending}>
        ✦ {ar ? "تأمّل الآن" : "Reflect now"}
      </button>
      {pending ? (
        <span className="br-thinking">
          {ar ? "يتأمّل الدماغ" : "The brain is reflecting"}
          <span className="dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </span>
      ) : null}
    </>
  );
}

export function ReflectButton({ ar }: { ar: boolean }) {
  return (
    <form action={reflectNow} className="br-controls">
      <Submit ar={ar} />
    </form>
  );
}
