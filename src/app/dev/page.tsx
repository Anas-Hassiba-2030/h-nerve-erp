// app/dev — The Living Protocol landing page.
//
// Refined Editorial. Opens with the typed manifesto:
//   "H-Nerve is an open intelligence layer.
//    The brain belongs to the orgs that build on it."
// then three primitives — Agent, Pack, Theme — each with the canonical
// minimum source side-by-side.
//
// Phase 20 of docs/governance/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import {
  MIN_AGENT_SOURCE,
  MIN_PACK_SOURCE,
  MIN_THEME_SOURCE,
  PROTOCOL_VERSION,
  MARKETPLACE_AGENTS,
} from "@/lib/protocol/spec";
import { Manifesto } from "./Manifesto";
import { ArrowUpRight } from "lucide-react";

export default function DevHome() {
  const totalInstalls = MARKETPLACE_AGENTS.reduce((s, m) => s + m.installs, 0);
  return (
    <>
      <section className="dev-hero">
        <p className="dev-hero-eyebrow">H-NERVE PROTOCOL · v{PROTOCOL_VERSION}</p>
        <Manifesto
          line="H-Nerve is an open intelligence layer. The brain belongs to the orgs that build on it."
        />
        <div className="dev-hero-meta">
          <span>{MARKETPLACE_AGENTS.length} community agents</span>
          <span className="dev-hero-meta-sep">·</span>
          <span>{totalInstalls.toLocaleString()} installs</span>
          <span className="dev-hero-meta-sep">·</span>
          <span>Apache-2.0</span>
        </div>
      </section>

      <section className="dev-pillars">
        <Pillar
          n="01"
          title="Agent"
          subtitle="A unit of judgment, in 12 lines"
          body="Single-purpose. Stateless. Deterministic. Returns a vote, a rationale, and a confidence. Nothing else."
          source={MIN_AGENT_SOURCE}
          lang="ts"
          lines={12}
        />
        <Pillar
          n="02"
          title="Pack"
          subtitle="An industry, in 30 lines"
          body="Brain nodes. Edges. Default insights. Default workflows. Recommended agents. Stand up a vertical in one import."
          source={MIN_PACK_SOURCE}
          lang="ts"
          lines={30}
        />
        <Pillar
          n="03"
          title="Theme"
          subtitle="A brand, in JSON"
          body="Palette. Typography. Vocabulary. The white-label layer reads it raw — no compile, no rebuild."
          source={MIN_THEME_SOURCE}
          lang="json"
          lines={(MIN_THEME_SOURCE.match(/\n/g)?.length ?? 0) + 1}
        />
      </section>

      <section className="dev-cta">
        <p className="dev-cta-eyebrow">NEXT</p>
        <div className="dev-cta-row">
          <Link href="/dev/spec" className="dev-cta-card">
            <h3>Read the spec</h3>
            <p>Types, lifecycle, citations, replay invariants.</p>
            <span className="dev-cta-arrow"><ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
          </Link>
          <Link href="/dev/marketplace" className="dev-cta-card">
            <h3>Browse the marketplace</h3>
            <p>{MARKETPLACE_AGENTS.length} community-built agents in orbit.</p>
            <span className="dev-cta-arrow"><ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
          </Link>
          <Link href="/dev/explorer" className="dev-cta-card">
            <h3>Try the API</h3>
            <p>Live explorer for every protocol endpoint.</p>
            <span className="dev-cta-arrow"><ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({
  n,
  title,
  subtitle,
  body,
  source,
  lang,
  lines,
}: {
  n: string;
  title: string;
  subtitle: string;
  body: string;
  source: string;
  lang: "ts" | "json";
  lines: number;
}) {
  return (
    <article className="dev-pillar">
      <div className="dev-pillar-text">
        <span className="dev-pillar-n">{n}</span>
        <h2 className="dev-pillar-title">{title}</h2>
        <p className="dev-pillar-sub">{subtitle}</p>
        <p className="dev-pillar-body">{body}</p>
      </div>
      <div className="dev-pillar-code">
        <header className="dev-pillar-code-head">
          <span>{title.toLowerCase()}.{lang}</span>
          <span className="dev-pillar-code-lines">{lines} LINES</span>
        </header>
        <pre className="dev-pillar-pre">
          <code>{source}</code>
        </pre>
      </div>
    </article>
  );
}
