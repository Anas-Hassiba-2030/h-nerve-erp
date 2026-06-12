// components/mobile/NarratorTicker.tsx
//
// One sentence. Fades in on mount. Sits below the greeting. After a
// pull-to-refresh the parent re-renders with a new key, and the line
// fades through. No spinner, no toast — just a calm sentence.

"use client";

import { useEffect, useState } from "react";

export function NarratorTicker({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "synced";
}) {
  // Mount key gives the CSS animation a fresh start each time the parent
  // remounts this component — e.g. after a soft-refresh in PullToRefresh.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <p className={`m-narrator ${mounted ? "is-in" : ""}`} data-variant={variant}>
      <span aria-hidden className="m-narrator-stroke" />
      <span className="m-narrator-text">{text}</span>
    </p>
  );
}
