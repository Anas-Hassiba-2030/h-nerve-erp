// app/dev/spec — Refined Editorial protocol manifesto.
//
// Phase 20 of docs/governance/PHASES-INTELLIGENCE.md.

import { PROTOCOL_VERSION } from "@/lib/protocol/spec";

export default function SpecPage() {
  return (
    <article className="dev-doc">
      <p className="dev-doc-eyebrow">SPEC · v{PROTOCOL_VERSION}</p>
      <h1 className="dev-doc-title">The Living Protocol</h1>
      <p className="dev-doc-deck">
        H-Nerve is an open intelligence layer for organizations. The brain
        belongs to the orgs that build on it. This document defines the
        primitives anyone can extend — agents, packs, themes — and the
        invariants every implementation honors.
      </p>

      <hr className="dev-doc-rule" aria-hidden />

      <section className="dev-doc-section">
        <h2>1 · The three primitives</h2>
        <p>
          The protocol exposes three composable units. Each has a typed
          shape, a registration path, and a lifecycle. Together they
          describe an entire intelligent product.
        </p>
        <dl className="dev-doc-defs">
          <div>
            <dt>Agent</dt>
            <dd>
              A unit of judgment. Given a topic and a subgraph cut, an
              agent returns a vote (advocate, skeptic, abstain), a
              rationale of one to three sentences, and a confidence in
              the unit interval. Agents are stateless and deterministic.
              Side effects are forbidden.
            </dd>
          </div>
          <div>
            <dt>Pack</dt>
            <dd>
              An industry. A bundle of brain nodes, weighted edges, default
              insights, default workflows, and recommended agents. Installing
              a pack stands up a vertical end to end — dairy, agri,
              hospitality, finance, manufacturing.
            </dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>
              A brand. Pure JSON: palette, typography, vocabulary. The
              white-label layer reads it raw. There is no compile step,
              no rebuild, no deploy. A new tenant is one POST away.
            </dd>
          </div>
        </dl>
      </section>

      <section className="dev-doc-section">
        <h2>2 · Invariants</h2>
        <p>
          The protocol is small. The discipline is large. Every
          conformant implementation observes these rules:
        </p>
        <ol className="dev-doc-rules">
          <li>
            <strong>Every claim cites.</strong> An agent that cannot point
            to the rows it reasoned over is non-conformant.
          </li>
          <li>
            <strong>Every decision replays.</strong> Same subgraph, same
            memory, same agent version → same vote, same rationale, same
            confidence. Determinism is not optional.
          </li>
          <li>
            <strong>Agents propose. Humans commit.</strong> The brain
            never auto-mutates domain data. Workflows commit, after a
            person — or a whitelist rule — agrees.
          </li>
          <li>
            <strong>Privacy is K-anonymous.</strong> Federated patterns
            surface only when at least five peers contribute. No names,
            no accounts, no identifiers cross org boundaries.
          </li>
          <li>
            <strong>Versioning is semantic.</strong> An agent at 1.x.y
            never breaks shape. Breaking changes go through 2.0.0.
          </li>
        </ol>
      </section>

      <section className="dev-doc-section">
        <h2>3 · Lifecycle</h2>
        <p>
          A registered agent moves through five states. Each transition
          is logged. The IQ (
          <code>/api/v1/brain/iq</code>) is recomputed on every commit.
        </p>
        <ol className="dev-doc-states">
          <li>
            <span className="dev-doc-state-mark">DRAFT</span>
            <span>Registered, not yet routed to council debates.</span>
          </li>
          <li>
            <span className="dev-doc-state-mark">SHADOW</span>
            <span>Votes recorded for evaluation, not used in decisions.</span>
          </li>
          <li>
            <span className="dev-doc-state-mark">ACTIVE</span>
            <span>Counts in the council; influences plans and insights.</span>
          </li>
          <li>
            <span className="dev-doc-state-mark">DEPRECATED</span>
            <span>Still callable, marked stale, replaced by a successor.</span>
          </li>
          <li>
            <span className="dev-doc-state-mark">RETIRED</span>
            <span>Removed from the council; historical decisions still cite it.</span>
          </li>
        </ol>
      </section>

      <section className="dev-doc-section">
        <h2>4 · The contract</h2>
        <p>
          We hold the protocol open under Apache-2.0. We commit to
          backward compatibility within a major version, to public
          changelogs, to a published deprecation policy of at least one
          major release. In return: build, ship, fork. The brain belongs
          to the orgs that build on it.
        </p>
      </section>

      <p className="dev-doc-sign">— H-Nerve, 2026</p>
    </article>
  );
}
