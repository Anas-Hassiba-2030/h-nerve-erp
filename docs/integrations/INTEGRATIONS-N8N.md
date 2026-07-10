# n8n Integration Contract

The n8n automation workflows are an **external** part of the H-Nerve
stack (they run on a separate n8n instance, not inside this Next app).
Until now the workflow JSON lived only in the n8n editor and was **not
reproducible from this repo** — this document fixes that by recording
the contract and giving the export a home.

## Where the workflow JSON lives

Exported workflow JSON belongs in `docs/integrations/n8n/`. Export from n8n
(`⋯ → Download`) and commit the file there. **Strip credentials before
committing** — n8n exports include credential *references* but never
commit a file that contains a resolved API key, DB URL, or webhook
secret. Redact, then commit.

## The contract H-Nerve depends on

H-Nerve does not call n8n directly from server actions. Integration is
webhook-based and lives behind the connectors hub (`lib/integrations/`,
Phase 13). The stable surface n8n must honor:

| Direction | Endpoint / mechanism | Auth | Payload |
|-----------|----------------------|------|---------|
| n8n → H-Nerve | the connector webhook receiver in `lib/integrations/` | shared secret header | JSON event (`type`, `payload`) |
| H-Nerve → n8n | outbound webhook URL stored as an integration credential | per-provider token | JSON change event |

Rules:

- **No secrets in the workflow JSON.** Webhook secrets and tokens are
  configured as n8n credentials and as Vercel env vars — never inlined.
- **Idempotency:** every event carries a stable id; n8n branches must
  treat re-delivery as a no-op.
- **Versioning:** if the payload shape changes, bump a `v` field; do
  not silently repurpose existing fields.

## Restoring / standing up the workflows

1. Spin up n8n (self-host or cloud).
2. Import each JSON file from `docs/integrations/n8n/`.
3. Recreate credentials in n8n (they are intentionally absent from the
   committed JSON).
4. Point the outbound webhook credential at the H-Nerve connector URL.
5. Activate the workflow; send one test event and confirm the connector
   log records it.

> If `docs/integrations/n8n/` contains only this note, the live workflow has
> not yet been exported. Export and commit it (redacted) to make the
> automation reproducible — that is the open action this doc tracks.
