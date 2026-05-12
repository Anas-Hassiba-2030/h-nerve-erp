// Adds an entrance animation around any page body so navigation feels alive.
export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="anim-fade-up">{children}</div>;
}
