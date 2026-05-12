// components/TimeMachineBanner.tsx
//
// The "Viewing as of …" banner that appears at the top of the app when
// the user has scrubbed back. Shows the date and the brain's IQ on that
// day vs now. Slides down from above the page chrome with a hairline
// ochre rule.
//
// Server component — reads as-of state directly. The banner is hidden
// when as-of is null.
//
// Phase 16 of docs/PHASES-INTELLIGENCE.md.

import { brainIqDelta, formatAsOfLabel, getAsOf } from "@/lib/timemachine";
import { ClockArrowDown } from "lucide-react";
import { ClearTravelButton } from "./TimeMachineBannerClient";

export async function TimeMachineBanner({
  locale = "ar",
}: {
  locale?: "ar" | "en";
}) {
  const state = getAsOf();
  if (!state.isTraveling || !state.asOf) return null;

  const ar = locale === "ar";
  const { asOfIq, liveIq } = await brainIqDelta(state.asOf);
  const label = formatAsOfLabel(state.asOf, locale);

  const delta = asOfIq - liveIq;

  return (
    <div className="tm-banner" role="status" aria-live="polite">
      <div className="tm-banner-inner">
        <span aria-hidden className="tm-banner-mark">
          <ClockArrowDown className="h-3.5 w-3.5" strokeWidth={1.7} />
        </span>
        <p className="tm-banner-text">
          {ar ? (
            <>
              <span className="tm-banner-eyebrow">عرض كما في</span>
              <span className="tm-banner-date">{label}</span>
              <span className="tm-banner-sep">·</span>
              <span className="tm-banner-iq">
                ذكاء الدماغ ذلك اليوم{" "}
                <strong>{asOfIq}</strong>
              </span>
              <span className="tm-banner-sep">·</span>
              <span className="tm-banner-iq-now">
                الآن <strong>{liveIq}</strong>
                {delta !== 0 ? (
                  <span
                    className="tm-banner-iq-delta"
                    data-dir={delta > 0 ? "down" : "up"}
                  >
                    {delta > 0 ? `−${delta}` : `+${Math.abs(delta)}`}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <>
              <span className="tm-banner-eyebrow">VIEWING AS OF</span>
              <span className="tm-banner-date">{label}</span>
              <span className="tm-banner-sep">·</span>
              <span className="tm-banner-iq">
                Brain IQ that day <strong>{asOfIq}</strong>
              </span>
              <span className="tm-banner-sep">·</span>
              <span className="tm-banner-iq-now">
                now <strong>{liveIq}</strong>
                {delta !== 0 ? (
                  <span
                    className="tm-banner-iq-delta"
                    data-dir={delta > 0 ? "down" : "up"}
                  >
                    {delta > 0 ? `−${delta}` : `+${Math.abs(delta)}`}
                  </span>
                ) : null}
              </span>
            </>
          )}
        </p>
        <ClearTravelButton ar={ar} />
      </div>
    </div>
  );
}
