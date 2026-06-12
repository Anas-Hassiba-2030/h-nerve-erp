"use client";

// DeferredOverlays — Phase 26.8 (performance).
//
// The (app) layout used to server-render ~13 client overlays on every page,
// inflating the initial HTML and hydration cost. None of these five surfaces
// has SSR-visible content that matters for first paint — they are tours,
// splashes, the morning brief, the realtime-presence SSE connection, and the
// document drop zone. Deferring them with next/dynamic (ssr:false) keeps their
// JS off the critical path: the page paints, then these mount on idle.
//
// Kept SSR (not here): LivingAtmosphere, OrbitReturn, FabRail, ConstellationRail,
// ToastProvider, Footer — these are part of the visible chrome.

import dynamic from "next/dynamic";

const OnboardingTour = dynamic(
  () => import("@/components/layout/OnboardingTour").then((m) => m.OnboardingTour),
  { ssr: false },
);
const WelcomeSplash = dynamic(
  () => import("@/components/layout/WelcomeSplash").then((m) => m.WelcomeSplash),
  { ssr: false },
);
const MorningBrief = dynamic(
  () => import("@/components/brain/MorningBrief").then((m) => m.MorningBrief),
  { ssr: false },
);
const RealtimePresence = dynamic(
  () => import("@/components/realtime/RealtimePresence").then((m) => m.RealtimePresence),
  { ssr: false },
);
const DocumentDropZone = dynamic(
  () => import("@/components/layout/DocumentDropZone").then((m) => m.DocumentDropZone),
  { ssr: false },
);

type Props = {
  locale: "ar" | "en";
  userId: string;
  userName: string;
};

export function DeferredOverlays({ locale, userId, userName }: Props) {
  return (
    <>
      <MorningBrief locale={locale} userName={userName} />
      <OnboardingTour locale={locale} />
      <WelcomeSplash locale={locale} />
      <RealtimePresence user={{ id: userId, name: userName }} locale={locale} />
      <DocumentDropZone locale={locale} />
    </>
  );
}
