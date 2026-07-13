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

import type { Locale } from "@/lib/i18n/i18n";
import "./orrery-fabs.css";
// Import the panel CSS DIRECTLY (not only via the globals.css @import chain).
// The Orrery hub renders OUTSIDE the (app) layout; if the @import is ever not
// inlined into this route's bundle, the brain veil (.cv-root) and time pill
// (.tm-pill) render UNSTYLED — as raw flow text in the top-left corner (the bug
// Anas hit). A direct component import guarantees these styles ship with the
// orrery route no matter what.
import "../../app/styles/phase15-conversational.css";
import "../../app/styles/phase16-timemachine.css";
import { FabRail } from "@/components/orrery/FabRail";
import { Conversational } from "@/components/brain/Conversational";
import { QuickAddFAB } from "@/components/nav/QuickAddFAB";
import { TimeScrubber } from "@/components/timemachine/TimeScrubber";

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
