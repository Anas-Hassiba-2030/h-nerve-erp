# Phase 13 — Integrations Hub

## Current state (what already exists in the repo, with file paths)
The hub is already scaffolded end-to-end as a **simulated** marketplace; the gap is real I/O, not UI.
- **Catalog** — `lib/integrations/catalog.ts` ships exactly **24 providers across 6 categories** (`messaging`/`email`/`calendar`/`banking`/`iot`/`commerce`) with bilingual names, glyphs, brand colors, scopes, and per-provider `settingFields`. A `FunctionalState` union (`COMING_SOON`→`LIVE`) + `FUNCTIONAL_STATE_LABEL` exist but are **never rendered** (every tile reads only `status`). Integrity locked by `lib/integrations/catalog.test.ts` (asserts 24/6, unique keys, hex colors).
- **Runtime** — `lib/integrations/runtime.ts`: `connectProvider` / `disconnectProvider` / `updateSettings` / `sendThrough` / `logError`. `connectProvider` **mocks** OAuth (`tok_${randomBytes}`), always persists `status=CONNECTED`. `sendThrough` is **defined but called by nothing** in the repo (grep: only the definition). No per-provider adapters exist — the doc's promised `lib/integrations/{slack,gmail,plaid,iot}.ts` are **absent**.
- **Real validation, two providers only** — `app/(app)/integrations/actions.ts` `connectWithApiKey` makes a genuine HTTP call to SendGrid `/v3/user/profile` and Resend `/domains`, persisting only on 200. These two are `READY_FOR_SETUP`; the other 22 are `INFRASTRUCTURE_READY`. `connectAndOpen` is **dead code** (exported, imported nowhere).
- **UI** — `app/(app)/integrations/page.tsx` (24-tile grid, Connect/Disconnect via server actions, usage/error counts, last-activity), `app/(app)/integrations/[key]/page.tsx` (hero, scope list, settings form, 12-row activity log, API-key form for sendgrid/resend), `integrations.css`. Both Heritage/Daylight. **No Y-axis flip animation** exists (doc's signature animation — grep for `rotateY`/`backface`/`perspective` in `integrations.css` returns nothing). Sidebar entry wired at `components/Sidebar.tsx:163`.
- **Schema** — `prisma/schema.prisma:1346` `Integration` (keyed `@@unique([scope, providerKey])`, `scope` default `"default"`), `:1374` `IntegrationCredential` (`tokenBlob` stored **plaintext**; comment claims "encrypted"), `:1384` `IntegrationLog`.
- **Tenancy gap** — `Integration` is **not** in `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts` — grep returns no match). It carries a custom `scope` string, hardcoded `"default"` at every call site, so connections are **global, not per-tenant**.

## Scope (what "shipping this phase" concretely means)
Turn the simulated hub into a small number of **real** connectors plus an honest UI, without claiming 24 live integrations.
1. **2–3 real outbound connectors** behind the existing `sendThrough` surface: Slack (`chat:write` webhook/bot), one email path (reuse the real SendGrid/Resend keys already validated), and Twilio SMS — implemented as `lib/integrations/{slack,twilio}.ts` adapters that `sendThrough` dispatches to.
2. **Wire `sendThrough` into a real producer** — e.g. Phase 12 alerts/council recommendations call it so a connected Slack/email tile actually streams output (the doc's wow moment).
3. **Honest state in the UI** — render `functionalState`/`FUNCTIONAL_STATE_LABEL` pills so 22 non-live tiles read "Infrastructure ready"/"Coming soon" instead of a fake "Connect → Connected".
4. **Security** — encrypt `IntegrationCredential.tokenBlob` (the in-code NS-4 follow-up the detail page admits is owed).
5. **Per-tenant isolation** — make `scope` the tenant slug instead of `"default"`, register `Integration` in `TENANT_SCOPED_MODELS` per `docs/architecture/ISOLATION.md`.
6. **(Optional) signature flip animation** — 320ms Y-axis tile flip on connect.

## Files to touch
- **New:** `lib/integrations/slack.ts`, `lib/integrations/twilio.ts`, `lib/integrations/email.ts` (real send adapters); `lib/integrations/crypto.ts` (token encrypt/decrypt); `lib/integrations/dispatch.test.ts`; `app/api/integrations/[provider]/callback/route.ts` (OAuth callback for Slack); `lib/integrations/oauth.ts`.
- **Modified:** `lib/integrations/runtime.ts` (`sendThrough` dispatches to adapters; `connectProvider` encrypts token); `app/(app)/integrations/actions.ts` (drop/finish `connectAndOpen`; route real OAuth providers to callback); `app/(app)/integrations/page.tsx` + `[key]/page.tsx` (render `functionalState` pills; gate fake Connect on non-live tiles); `app/(app)/integrations/integrations.css` (flip animation); `lib/integrations/catalog.ts` (flip `slack`/`twilio` to `READY_FOR_SETUP`/`LIVE`); `lib/workspaceScope.ts` (add `Integration`); `prisma/schema.prisma` (tokenBlob comment / scope semantics); a Phase-12 producer file to call `sendThrough`.

## Risks (technical + product, ranked)
1. **Plaintext credentials (HIGH, security).** `tokenBlob` is stored raw; schema comment falsely says "encrypted." Real Slack/Twilio tokens make this a live secret-leak surface. Must encrypt before any real token lands.
2. **No tenant isolation (HIGH).** Hardcoded `scope="default"` means one tenant's Slack connection is visible/usable group-wide — violates the project's isolation rule. Migrating `"default"` rows needs a backfill.
3. **Honesty/pitch risk (HIGH, product).** Every tile currently fakes a Connect→Connected handshake. Demoing "24 live integrations" when 22 are mocks undermines the readiness posture (`docs/phases/READINESS.md` — prototype, not production).
4. **OAuth secrets + callbacks (MEDIUM).** Real Slack/Google OAuth needs client IDs/secrets in env, redirect URIs registered, and a `/api/` callback route — none exist yet.
5. **Dormant/dead code (LOW).** `sendThrough` is unwired and `connectAndOpen` is unreachable; shipping without removing them leaves confusing surface.
6. **Outbound cost/rate limits (LOW).** Twilio SMS and email send cost money; needs a per-tenant cap (mirror Phase 14's 4/day push budget).

## Recommended slice size (2–4 landable PRs)
- **PR 1 — Honest UI + cleanup (behaviour-preserving).** Render `functionalState` pills, gate the fake Connect button on non-`READY_FOR_SETUP`/`LIVE` tiles, delete dead `connectAndOpen`. No new I/O, pure truthfulness.
- **PR 2 — Security + isolation (behaviour-preserving).** Encrypt `tokenBlob` via `lib/integrations/crypto.ts`, fix the schema comment, switch `scope` to tenant slug, register `Integration` in `TENANT_SCOPED_MODELS`, backfill `"default"` rows.
- **PR 3 — One real connector (Slack).** Real OAuth callback route + `lib/integrations/slack.ts`; `sendThrough` dispatches to it; flip Slack to `LIVE`. Optional 320ms flip animation.
- **PR 4 — Wire the producer + 2nd connector.** Have a Phase-12 alert/council path call `sendThrough`; add Twilio SMS adapter with a per-tenant send cap. Delivers the doc's wow moment with live output.
