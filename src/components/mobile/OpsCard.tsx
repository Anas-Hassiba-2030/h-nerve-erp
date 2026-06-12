// components/mobile/OpsCard.tsx
//
// One row in the today list. Big touch target (≥56px tall). One eyebrow,
// one title, one body line, one CTA. Nothing else. The left edge has a
// 3px tone band — that's the only color in the card.

import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { OpsCard as OpsCardType } from "@/lib/mobile/today";

export function OpsCard({
  card,
  ar,
  index,
}: {
  card: OpsCardType;
  ar: boolean;
  index: number;
}) {
  const eyebrow = ar ? card.eyebrow : card.eyebrowEn;
  const cta = ar ? card.cta.ar : card.cta.en;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={card.href}
      className="m-card"
      data-tone={card.tone}
      data-urgent={card.urgent ? "true" : "false"}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Tone band */}
      <span aria-hidden className="m-card-band" />

      <div className="m-card-body">
        <div className="m-card-eyebrow-row">
          <span className="m-card-eyebrow">{eyebrow}</span>
          {card.urgent ? (
            <span className="m-card-dot" aria-label={ar ? "عاجل" : "Urgent"} />
          ) : null}
        </div>

        <h3 className="m-card-title">{card.title}</h3>
        <p className="m-card-text">{card.body}</p>

        <div className="m-card-cta-row">
          <span className="m-card-cta">{cta}</span>
          <Arrow className="h-3.5 w-3.5 m-card-arrow" strokeWidth={1.5} />
        </div>
      </div>
    </Link>
  );
}
