# H-Nerve — API & Server-Action Contract Catalog

> **Source of truth for bodies:** the `actions.ts` files and `app/api/**/route.ts`
> handlers. This catalog is the **map + the contract**: it lists every mutation
> entry point, the rules they all follow, and where to find each. It does **not**
> duplicate per-field input schemas (those live in the files' `zod` schemas and
> would drift). Owner: platform. Last-updated: 2026-06-02.
>
> Part of the spec set in `docs/governance/RE-INFRASTRUCTURE-PLAN.md` §3. Pairs with
> `docs/spec/DATA-MODEL.md`.

---

## 1. The two mutation surfaces

H-Nerve has a deliberate split (see `CLAUDE.md` → "Where mutations live"):

- **Server Actions are the default for CRUD.** `app/(app)/<resource>/actions.ts`,
  `"use server"`. ~150 exported actions across 45 files. Pages stay server
  components and call them via `<form action={serverAction}>`.
- **`app/api/` is reserved** for what actions can't do well: streaming/SSE, file
  exports, public protocol, OAuth-ish webhooks, toast undo. 26 route handlers.
  **Do not** add ordinary CRUD here.

---

## 2. The Server-Action contract (every action follows this)

Verified across the codebase: **103** `requireUser()` calls, **71** `requireRole()`,
**26** `getCurrentUser()`. The shape:

1. `"use server"` at the top of the file.
2. **Auth gate first:** `await requireUser()` (any signed-in user) or
   `await requireRole("MANAGER" | "EXECUTIVE" | "ADMIN")` (`lib/authz.ts`).
   Throws `ForbiddenError` (status 403) when the role is insufficient.
3. **Input:** a `FormData` argument (the canonical CRUD shape:
   `createX(formData)`, `updateX(id, formData)`, `deleteX(formData)`), or a typed
   argument for non-form calls (e.g. `setAsOfTimestamp(ts: number)`,
   `narrate(input)`).
4. **Validate with `zod`** before any write. Reject malformed input.
5. **Write via the scoped `prisma` client** — never `prismaUnscoped` from a user
   action. Tenancy is auto-applied by middleware (`docs/spec/DATA-MODEL.md` §2).
6. **`revalidatePath(...)`** the affected routes, then **`redirect(...)`** if the
   flow navigates, else return `void`. Some return small typed results
   (e.g. `narrate` returns `{ text, cacheHit, isStub, ms, wordCount }`).
7. **User feedback** via the toast/flash cookie (`lib/toast.ts`), not ad-hoc state.

**Errors:** `ForbiddenError` (403) for authz; zod errors for bad input; otherwise
the action throws and Next surfaces the error boundary. Soft-deletable resources
"delete" by setting `deletedAt` (→ Trash), not a hard delete.

### Canonical CRUD reference
**Companies** (`(app)/companies/actions.ts`) and **Hotels**
(`(app)/hotels/actions.ts`) are the reference pattern — mirror them for any new
resource (list + create + edit + delete via actions, Topbar + KPI cards on the
index).

---

## 3. Server-action index (by resource)

Format: `resource (file)` → exported actions. Purpose is inferable from the name;
read the file for the zod schema + body.

### Sector verticals
- **companies** — createCompany · updateCompany · deleteCompany
- **hotels** — createHotel · deleteHotel · createBooking · deleteBooking · setBookingStatus
- **dairy** — createBatch · setBatchStatus · deleteBatch
- **farms** — createFarm · updateSensors · deleteFarm · createCrop · deleteCrop
- **education** — createProgram · setProgramStage · deleteProgram

### Finance & supply chain
- **finance** — createTransaction · deleteTransaction · bulkDeleteTransactions
- **supply-chain** — createForecast · setForecastStatus · deleteForecast · restoreForecast · autoGenerateForecasts · approveForecast · rejectForecast
- **projects** — createProject · setProjectStage · deleteProject · restoreProject

### Operator workspace & productivity
- **workspace** — advanceBatchStatus · updateProjectBudget · assignProjectOwner · advanceProjectStage · dismissSignal · acceptSignal
- **tasks** — createTask · setTaskStatus · deleteTask · bulkSetTaskStatus · bulkDeleteTasks · restoreTask
- **insights** — createInsight · setInsightStatus · deleteInsight · bulkResolveInsights · bulkDeleteInsights · restoreInsight · generateInsightPlan · runAiEngine
- **alerts** — toggleRule · updateRule · seedRules · deleteRule
- **messages** — sendMessage · startDirectThread · markRead
- **digest** — generateNewDigest
- **trash** — restoreOne · purgeOne · restoreSelected · purgeSelected · purgeAllExpired
- **documents** — uploadDocument · commitDocument · deleteDocument

### The Brain (read-mostly — these write brain tables, never domain data)
- **brain/graph** — rebuildBrainGraph · rebuildBrainGraphReport · clearBrainGraph
- **brain/council** — convene · deleteSession
- **brain/memory** — seedMemories · deleteMemory · clearMemories · recallMemories
- **brain/iq** — reflectNow · approveReport · rejectReport · seedHistory · clearMetaHistory
- **brain/learning** — learnNow · seedFeedback · togglePattern · unlearnPattern · deletePattern · clearAllFeedback
- **brain/benchmarks** (federation) — optInFederation · optOutFederation · refreshFederation · seedFederationPeers · clearFederation
- **brain/narrate** — narrate (returns typed result; LLM-cached)
- **memory** — forgetMemory · plans — generateFromCouncil · generateFromInsight · commit · abandon · markStepDone · markStepBlocked · deletePlan
- **admin/brain** — runAnalysis · dismissInsight · resolveInsight

