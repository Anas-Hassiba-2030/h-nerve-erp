// Act — a single scroll-snapped scene of the Decision Theater.
//
// Each Act fills the viewport. The roman numeral and title float top-left.
// Body content lives inside a 760px column with editorial typography.
// On enter-view, the title underlines from 0 → 100% width over 480ms.
//
// Phase 9 of docs/governance/PHASES-INTELLIGENCE.md.

export function Act({
  index,
  romanNumeral,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  index: number;
  romanNumeral: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theater-act" data-act={index}>
      <div className="theater-act-header">
        <div className="theater-act-eyebrow">
          <span className="theater-act-roman">{romanNumeral}.</span>
          <span className="theater-act-eyebrow-text">{eyebrow}</span>
        </div>
        <h2 className="theater-act-title">{title}</h2>
        {subtitle ? <p className="theater-act-subtitle">{subtitle}</p> : null}
      </div>
      <div className="theater-act-body">{children}</div>
    </section>
  );
}
