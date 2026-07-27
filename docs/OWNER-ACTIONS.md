# Owner Actions — the two things only Anas can do

Everything else on the 100/100 readiness list is code and ships as PRs.
**These two need a credential, so they are yours.** Both are pure env-var
swaps: no code change, no deploy of new code — set the secret, redeploy the
Worker, done.

Status legend: 🔴 blocks the "our Brain" claim · 🟠 quality, not correctness.

---

## 1. 🔴 Real Anthropic key — take the Brain off the OpenRouter middleman

**Today:** `src/lib/brain/llm.ts` picks a provider in this order —

1. `ANTHROPIC_API_KEY` → direct Anthropic Messages API (**preferred**)
2. `OPENROUTER_API_KEY` → OpenRouter's OpenAI-compatible gateway (**what prod uses now**)
3. neither → deterministic STUB mode

So the brain already prefers Anthropic. The key is simply absent, and it falls
through to the gateway. Setting it flips the whole brain — council, narrator,
planner, converse, doc-intel Vision — to a direct line, with **zero code
changes**.

**Do this:**

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Paste the key when prompted (it is never echoed, never written to a file).

Then redeploy so the running Worker picks it up:

```bash
gh workflow run cloudflare-deploy.yml
```

**Verify:** open `/brain/council` on production — the engine badge reads
**live**. `/api/ready` also reports the LLM flag.

**Optional tuning** (only if you want a specific model):
`ANTHROPIC_MODEL`, `BRAIN_COUNCIL_MODEL`. Leave unset for the defaults.

**Note:** leave `OPENROUTER_API_KEY` set. It stays as the automatic fallback if
the Anthropic key ever hits a rate limit — belt and braces, no conflict, since
Anthropic wins whenever it is present.

---

## 2. 🟠 Embedding key — turn RAG from "rough" to fully semantic

**Today:** `src/lib/brain/embeddings.ts` falls back to a deterministic **local
hash embedder** when no provider key is set. Retrieval works, but matching is
blunt — it will sometimes surface a less-relevant document, which undercuts the
"the brain answers from *your* data" pitch line.

Provider precedence in the code:

1. `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) — **recommended, has a free tier**
2. `VOYAGE_API_KEY`
3. `OPENAI_API_KEY`
4. `EMBEDDING_API_KEY`

**Do this** (Gemini — free tier is enough for this workload):

```bash
npx wrangler secret put GEMINI_API_KEY
```

Get the key at <https://aistudio.google.com/apikey>. Then redeploy as above.

**Verify:** `/brain/iq` — `ragQuality` telemetry starts reporting real
context-relevance scores instead of local-fallback numbers.

**Safety net:** any API error at runtime falls back to the local embedder
automatically. A bad or expired key degrades quality; it never breaks the app.

**Prerequisite for Graph RAG:** the causal graph must have nodes. If
`/brain/graph` looks empty on a fresh tenant, run
`scripts/seed/seed-brain-local.ts` against that database.

---

## 3. 🟠 Put a token WITH D1 access into the GitHub secret

**The precise problem (measured, not guessed).** The token stored in the
`CLOUDFLARE_API_TOKEN` GitHub secret has **no D1 permission at all** on this
account. It deploys the Worker fine — that's a different scope — but every D1
call is rejected:

- query endpoint → `code 7403` *"not authorized to access this service"*
- export endpoint → `code 10000` *authentication error*

Runs [30125859202](https://github.com/Anas-Hassiba-2030/h-nerve-erp/actions/runs/30125859202),
[30296159132](https://github.com/Anas-Hassiba-2030/h-nerve-erp/actions/runs/30296159132),
and [30296405497](https://github.com/Anas-Hassiba-2030/h-nerve-erp/actions/runs/30296405497)
all show it — including one **after** a D1 Edit was granted. That signature
means the permission you granted landed on a **different token** than the one CI
uses. Re-editing that other token will not help; the secret has to hold a token
that itself has D1 access.

**Do this — the reliable path (create fresh, replace the secret):**

1. <https://dash.cloudflare.com/profile/api-tokens> → **Create Token** →
   *Custom token*.
2. Permissions (on the account that owns `h-nerve-erp-db`):
   - **Account · D1 · Edit**
   - **Account · Workers Scripts · Edit** (so this one token can also deploy,
     if you want to use it for both)
3. Account Resources → include the correct account. Create, copy the value.
4. Put it into the GitHub secret (repo → Settings → Secrets and variables →
   Actions → `CLOUDFLARE_API_TOKEN` → Update), **or** via CLI:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   ```
   Paste the value when prompted (it is never echoed).
5. Trigger the backup:
   ```bash
   gh workflow run d1-backup.yml
   ```

**Verify:** the run's first step, **"Verify token can reach D1"**, now passes
(it prints `✔ token can read D1`), the export runs, the drill goes green, and an
artifact `d1-backup-<run-id>` appears. If the token is still wrong, that first
step fails fast with this exact fix printed in the log — no raw API stack trace.

Until then, **production has no automated backup.** The scripts and the drill
are proven (74 tables / 1534 rows against the dev database); only the remote
export is blocked, and only on this credential.

> ⚠️ The export makes the database briefly **unavailable to serve queries**.
> It's scheduled for 02:30 UTC (05:30 Jordan) for that reason. Avoid running it
> by hand during business hours.

---

## Never do this

- **Do not put either key in a tracked file** — not `.env.example`, not
  `wrangler.jsonc`, not a comment, not a commit message. `wrangler secret put`
  is the only correct path; it stores the value encrypted on Cloudflare and it
  never touches the repo.
- **Do not paste a key into a chat or an issue.** If one is ever exposed,
  revoke it at the provider first, then set a fresh one.

---

## Everything else is handled in code

| Gap | Owner | Where it lands |
|-----|-------|----------------|
| #1 Anthropic key | **you** | this doc |
| #2 Multi-row write atomicity | Claude | PR — `$transaction` triage |
| #3 Error monitoring / alerting | Claude | PR — `src/lib/observability/` |
| #4 D1 backup + restore drill | Claude, **blocked on you** | scripts shipped + drilled; remote export needs §3 |
| #5 Embedding key | **you** | this doc |
| #6 Cold-start latency | Claude | measured, not guessed |
| #7 E2E coverage of mutations | Claude | PR — `e2e/` specs |

Full gap rationale: `docs/AUDIT-2026-06.md`.