### Workflows & integrations
- **workflows** — createWorkflow · addNode · deleteNode · updateNodeConfig · addEdge · deleteEdge · toggleWorkflow · testRunWorkflow · deleteWorkflow · seedExampleWorkflows · createWorkflowFromTemplate
- **integrations** — connect · disconnect · saveSettings · connectAndOpen · connectWithApiKey

### Superadmin console — `(admin)/admin/*` (ADMIN-gated by the (admin) layout)
- **users** — createUser · updateUser · resetPassword · setActive · deleteUser
- **tenants** — createTenant · runProvisioningStep · viewAsTenant · clearViewAs · deleteTenant
- **genesis** — runGenesisSeed
- **permissions-preview** — togglePermission

### ERP admin — `(app)/admin/*` (tenant-scoped business data)
- **products** — adjustStock · setReorderPoint
- **suppliers** — createSupplier · updateSupplier · deleteSupplier
- **customers** — createCustomer · updateCustomer · deleteCustomer
- **warehouses** — createWarehouse · updateWarehouse · deleteWarehouse
- **purchase-orders** — createPurchaseOrder · markPurchaseOrderSent · receivePurchaseOrder · cancelPurchaseOrder
- **sales-orders** — createSalesOrder · confirmSalesOrder · fulfillSalesOrder · cancelSalesOrder
- **accounts** — createLedgerAccount
- **transfers** — createTransferAction
- **mappings** — createMapping · updateMapping · toggleMappingActive · deleteMapping
- **imports** — clearTestImports

### Shared cross-cutting — `app/actions/*`
- **council.ts** — shareInsightToCouncil · replyToDiscussion
- **preferences.ts** — setLocale · setTheme · setSidebarCollapsed
- **timemachine.ts** — setAsOfTimestamp · clearAsOf
- **workspace.ts** — enterWorkspace · exitWorkspace · enterWorkspaceByPath

### Mobile surface — `app/m/actions.ts`
- dismissInsight · approveWorkflowRetry · reconnectIntegration

### Auth — `app/(auth)/*`
- **login** — loginAction · **signup** — signupAction

---

## 4. API routes (`app/api/`)

Reserved for non-CRUD. Method + purpose + auth posture.

| Route | Methods | Purpose | Auth |
|---|---|---|---|
| `/health` | GET | Liveness probe (DB + env), Railway healthcheck | none (public) |
| `/ready` | GET | Readiness probe (stricter: seeded, LLM key) | none |
| `/realtime` | GET, POST, DELETE | Presence heartbeat + scope read | session |
| `/realtime/stream` | GET | SSE presence stream | session |
| `/converse` | POST | Brain conversational endpoint (streaming) | session |
| `/search` | GET | Global search | session |
| `/brain/cron` | GET | Scheduled brain jobs (self-tuning, federation) | cron secret |
| `/brain/insights` | GET | Insight feed | session |
| `/learning/patterns` | GET | Brain learning patterns feed | session |
| `/memory` | GET | Memory recall feed | session |
| `/messages/discuss` | POST | Council discussion reply endpoint | session |
| `/pins/toggle` | POST | Pin/unpin a resource | session |
| `/toast/undo` | POST | Undo a flashed action | session |
| `/protocol` | GET | Living Protocol clauses | session |
| `/protocol/[id]` | PATCH | Edit a protocol clause | ADMIN/EXEC |
| `/protocol/openapi` | GET | Public OpenAPI descriptor | public |
| `/export/[type]` | GET | Data export (CSV/JSON) | session |
| `/export/html/[type]` | GET | HTML report export | session |
| `/export/system-dump` | GET | Full system dump (cross-tenant) | ADMIN |
| `/empire/summary` | GET | Empire dashboard rollup (cross-tenant) | ADMIN |
| `/import/test` | (handler) | Import pipeline dry-run | session |
| `/seed` | POST | One-time prod seed (password-gated) | `SEED_ADMIN_PASSWORD` |
| `/setup` | POST, GET | First-run setup | gated |
| `/admin/seed-demo` | POST | Seed demo data | ADMIN |
| `/admin/seed-pitch` | POST | Seed pitch data | ADMIN |

---

## 5. Keeping this accurate

- File bodies are authoritative for input schemas (`zod`) and exact behavior;
  this catalog is authoritative for *what exists*, *the contract*, and *auth*.
- When you add an action: gate with `requireUser`/`requireRole`, validate with
  `zod`, write via scoped `prisma`, `revalidatePath` + `redirect`/`return`, and
  **add its name to §3 in the same PR**.
- Future automation (RE-INFRASTRUCTURE-PLAN §1): a script that greps
  `export async function` across `actions.ts` + route methods to regenerate the
  index, so it never drifts.
