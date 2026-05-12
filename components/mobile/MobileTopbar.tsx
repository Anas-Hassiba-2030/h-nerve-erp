// components/mobile/MobileTopbar.tsx
//
// Top of the /m today screen. Calm Clinical: greeting + a single date line
// + the narrator sentence (delivered via NarratorTicker so it can fade in
// after pull-to-refresh). Almost no chrome — no logo lockup, no buttons.
// We let the user start at "what does today need from me?" in one glance.

import Link from "next/link";
import { Settings2 } from "lucide-react";

export function MobileTopbar({
  greeting,
  dateline,
  ar,
}: {
  greeting: string;
  dateline: string;
  ar: boolean;
}) {
  return (
    <header className="m-topbar">
      <div className="m-topbar-row">
        <div className="m-topbar-meta">
          <span className="m-topbar-date">{dateline}</span>
        </div>
        <Link
          href="/dashboard"
          className="m-topbar-icon"
          aria-label={ar ? "إعدادات" : "Settings"}
        >
          <Settings2 className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
      <h1 className="m-topbar-greeting">{greeting}</h1>
    </header>
  );
}
