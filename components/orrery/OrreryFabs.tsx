"use client";

// OrreryFabs — the FAB rail + its panels, rendered ON the Orrery hub.
//
// The Orrery hub (app/orrery/page.tsx) is a fullscreen iframe OUTSIDE the
// (app) layout, so it never got the FAB rail or the conversational/quick-add/
// time-machine panels. This overlay puts the three corner circles back on the
// "main interface" and wires them to the same panels the rest of the app uses
// (the buttons dispatch window CustomEvents these components already listen for).
//
// living.css (imported by the page) supplies the .hn-fab* styles.

import type { Locale } from "@/lib/i18n";
import "./orrery-fabs.css";
import { FabRail } from "@/components/orrery/FabRail";
import { Conversational } from "@/components/Conversational";
import { QuickAddFAB } from "@/components/QuickAddFAB";
import { TimeScrubber } from "@/components/TimeScrubber";

export function OrreryFabs({ locale }: { locale: Locale }) {
  return (
    <>
      <FabRail locale={locale} />
      <Conversational locale={locale} />
      <QuickAddFAB locale={locale} />
      <TimeScrubber initialAsOf={null} locale={locale} />
    </>
  );
}
