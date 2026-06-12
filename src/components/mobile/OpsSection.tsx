// components/mobile/OpsSection.tsx
//
// One of three columns: Know / Decide / Approve. Renders a calm header
// with a count and the cards. Empty state is a single calm tile that
// says "all clear" — never an empty section.

import { OpsCard } from "./OpsCard";
import type { OpsCard as OpsCardType } from "@/lib/mobile/today";

export function OpsSection({
  label,
  labelEn,
  hint,
  hintEn,
  cards,
  ar,
  index,
}: {
  label: string;
  labelEn: string;
  hint: string;
  hintEn: string;
  cards: OpsCardType[];
  ar: boolean;
  index: number;
}) {
  return (
    <section className="m-section" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="m-section-head">
        <div className="m-section-title-row">
          <h2 className="m-section-title">{ar ? label : labelEn}</h2>
          <span className="m-section-count">{cards.length}</span>
        </div>
        <p className="m-section-hint">{ar ? hint : hintEn}</p>
      </div>

      {cards.length === 0 ? (
        <div className="m-card m-card-empty" data-tone="ink">
          <span aria-hidden className="m-card-band" />
          <div className="m-card-body">
            <h3 className="m-card-title m-card-title-empty">
              {ar ? "كل شيء هادئ هنا." : "All clear here."}
            </h3>
            <p className="m-card-text">
              {ar
                ? "لا شيء يستدعي تدخّلك الآن. سنُنبّهك."
                : "Nothing needs you right now. We'll page you."}
            </p>
          </div>
        </div>
      ) : (
        <div className="m-cards">
          {cards.map((card, i) => (
            <OpsCard key={card.key} card={card} ar={ar} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
