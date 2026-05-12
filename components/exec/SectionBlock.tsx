// SectionBlock — premium section wrapper with gradient accent stripe,
// title row, optional eyebrow + actions slot, breathing animation.

import React from "react";

export function SectionBlock({
  eyebrow,
  title,
  description,
  actions,
  tone = "brand",
  className = "",
  children,
  noPad = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: "brand" | "emerald" | "amber" | "rose" | "blue" | "violet";
  className?: string;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <section className={`exec-section relative ${className}`} data-tone={tone}>
      <div className={noPad ? "" : "p-5 md:p-6"}>
        <div className="section-heading">
          <div className="min-w-0">
            {eyebrow ? <div className="exec-eyebrow mb-1.5">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
