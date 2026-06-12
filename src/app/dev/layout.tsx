// app/dev — The Living Protocol developer portal.
//
// Phase 20 of docs/PHASES-INTELLIGENCE.md.
//
// This route group is publicly accessible — the protocol is meant to
// be public. Brand chrome is intentionally minimal: a single hairline
// nav rail, no operator sidebar, no auth gate.
//
// Aesthetic: Refined Editorial body for the manifesto + spec, Industrial
// Precision for the explorer.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "H-Nerve Protocol — Developer Portal",
  description:
    "An open intelligence layer. The brain belongs to the orgs that build on it.",
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dev-shell">
      <header className="dev-rail">
        <Link href="/dev" className="dev-rail-brand">
          <span className="dev-rail-mark">H·N</span>
          <span className="dev-rail-title">PROTOCOL</span>
          <span className="dev-rail-version">v1.0.0</span>
        </Link>
        <nav className="dev-rail-nav">
          <Link href="/dev/spec" className="dev-rail-link">Spec</Link>
          <Link href="/dev/marketplace" className="dev-rail-link">Marketplace</Link>
          <Link href="/dev/explorer" className="dev-rail-link">Explorer</Link>
          <Link href="/dashboard" className="dev-rail-link dev-rail-link-out">Operator →</Link>
        </nav>
      </header>
      <main className="dev-main">{children}</main>
      <footer className="dev-foot">
        <span>H-Nerve Protocol · Apache-2.0 · 2026</span>
        <span className="dev-foot-sep">·</span>
        <Link href="/api/protocol/openapi">openapi.json</Link>
      </footer>
    </div>
  );
}
