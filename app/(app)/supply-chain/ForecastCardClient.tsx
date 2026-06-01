"use client";

// Client wrapper for a single forecast card. Reproduces the Claude Design
// reference interaction (.fc-card / .fc-head click toggles .open to reveal the
// .fc-explain panel). Approve / reject remain real server-action <form>s passed
// in as children, so all mutations stay server-side.

import { useState, type ReactNode } from "react";

export function ForecastCardClient({
  status,
  ring,
  title,
  meta,
  actions,
  explain,
}: {
  status: "DRAFT" | "APPROVED" | "EXECUTED" | "DISMISSED";
  ring: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  actions: ReactNode;
  explain: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const stateClass =
    status === "APPROVED" || status === "EXECUTED"
      ? "approved"
      : status === "DISMISSED"
        ? "rejected"
        : "";

  return (
    <div className={`fc-card ${stateClass}${open ? " open" : ""}`}>
      <div
        className="fc-head"
        onClick={(e) => {
          // ignore clicks that originate from action buttons
          if ((e.target as HTMLElement).closest(".fc-actions, .fc-status")) return;
          setOpen((v) => !v);
        }}
      >
        <div className="fc-ring">{ring}</div>
        <div className="fc-body">
          <div className="fc-title">{title}</div>
          <div className="fc-meta">{meta}</div>
        </div>
        {actions}
      </div>
      <div className="fc-explain">
        <div className="fc-explain-in">{explain}</div>
      </div>
    </div>
  );
}
