"use client";

// The design system's living background + per-sector ambient signature, wired
// into the real (app) shell via a controlled lifecycle (public/living/atmosphere.js,
// window.HNAtmosphere). Mounts on entry, re-mounts with the right sector ambient
// on each client navigation, and unmounts on leave. The atmosphere reads through
// the content surface via app/(app)/living.css (it neutralizes the solid .nerve-bg
// while data-living is set); cards/tables keep their solid surfaces on top.
//
// Living mode is determined per-route by lib/orrery/ambientMap.ts — sections
// that the Claude Design reference marks data-living="night" (brain, intel,
// signals, team comms, workflows) get the cosmic emerald aurora; everything
// else gets the ivory daylight aurora.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ambientForPath } from "@/lib/orrery/ambientMap";

declare global {
  interface Window {
    HNAtmosphere?: { mount: (living: string, ambient: string | null) => void; unmount: () => void };
  }
}

export function LivingAtmosphere() {
  const pathname = usePathname();

  useEffect(() => {
    const { ambient, living } = ambientForPath(pathname || "/");

    function apply() {
      window.HNAtmosphere?.mount(living, ambient);
    }

    if (window.HNAtmosphere) {
      apply();
    } else {
      let s = document.getElementById("hn-atmosphere-script") as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement("script");
        s.id = "hn-atmosphere-script";
        s.src = "/living/atmosphere.js";
        s.defer = true;
        document.body.appendChild(s);
      }
      s.addEventListener("load", apply, { once: true });
    }

    return () => {
      // re-mount on the next route handles switching; full unmount on leaving (app)
      window.HNAtmosphere?.unmount();
    };
  }, [pathname]);

  return null;
}
