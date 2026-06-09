# Brain ⇄ Database Link Runbook

Everything you need to point the brain (and the brain-MCP) at a database **without struggling**. Verified against the running system, 2026-06-09.

## TL;DR — always do this first

```bash
npm run brain:doctor      # read-only, no API keys, no cost — proves the link
npm run brain:mcp:smoke   # spawns the MCP server + a real client over the wire
```

`brain:doctor` connects, counts the tables the brain reads, runs all 5 read-safe tools end-to-end (`pullFacts`, `retrieveDocuments`, `recallMemory`, `causalSubgraph`, `simulate`), and prints **"Link is good"** or **"Link is broken"** with the exact fix. (`councilDebate` + `narrate` write on each call, so they aren't probed read-only.) Run it against *any* DB before wiring anything.

---

## THE #1 RULE — provider must match the URL, then regenerate

Two independent things must agree:
1. the **datasource provider** in `prisma/schema/schema.prisma`
2. the **`DATABASE_URL` scheme** in `.env`

A `postgresql`-generated client **physically cannot open a SQLite file**, and vice-versa. **After every provider change you MUST run `npx prisma generate`** — skipping it is the #1 cause of "the brain stopped reading the DB." The doctor detects a mismatch and prints the fix.

---

## Link to LOCAL SQLite (offline pitch / zero cost)

```bash
# 1. prisma/schema/schema.prisma → set:  provider = "sqlite"
# 2. .env → set:                          DATABASE_URL="file:./dev.db"
npx prisma generate          # regenerate client for sqlite
npm run db:push              # create the schema (guarded against prod)
npm run db:seed              # canonical Hourani data + admin login
npx tsx scripts/seed/seed-brain-local.ts   # graph + memory + council (so /brain/* isn't empty)
npm run brain:doctor         # verify
```

No API keys needed → STUB brain + local-fallback embedder, **zero cost**.
**Flip the provider back to `postgresql` before committing** (project doctrine — the committed schema is always Postgres).

## Link to PROD Postgres (Neon / Railway)

```bash
# 1. prisma/schema/schema.prisma → keep:  provider = "postgresql"   (the committed default)
# 2. .env → set:  DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"
npx prisma generate
npx prisma migrate deploy    # apply migrations — NOT db push (migrations are the prod source of truth)
npm run brain:doctor         # verify
```

On **Railway none of this is manual**: `railway.toml` `buildCommand` runs `prisma generate`, `preDeployCommand` runs `prisma migrate deploy` + idempotent seeds, and DATABASE_URL is injected automatically.

**`DATABASE_URL` formats:**
- SQLite → `file:./dev.db` (resolved relative to `prisma/` → the file lives at `prisma/dev.db`).
- Neon **pooled** (runtime) → host contains `-pooler`; append `?sslmode=require` (optionally `&pgbouncer=true&connection_limit=1`).
- Neon **direct** (run `migrate deploy` here) → same host **without** `-pooler`. `sslmode=require` is mandatory for Neon.

---

## ⚠️ Destructive-command guard — know this

- `db:push` / `db:seed` / `db:reset` / `db:fresh` / **`build`** are prefixed with `node scripts/ops/guard-not-prod.js`, which **refuses** to run when `DATABASE_URL` points at prod (markers: `neon.tech`, `supabase.co`, `amazonaws.com`, `pooler`). SQLite (`file:`) passes through.
- `npm run build` runs `prisma db push --accept-data-loss` — now guarded, so it can't nuke a prod schema by accident. (Railway uses its own safe `buildCommand`, never `npm run build`.)
- For prod **schema** changes use `npx prisma migrate deploy`; for prod **data** use the upsert-only seeds.

---

## Wire the brain-MCP into Claude Desktop (or any MCP client)

Three things must be right or it won't link (all three verified the hard way):

1. **`cwd` = repo root.** The brain tool tree imports via the `@/*` tsconfig alias, which tsx resolves against the process CWD. Without `cwd`, the server crashes at import with `Cannot find module @/lib/db/db` and the client just sees "connection closed."
2. **Scope vars go in the `env` block, not `.env`.** tsx doesn't load `.env`, and the scope resolver reads `process.env` at startup before Prisma ever touches `.env`.
3. **On Windows use `npx.cmd`** (or `cmd /c npx ...`), not bare `npx`.

Paste-ready `mcpServers` entry (Windows):

```jsonc
{
  "mcpServers": {
    "h-nerve-brain": {
      "command": "npx.cmd",
      "args": ["tsx", "scripts/ops/brain-mcp.ts"],
      "cwd": "C:\\Users\\hp\\Downloads\\BMV2026",
      "env": {
        "DATABASE_URL": "file:./dev.db",
        "H_NERVE_MCP_WORKSPACE": "<companyId>",
        "H_NERVE_MCP_TENANT": "<tenantSlug>"
      }
    }
  }
}
```

For a quick local/demo run with no scoping, replace the two scope vars with `"H_NERVE_MCP_ALLOW_UNSCOPED": "1"`. The server is **fail-closed**: it refuses to boot unless BOTH scope vars are set (one tenant) or `ALLOW_UNSCOPED=1` (all tenants — local only). Setting only one scope var is rejected.

**Lazy connect:** `server.connect()` + `listTools()` touch no DB — a bad `DATABASE_URL` only surfaces on the first real `callTool`. Don't trust the `[brain-mcp] up` banner alone; `npm run brain:mcp:smoke` proves the actual read path.

### Run it from a shell (PowerShell — this machine's default)

```powershell
$env:H_NERVE_MCP_WORKSPACE='<companyId>'; $env:H_NERVE_MCP_TENANT='<slug>'; npm run brain:mcp
# or unscoped:
$env:H_NERVE_MCP_ALLOW_UNSCOPED='1'; npm run brain:mcp
```

bash/macOS: `H_NERVE_MCP_WORKSPACE=<companyId> H_NERVE_MCP_TENANT=<slug> npm run brain:mcp`

### Where to get the scope values

- **`H_NERVE_MCP_TENANT`** = a `Tenant.slug`. Canonical set (`lib/tenancy/tenancy.ts`): `hourani-hotels`, `maha-dairy`, `loran-agri`, `tank-incubator`.
- **`H_NERVE_MCP_WORKSPACE`** = a `Company.id` (cuid). Get it via `npx prisma studio` → Company table, or `prisma.company.findMany({ select: { id, code, name } })`.
- The two axes are independent: workspace/companyId scopes Hotel/DairyBatch/Farm/AIInsight; tenantSlug scopes Booking/Crop/Product/etc. Set **both** to isolate one tenant.
- **Known limitation:** `Document` and `Memory` have no tenant column, so even scoped, the MCP reads documents + episodic memory **group-wide**. Safe in the current single-tenant deployment only — see `docs/proposals/BRAIN-MCP-TENANCY-MIGRATION.md`.

---

## Keys & modes (all optional, all degrade gracefully)

| Key | Effect when absent |
|-----|--------------------|
| `ANTHROPIC_API_KEY` | STUB mode — deterministic editorial output. Never throws; zero cost. Cap: `BRAIN_MAX_LLM_CALLS` (default 200), timeout `BRAIN_LLM_TIMEOUT_MS` (20s) → degrade to stub. |
| `GEMINI_API_KEY` › `OPENAI_API_KEY` › `VOYAGE_API_KEY` | Local 256-dim hash embedder — semantic but rougher. A bad key/network blip auto-falls-back to local; never crashes. |

**⚠️ Re-embed after enabling an embedding provider.** Memories seeded under the local embedder are stored at 256 dims; after you set a provider key the query embeds at ~1536 dims. The brain now **skips** dimension-mismatched stored vectors (a clean miss, not noise) — but to actually use the better embeddings, re-run the memory seed so stored vectors match the active provider. The keyless doctor cannot detect this.

---

## What's empty vs what throws (graceful degradation)

| Condition | Behavior |
|-----------|----------|
| Empty/unseeded causal graph | `causalSubgraph` → `{nodes:[],links:[]}`, `simulate` → `{impacts:[]}` — no throw |
| No documents / no memories | `retrieveDocuments` / `recallMemory` → empty — no throw |
| Read-only / write-denied DB | `narrate` + `councilDebate` skip their cache/log writes and still return prose — no throw |
| **Partially-migrated DB (missing core table)** | `pullFacts` **throws → `brain_unavailable` 500** (deliberate: returning "no insights" would be a lie). Fix: run `prisma migrate deploy` first. |
| DB unreachable | doctor step-2 hard-fails with a hint; overlay shows a calm "Brain unreachable" turn |

> **READ-WRITE creds:** despite "read-mostly," `councilDebate` writes a `CouncilSession`/`CouncilVoice` and `narrate` writes a `Narrative` cache row on each call. Against a writable prod DB they will write those rows. Want strict isolation? Point the MCP at a copy.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot find module '@/lib/db/db'` on MCP launch | client `cwd` not the repo root | set `cwd` to the repo root in the mcpServers entry |
| `brain-mcp refuses to start` | scope vars not set / only one set | set BOTH scope vars (or `ALLOW_UNSCOPED=1`) **inline / in `env`**, not `.env` |
| First `callTool` errors, boot was fine | provider/URL mismatch (lazy connect) | flip provider to match URL + `npx prisma generate` |
| `npx prisma generate` fails EPERM (Windows) | a running process holds the engine DLL | stop dev server / Prisma Studio / MCP / stray node, delete `node_modules/.prisma/client/query_engine-windows.dll.node.tmp*`, re-run |
| `npm run build` fails: "the URL must start with postgresql://" | committed schema is `postgresql` but `.env` is `file:` (sqlite) | expected for local sqlite — run `npx next build` directly (skips `prisma db push`), or flip the provider to match before building |
| `recallMemory` got worse after adding a key | stored 256-dim vs query ~1536-dim | re-run the memory seed to re-embed |
| MCP works locally, breaks after `npm install` | postinstall regenerated the client for the committed (postgres) provider | re-flip to sqlite + `npx prisma generate` for local dev |

---

*See also: `scripts/verify/brain-db-link.ts` (doctor), `scripts/verify/brain-mcp-smoke.ts` (wire smoke), `lib/brain/mcp/scope.ts` (fail-closed scoping), `docs/SUBAGENTS-AND-MCP-CATALOG.md`.*
