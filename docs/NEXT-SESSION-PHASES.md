# Phases to continue tomorrow

Carry-over from V3-final / pre-pitch sweep — work that's NOT a pitch
blocker, scheduled for a focused follow-up session.

## Phase NS-1 — Supply chain → PurchaseOrder bridge
Today `approveForecast` flips SupplyForecast.status to APPROVED and
logs the activity. The next step is to create a draft cross-tenant
PurchaseOrder from the Hotel tenant to the Maha/Loran tenant linked
via a new SupplyForecast.linkedPurchaseOrderId column.
- Schema migration: add `linkedPurchaseOrderId String?` to
  SupplyForecast.
- Wire `approveForecast` to upsert a PurchaseOrder skeleton + line.
- /supply-chain card shows "View linked PO" once linked.

## Phase NS-2 — Messages image upload
`Message.imageUrl` schema is landed. Need:
- `/api/uploads/messages` POST endpoint (multipart) writing to
  `public/uploads/messages/{messageId}.{ext}`.
- Paperclip icon in MessageComposer, file picker, optimistic upload.
- Inline `<img>` render in the recipient bubble at max 60% width.

## Phase NS-3 — Workflows starter-template gallery
Today /workflows has "Seed two examples" + "Start from scratch".
Upgrade:
- A small gallery of 4-6 named templates (Low-stock → notify;
  Booking spike → forecast; Brand monitoring → council; etc.)
- "Clone" button per template duplicates the workflow under the
  current user's tenant.
- Templates ship via `lib/workflows/seed.ts` extension.

## Phase NS-4 — Integrations functional: SendGrid + Resend
API-key path for the two non-OAuth connectors. Real validation:
- SendGrid: GET https://api.sendgrid.com/v3/user/profile (200 OK = key valid)
- Resend: GET https://api.resend.com/domains (200 OK = key valid)
- Persist encrypted blob in IntegrationCredential.tokenBlob
- "Send test" button that posts a real email
Once both work, flip both back to `functionalState: READY_FOR_SETUP`
in `lib/integrations/catalog.ts`.

## Phase NS-5 — Slack OAuth (and other connector wiring)
Multi-day. Needs:
- Slack app registered at api.slack.com/apps (USER ACTION).
- CLIENT_ID + CLIENT_SECRET + SIGNING_SECRET env vars on Vercel.
- OAuth callback route at /api/integrations/slack/callback.
- Webhook receiver at /api/integrations/slack/webhook.
- Outbound action: post to channel.
- End-to-end smoke test.

## Phase NS-6 — English seeded titles → Arabic
Long-tail. Many insight titles, council session names, and seeded
copy are English-only. Acceptable for the current pitch demo (the
chrome is Arabic), but post-pitch the seeded text should be
locale-aware via the existing i18n pattern.

## Phase NS-7 — Lag profiling
Needs a Lighthouse report from a real browser session (USER ACTION).
With the report, identify the 3 highest-impact bottlenecks and ship
targeted fixes (React.memo, Suspense boundaries, cache decisions).

## Phase NS-8 — Documents → Graph
Upload + extraction + Anthropic API + entity matching to
Supplier/Customer. The /documents page is currently in "Coming soon"
state; this is the build that delivers it.

## User-only actions (no agent access)

These need YOU because they require login to external services I
don't have credentials for:
- Neon DB password rotation (Neon web console, your account)
- Anthropic API key rotation (console.anthropic.com)
- n8n workflow JSON export → `workflows/n8n/` (your n8n instance)
- Sentry DSN setup (Sentry web console, create project)
