"use client";

// Phase Pre-pitch SWEEP-4 — tiny client wrapper for the "Notify me"
// button on the /documents coming-soon hero. window.alert is the
// cheapest "we heard you" UX while the feature is wired in a later
// session.

export function NotifyMeButton({ ar }: { ar: boolean }) {
  return (
    <button
      type="button"
      className="heri-btn heri-btn-secondary"
      title={
        ar
          ? "سنُعلِمك في صندوق الوارد عند الإطلاق"
          : "We'll notify you in your inbox when it ships"
      }
      onClick={() => {
        window.alert(
          ar
            ? "تم. سنخبرك في صندوق الوارد فور الإطلاق."
            : "Thanks — we'll notify you in your inbox.",
        );
      }}
    >
      {ar ? "أعلمني" : "Notify me"}
    </button>
  );
}
