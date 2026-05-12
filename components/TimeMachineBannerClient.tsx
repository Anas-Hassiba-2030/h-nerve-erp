// components/TimeMachineBannerClient.tsx
//
// Tiny client island for the banner's "exit travel" button. Kept apart
// from the server component so the banner stays a pure server render.

"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { clearAsOf } from "@/app/actions/timemachine";

export function ClearTravelButton({ ar }: { ar: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="tm-banner-clear"
      onClick={() => startTransition(() => clearAsOf())}
      disabled={pending}
      aria-label={ar ? "ارجع للحاضر" : "Exit time travel"}
    >
      <X className="h-3.5 w-3.5" strokeWidth={2} />
      <span>{ar ? "ارجع للآن" : "EXIT"}</span>
    </button>
  );
}
