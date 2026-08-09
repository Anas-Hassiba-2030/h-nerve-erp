# What H-Nerve needs to run at 100%

Short answer: **no servers.** It is a Cloudflare Worker plus a D1 database.
There is nothing to provision, patch, or keep alive.

---

## 1. Infrastructure — already live

| Thing | What it is | Status |
|---|---|---|
| Cloudflare Worker | The whole app (Next 16, SSR) | **Live** — `h-nerve-erp.anashasiba91.workers.dev` |
| Cloudflare D1 | The database (SQLite), `DB` binding in `wrangler.jsonc` | **Live** — 135 tables |
| GitHub Actions | Deploy (`cloudflare-deploy.yml`) + the cron jobs | **Live** |

**No VPS. No Postgres. No Redis. No container. No always-on process.**
The Worker starts on a request and stops after it; D1 is managed. Nothing
idles, so nothing costs money while nobody is using it.

Requires a Cloudflare **paid Workers plan** — the app exceeds the free tier's
CPU-time limit per request. That plan is already in place.

---

## 2. Keys — what makes the intelligence live

| Key | Without it | Where |
|---|---|---|
| `ANTHROPIC_API_KEY` **or** `OPENROUTER_API_KEY` | The brain answers in **stub mode** — the app works, the intelligence doesn't | Worker secret |
| `CRON_SECRET` | The scheduled runs return 503 | **Already set** |
| `GEMINI_API_KEY` *(optional)* | Retrieval falls back to a local hash embedder — works, rougher | Worker secret |

Exactly one LLM key is required. Everything else is optional.

---

## 3. Compute — the only real cost

The Worker is not the compute. **LLM inference is**, and it is metered per call.

The system caps it in three places before anything is spent:

1. **Per-shape ceiling** — a run is refused up front if its shape would cost
   more calls than its topology allows.
2. **Per-tenant daily budget** — `BRAIN_TENANT_DAILY_LLM_CALLS`, default **300
   calls/day**. One tick per call that reaches a model.
3. **Proposal cap** — a hard limit on how many proposals reach a human per day,
   regardless of how much the agents thought.

So the ceiling is: **300 calls/day × your model's price per call.** Not a
guess — that is the number the code enforces. Lower the env var to lower the
ceiling.

**Free option for development:** point `LOCAL_LLM_BASE_URL` at Ollama on this
machine and inference costs nothing. Verified working on `qwen2.5-coder:3b`.
This does **not** work in production — the Worker cannot reach a laptop, and
`wrangler.jsonc` sets `global_fetch_strictly_public`, which blocks private
addresses outright. Production-on-local would need a public tunnel.

---

## 4. What is switched off, waiting on a decision

| Switch | Effect | Whose call |
|---|---|---|
| `VOAC_CRON_ENABLED=true` | The agent company runs itself daily. **This is the one that spends money.** | Yours |
| `H_NERVE_MODULES_ENFORCED` | Per-tenant module gating actually gates. Ships inert. | Yours |

---

## 5. Dependencies

17 runtime packages, 18 dev. Full list with the reason for each: **`/voac/stack`**.

No paid third-party services. No SaaS subscriptions. No license fees.

---

## The whole answer in one line

**It already runs.** One LLM key turns the intelligence on; one env var caps
what it can spend; everything else is deployed.
