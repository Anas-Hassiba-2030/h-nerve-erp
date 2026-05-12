// components/mobile/PullToRefresh.tsx
//
// The signature animation for /m. As the user drags down from the top of
// the page, a single ochre hairline draws across the top edge of the
// viewport. Cross the threshold and release → the page calls
// router.refresh() and a one-line narration ("Synced. 3 new things.")
// fades in below the greeting for ~2 seconds, then fades out. No spinner,
// no rotating arrow, no progress wheel.
//
// Implementation notes:
// - We listen to native touch events. CSS `overscroll-behavior-y: contain`
//   on .m-shell stops the browser's own pull-to-refresh from competing.
// - We only arm the gesture when scrollY === 0. Once armed, we track
//   touchmove deltas; the hairline width is `min(1, dy / threshold)`.
// - Below threshold on release: spring back to 0, no refresh.
// - At/above threshold: animate to full, fire `router.refresh()`, show
//   the narrator line for ~2200ms, then fade out.
// - Mouse simulation is wired only for desktop dev convenience (drag from
//   the top with the mouse held).

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 84; // px — generous enough to avoid accidental fires
const MAX_PULL = 140; // visual cap so the line can't run "past 100%"

export function PullToRefresh({
  syncedAr,
  syncedEn,
  ar,
}: {
  syncedAr: string;
  syncedEn: string;
  ar: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(0); // 0..1
  const [phase, setPhase] = useState<"idle" | "pulling" | "refreshing" | "synced">(
    "idle",
  );
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 4) return; // not at top
      armed.current = true;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!armed.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setProgress(0);
        setPhase("idle");
        return;
      }
      // Damped — first 84px feels 1:1, beyond that it slows.
      const damped = dy < THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * 0.4;
      const p = Math.min(1, damped / THRESHOLD);
      setProgress(p);
      setPhase("pulling");
      if (dy > 12) e.preventDefault(); // own the gesture once it's clearly a pull
    }

    function onTouchEnd() {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;
      // Above threshold → fire refresh
      if (progress >= 1) {
        triggerSync();
      } else {
        // spring back
        setProgress(0);
        setPhase("idle");
      }
    }

    function triggerSync() {
      setPhase("refreshing");
      setProgress(1);
      // Brief beat at full for the eye to register the line snapped in
      window.setTimeout(() => {
        router.refresh();
        // The Server Component re-fetches; cards re-stagger.
        // Show "Synced." for ~2.2s, then fade.
        setPhase("synced");
        window.setTimeout(() => {
          setPhase("idle");
          setProgress(0);
        }, 2200);
      }, reducedMotion.current ? 0 : 220);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [progress, router]);

  // Mouse simulation for desktop dev — drag from y < 80 down to refresh.
  useEffect(() => {
    let dragStartY: number | null = null;
    function down(e: MouseEvent) {
      if (window.scrollY > 4 || e.clientY > 80) return;
      dragStartY = e.clientY;
      armed.current = true;
    }
    function move(e: MouseEvent) {
      if (dragStartY == null) return;
      const dy = e.clientY - dragStartY;
      if (dy <= 0) {
        setProgress(0);
        setPhase("idle");
        return;
      }
      const damped = dy < THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * 0.4;
      setProgress(Math.min(1, damped / THRESHOLD));
      setPhase("pulling");
    }
    function up() {
      if (dragStartY == null) return;
      dragStartY = null;
      if (progress >= 1) {
        setPhase("refreshing");
        setProgress(1);
        window.setTimeout(() => {
          router.refresh();
          setPhase("synced");
          window.setTimeout(() => {
            setPhase("idle");
            setProgress(0);
          }, 2200);
        }, 220);
      } else {
        setProgress(0);
        setPhase("idle");
      }
    }
    window.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [progress, router]);

  return (
    <>
      <div
        className="m-pull-stroke"
        data-phase={phase}
        aria-hidden
        style={{ transform: `scaleX(${progress})` }}
      />
      {phase === "synced" ? (
        <div className="m-synced-line" role="status">
          <span aria-hidden className="m-synced-dot" />
          <span>{ar ? syncedAr : syncedEn}</span>
        </div>
      ) : null}
    </>
  );
}
