// HeritageSection — a section block that follows the Heritage Modern pattern:
// eyebrow + display heading + optional aside + hairline rule. Replaces the
// soft "card with rounded ring + emoji icon" pattern that was producing
// visual mush below the hero.
//
// See docs/DESIGN-SKILL.md §5.5 (three-tier hierarchy) and §1.D (vocabulary).

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function HeritageSection({
  eyebrow,
  title,
  aside,
  href,
  hrefLabel,
  rtl,
  children,
  bare = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  aside?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  rtl?: boolean;
  bare?: boolean; // when true, no card wrapper — just the heading + content
  children: React.ReactNode;
  className?: string;
}) {
  const Wrapper: React.ElementType = bare ? "section" : "section";
  return (
    <Wrapper
      className={className}
      style={
        bare
          ? undefined
          : {
              background: "var(--heri-cream-2)",
              border: "1px solid var(--heri-rule)",
              padding: "22px 26px",
              position: "relative",
            }
      }
    >
      <header className="heri-section-head" style={{ marginBottom: bare ? 18 : 18, paddingBottom: 12 }}>
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? <div className="heri-eyebrow mb-2">{eyebrow}</div> : null}
            <h3
              className="font-display"
              style={{
                fontSize: "clamp(18px, 1.6vw, 22px)",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                fontWeight: 600,
                color: "var(--heri-ink)",
              }}
            >
              {title}
            </h3>
            {aside ? (
              <p
                className="mt-1"
                style={{
                  fontSize: 12.5,
                  color: "var(--heri-ink-3)",
                  lineHeight: 1.45,
                }}
              >
                {aside}
              </p>
            ) : null}
          </div>
          {href ? (
            <Link
              href={href}
              className="heri-eyebrow inline-flex items-center gap-1.5 transition"
              style={{ color: "var(--heri-copper)" }}
            >
              {hrefLabel}
              <ChevronLeft
                className="h-3 w-3"
                style={{ transform: rtl ? "none" : "scaleX(-1)" }}
              />
            </Link>
          ) : null}
        </div>
      </header>

      {children}
    </Wrapper>
  );
}
