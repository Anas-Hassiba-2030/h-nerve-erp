// components/TimeScrubber.tsx
//
// The floating "Now" pill. Bottom-end on every authenticated page.
// Click to expand into a date scrubber. Drag the slider, type a date,
// or use the chevron arrows to walk by day. Hit "الآن / NOW" to clear.
//
// While scrubbing back, an ochre rail fills around the pill — a visual
// countdown of how far back you are (0-180 days).
//
// Phase 16 of docs/governance/PHASES-INTELLIGENCE.md.
//
// Aesthetic: Heritage Modern body, Brutalist Confidence date pill —
// sharp ink chip, ochre arrow controls, no rounded corners. Per
// docs/governance/DESIGN-SKILL.md the contrast is intentional.

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  History,
} from "lucide-react";
import { setAsOfTimestamp, clearAsOf } from "@/app/actions/timemachine";

const MIN = new Date("2025-09-01T00:00:00.000Z").getTime();

type Props = {
  initialAsOf: number | null;
  locale?: "ar" | "en";
};

function dayMs() { return 1000 * 60 * 60 * 24; }
function startOfDay(d: number): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function toInputValue(d: number): string {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TimeScrubber({ initialAsOf, locale = "ar" }: Props) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [asOf, setAsOf] = useState<number | null>(initialAsOf);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const max = startOfDay(now);
  const span = Math.max(1, max - MIN);
  const cursor = asOf ?? max;
  const daysBack = Math.max(0, Math.round((now - cursor) / dayMs()));
  const fillPct = Math.min(1, (max - cursor) / span);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keyboard shortcuts when expanded: ←/→ to walk one day, ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const isLeft = e.key === "ArrowLeft";
      const isRight = e.key === "ArrowRight";
      if (!isLeft && !isRight) return;
      // Don't hijack typing in inputs/textareas
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      e.preventDefault();
      // In RTL, swap directions visually
      const back = ar ? isRight : isLeft;
      step(back ? -1 : 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ar, asOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // FabRail trigger — opened by the unified rail at the bottom-start corner.
  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener("h-nerve:timemachine:open", onOpen);
    return () => window.removeEventListener("h-nerve:timemachine:open", onOpen);
  }, []);

  const commit = useCallback(
    (next: number | null) => {
      setAsOf(next);
      startTransition(async () => {
        if (next == null) await clearAsOf();
        else await setAsOfTimestamp(next);
      });
    },
    [startTransition],
  );

  const step = useCallback(
    (dir: -1 | 1) => {
      const next = (asOf ?? max) + dir * dayMs();
      const clamped = Math.max(MIN, Math.min(max, next));
      commit(clamped >= max ? null : clamped);
    },
    [asOf, max, commit],
  );

  const dateStr = useMemo(() => {
    return new Intl.DateTimeFormat(
      ar ? "ar-JO-u-nu-latn" : "en-US",
      { day: "numeric", month: "short", year: "2-digit" },
    ).format(cursor);
  }, [cursor, ar]);

  const isLive = asOf == null;

  return (
    <div
      ref={containerRef}
      className={`tm-pill ${isLive ? "is-live" : "is-traveling"} ${open ? "is-open" : ""}`}
      style={
        {
          ["--tm-fill" as any]: `${(fillPct * 100).toFixed(2)}%`,
        } as React.CSSProperties
      }
      data-pending={pending ? "true" : "false"}
      data-tm-legacy-pill
      role="region"
      aria-label={ar ? "آلة الزمن" : "Time machine"}
    >
      {/* Collapsed view */}
      {!open ? (
        <button
          type="button"
          className="tm-pill-trigger"
          onClick={() => setOpen(true)}
          aria-expanded="false"
        >
          {/* Ochre fill rail — left half draws as you scrub backward */}
          <span aria-hidden className="tm-rail" />
          <span className="tm-pill-icon">
            {isLive ? (
              <Clock className="h-3.5 w-3.5" strokeWidth={1.6} />
            ) : (
              <History className="h-3.5 w-3.5" strokeWidth={1.6} />
            )}
          </span>
          <span className="tm-pill-text">
            {isLive ? (ar ? "الآن" : "NOW") : dateStr}
          </span>
          {!isLive ? (
            <span className="tm-pill-back">
              {ar ? `−${daysBack} يوم` : `−${daysBack}d`}
            </span>
          ) : null}
        </button>
      ) : (
        <div className="tm-pill-pop">
          <header className="tm-pop-head">
            <span className="tm-pop-eyebrow">
              {ar ? "آلة الزمن" : "TIME MACHINE"}
            </span>
            <button
              type="button"
              className="tm-pop-close"
              onClick={() => setOpen(false)}
              aria-label={ar ? "إغلاق" : "Close"}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </header>

          <div className="tm-pop-body">
            <div className="tm-pop-date">
              <button
                type="button"
                className="tm-step"
                onClick={() => step(-1)}
                aria-label={ar ? "يوم أقدم" : "One day back"}
              >
                {ar ? (
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
              <input
                type="date"
                className="tm-date-input"
                value={toInputValue(cursor)}
                min={toInputValue(MIN)}
                max={toInputValue(max)}
                onChange={(e) => {
                  const ts = new Date(e.target.value).getTime();
                  if (!Number.isFinite(ts)) return;
                  const clamped = Math.max(MIN, Math.min(max, ts));
                  commit(clamped >= max ? null : clamped);
                }}
              />
              <button
                type="button"
                className="tm-step"
                onClick={() => step(1)}
                aria-label={ar ? "يوم أحدث" : "One day forward"}
              >
                {ar ? (
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
            </div>

            <input
              type="range"
              className="tm-slider"
              min={MIN}
              max={max}
              step={dayMs()}
              value={cursor}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                commit(v >= max ? null : v);
              }}
              aria-label={ar ? "متتبع الزمن" : "Time scrubber"}
            />

            <div className="tm-pop-foot">
              <span className="tm-pop-back">
                {isLive
                  ? ar ? "تعرض الحاضر" : "Viewing live"
                  : ar
                  ? `قبل ${daysBack} يوم`
                  : `${daysBack} days back`}
              </span>
              <button
                type="button"
                className="tm-pop-now"
                onClick={() => commit(null)}
                disabled={isLive}
              >
                {ar ? "ارجع للآن" : "JUMP TO NOW"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
