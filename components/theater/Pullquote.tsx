// Pullquote — magazine-style oversized quote with attribution.
// Used inside Act IV (Council) to surface the most striking line per voice.
//
// Phase 9 of docs/PHASES-INTELLIGENCE.md.

export function Pullquote({
  quote,
  attribution,
  delay = 0,
  accent = "var(--theater-accent)",
}: {
  quote: string;
  attribution: string;
  /** ms — delays the fade-in so successive pullquotes stagger naturally */
  delay?: number;
  accent?: string;
}) {
  return (
    <figure
      className="theater-pullquote"
      style={{
        animationDelay: `${delay}ms`,
        ["--pullquote-accent" as any]: accent,
      }}
    >
      <span className="theater-pullquote-mark" aria-hidden>
        “
      </span>
      <blockquote className="theater-pullquote-body">{quote}</blockquote>
      <figcaption className="theater-pullquote-cite">
        <span className="theater-pullquote-rule" aria-hidden />
        {attribution}
      </figcaption>
    </figure>
  );
}
