# H-Nerve — Security & Threat Model

> **Purpose:** name the assets, the trust boundaries, the threats, and the
> controls — so security is designed, not bolted on. Grounded in the actual auth
> (`lib/session.ts`), tenancy (`lib/workspaceScope.ts`, `docs/ISOLATION.md`), and
> brain architecture, plus the RAG security analysis (RE-INFRASTRUCTURE-PLAN §2).
> Owner: platform + security. Last-updated: 2026-06-02.
> Part of the spec set in `docs/RE-INFRASTRUCTURE-PLAN.md` §3.

---

## 1. Assets to protect

1. **Tenant business data** — financials, contracts, customers, inventory. The
   crown jewels; multi-tenant, must never cross tenant boundaries.
2. **Operator credentials & sessions** — bcrypt-hashed passwords, iron-session
   cookies.
3. **The Brain's integrity** — its causal graph, learned patterns, and the
   federation patterns shared across tenants.
4. **Superadmin capability** — the `(admin)` console + `prismaUnscoped` can see
   all tenants; compromise here is total.

## 2. Trust boundaries

```
Public internet ─▶ [Next app: middleware + (app)/(admin) layouts]
                       │  auth gate (iron-session) + role gate
                       ▼
                 [Server actions / API routes]  ── zod validation
                       │  Prisma $use scoping (company/tenant)
                       ▼
                 [PostgreSQL]   ◀── prismaUnscoped (escape hatch, audited)
                       ▲
                 [Brain engine / cron] ── read-mostly; federation = cross-tenant
```

The two hardest boundaries: **tenant ↔ tenant** (isolation middleware) and
**operator ↔ superadmin** (role gate + unscoped access).

## 3. Threats & controls (STRIDE-flavored)

### 3.1 Cross-tenant data leak — *the top risk*
- **Threat:** a query in tenant A returns tenant B's rows (missing scope, wrong
  `prismaUnscoped` use, a new model not added to a scoped set).
- **Controls:** the pure `workspaceScope` middleware (ADR-005), unit-tested;
  every `prismaUnscoped` site carries `// CROSS-TENANT INTENT:`; new tenant-keyed
  models **must** join `TENANT_SCOPED_MODELS`. See `docs/ISOLATION.md` checklist.
- **Gap:** no automated test asserts that *every* tenant-keyed model is in a
  scoped set — a new model can be added uncovered. **Add a guard test.**

### 3.2 Authentication / session
- **Threat:** session forgery, weak passwords, fixation.
- **Controls:** iron-session signed cookies (ADR-001); bcrypt hashing; both
  `(app)` and `(admin)` layouts re-fetch the user and `redirect("/logout")` on a
  stale session. `isSafeId()` rejects malformed IDs.
- **Recommendations:** enforce password strength at signup; set a session TTL;
  rate-limit `loginAction`.

### 3.3 Authorization / privilege escalation
- **Threat:** a STAFF user reaching ADMIN actions or another role's pages.
- **Controls:** `requireRole()` hierarchy (`lib/authz.ts`); the `(admin)` layout
  hard-gates `role === "ADMIN"`; flag-gated `RolePermission` path checks
  (`H_NERVE_PERMS_ENFORCED`).
- **Gap:** the `(app)/admin/*` ERP routes are demo-gated to any signed-in user;
  production must hard-gate. Track as a pre-launch item.

### 3.4 Injection (prompt + corpus) — *RAG-specific, grows with the rebuild*
- **Threat (prompt):** a user crafts input that overrides the brain's system
  prompt or exfiltrates it (jailbreak, gray-box, probing).
- **Threat (corpus poisoning):** the dominant RAG risk (RE-INFRASTRUCTURE-PLAN
  §2/§7). The book shows poisoning **0.04%** of a corpus → 98% attack success,
  and the obvious defenses (paraphrase, perplexity, dedup) **fail**. For H-Nerve
  the danger zone is **federation** (`FederationPattern`): a malicious tenant
  could poison cross-tenant learning.
- **Controls (current + to build):** the brain is **read-mostly** (ADR-003) so a
  poisoned suggestion can't auto-mutate domain data; Phase 22 **verifier** grounds
  numeric claims against facts (a poisoning tripwire); citations give provenance.
- **To build:** per-tenant access control on any retrieval corpus; **never let
  raw tenant data cross via federation — only anonymized patterns**; validate/
  bound federation inputs; treat the document corpus (Phase RAG-3) as an attack
  surface, not a trusted oracle.

### 3.5 SSRF / external calls
- **Threat:** integrations + web-augmentation tools fetching attacker-controlled
  URLs; secrets leaking to logs.
- **Controls:** `IntegrationCredential` stores secrets; the structured logger
  (`lib/logger.ts`) must never log secret **values** (logs presence only — see
  `lib/env.ts`). Allowlist outbound hosts for integrations.

### 3.6 Tampering / repudiation
- **Controls:** `ActivityLog` + `ImportLog`/`IntegrationLog` provide an audit
  trail; soft-delete (→ Trash) makes destructive actions recoverable.
- **Recommendation:** ensure superadmin and cross-tenant (`prismaUnscoped`)
  reads are audit-logged.

### 3.7 Denial of service / cost
- **Threat:** unbounded LLM calls (cost runaway), expensive queries.
- **Controls:** the narrator caches by `factsHash`; `narrate` clamps topic/facts
  payload size; Railway `restartPolicyMaxRetries=3` bounds crash loops.
- **Recommendation:** rate-limit `/api/converse` and brain endpoints per user.

## 4. Pre-launch security checklist
- [ ] Hard-gate `(app)/admin/*` to the right roles (remove demo gate).
- [ ] Add the "every tenant-keyed model is scoped" guard test (3.1 gap).
- [ ] Password strength + login rate-limit + session TTL.
- [ ] Audit-log all `prismaUnscoped` / superadmin reads.
- [ ] Federation input validation + anonymization proof (3.4).
- [ ] Confirm no secret values in logs.
- [ ] Rotate `SEED_ADMIN_PASSWORD`; ensure `/api/seed` is disabled/idempotent in prod.
- [ ] Run `/security-review` on the diff before each release.

## 5. The dual nature
RAG/retrieval is both a **risk surface** (corpus poisoning) and a **control**:
grounding answers in cited, verifiable evidence is itself a defense against
hallucinated/forged claims. The read-mostly boundary (ADR-003) is the single
most important security property — preserve it.
