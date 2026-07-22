# Phase 27 — ERP Module Expansion (gap analysis + enrichment plan)

> **Status:** PLAN (not build). Per `docs/PHASES-INTELLIGENCE.md` § Phase 27 and the standing doctrine, Phase 27 is *planned with Anas* once his ERP sources arrive — they have (2026-06-30). Building starts only at the **checkpoint approval** at the end of this doc.
>
> **Derived from:** `docs/ERP-KNOWLEDGE-BASE.md` (the canonical 13-module ERP taxonomy, theory ⊕ Odoo 19 ⊕ H-Nerve). Read that first.

## 1. The goal

H-Nerve grew vertically (hotels, dairy, agri, education) and is already a real ERP on the **transactional spine** (Finance, Procurement, Inventory, Sales, SCM, BI) and *surpasses* a classic ERP on **intelligence** (the Brain). Phase 27 closes the **horizontal business modules** a vertical-first build postponed, so the platform reads as a complete ERP to anyone who knows the field — and so the pitch can claim full coverage truthfully.

## 2. Gap set & priority

| Pri | Module | Status | Why this rank |
|---|---|---|---|
| **P1** | **CRM** (lead → opportunity → pipeline) | 🔴 | Fast, *visual* win for the pitch; extends existing `Customer`; moderate effort |
| **P2** | **HR / HCM** (employees, org, leave, appraisal) | 🔴 | Biggest functional gap; every ERP has it; defer payroll (locale-heavy) |
| **P3** | **Asset Management** (fixed assets, depreciation, maintenance) | 🔴 | Self-contained; ties into Finance; small surface |
| **P4** | **Manufacturing / MRP** (general BoM + MO + work centers) | 🟠 | Generalizes the dairy-batch special case; heavier |
| **P5** | **Project depth** (board, timesheets, milestones) | 🟠 | Enrich existing `FutureProject`/`Task` |
| **P6** | **WMS depth** (bins, pick/pack, barcode) | 🟠 | Enrich existing `Warehouse`/`InventoryMovement` |
| **P7** | **QMS** (quality control points + checks) | 🟠 | Enrich existing Documents/Protocol; ties to receipts/production |

> **Reconciled to the course's "13 Modules" (CH3, NetSuite framework):** the deck **splits HR into two** — **WFM** (#10: time/attendance/payroll) + **HRM** (#11: records/performance); H-Nerve builds them as **one HR module** (P2). The deck also counts **Ecommerce** (#12) and **Marketing automation** (#13) in the core 13 — both **intentionally out of H-Nerve scope** (B2B group-operations ERP, not a retail storefront); excluded from Phase 27, revisit only if a tenant needs them. **Asset Mgmt, Maintenance, and Quality** come from the deck's layered *ERP Model* (S27–31), not the enumerated 13. Full mapping: `docs/ERP-KNOWLEDGE-BASE.md` §4.

**Recommended sequencing:** P1 → P2 → P3 first (the three 🔴 gaps), then P4–P7 as enrichment waves. Rationale in §6.

## 3. The house pattern (every new module follows this)

Each module is built the same way — mirror **Companies/Hotels** (the canonical CRUD pattern) and the finance schema convention:

1. **Prisma models** in a new `prisma/schema/<module>.prisma` — convention (verified against `finance.prisma`):
   - `id String @id @default(cuid())`
   - `tenantId String` (tenant scoping — **string, not FK**)
   - status/type as `String` with a `// A | B | C` union comment (no DB enums)
   - `deletedAt DateTime?` (soft delete, via `lib/db/softDelete.ts`)
   - `createdAt @default(now())` · `updatedAt @updatedAt`
   - `@@index([tenantId, status])`, `@@unique([tenantId, name])` etc.
2. **Register tenant scoping** — add each new model to `TENANT_SCOPED_MODELS` (`lib/tenancy/workspaceScope.ts`); see `docs/ISOLATION.md`.
3. **Route + server actions** — `src/app/(app)/<module>/page.tsx` (server component, `Topbar` + KPI cards) + `actions.ts` (`"use server"`, `requireUser()`, zod, `prisma`, `revalidatePath`). Wrap every AI/Promise.all call in try/catch + `flashToast({ entity: "info", … })`.
4. **Brain agent pack** — `src/lib/brain/agents/<Module>Expert.ts` extending `base.ts`, registered in `agents/index.ts`. Domain knowledge lives here, not in core.
5. **Orrery entry** — add the section to the orrery routeMap + ConstellationRail (rebuild via `node scripts/build/build-orrery.mjs` — the orbit is **static HTML**; never touch its animation).
6. **Design** — Heritage Modern only (`docs/DESIGN-SKILL.md` §1.D); `<ExportMenu variant="heritage" />`; tabular numerals; ochre focus rings.
7. **i18n** — Arabic-first labels (`lib/i18n/i18n.ts`); English only for codes/emails.
8. **Tests** — pure-unit for any `lib/` logic (`lib/**/*.test.ts`, vitest). Green gate (typecheck + test + lint) before merge. PR only, never push to `main`.

---

## 4. Module specs (the 🔴 gaps — P1–P3)

### P1 · CRM — lead → opportunity → pipeline
**Odoo reference:** track leads, convert lead→opportunity, **pipeline** with stages, lost-reason tracking, sales-team management, quotations, forecasts. **Reuses** the existing `Customer`.

```prisma
// prisma/schema/crm.prisma
model Lead {
  id          String   @id @default(cuid())
  tenantId    String
  name        String          // contact / company name
  email       String?
  phone       String?
  source      String?         // WEB | REFERRAL | EVENT | COLD | IMPORT
  // NEW | QUALIFIED | CONVERTED | LOST
  status      String   @default("NEW")
  ownerId     String?         // -> User.id (sales rep)
  expectedValue Float?
  notes       String?
  opportunity Opportunity?
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([tenantId, status])
  @@index([tenantId, ownerId])
}

model Opportunity {
  id          String   @id @default(cuid())
  tenantId    String
  leadId      String?  @unique
  customerId  String?         // -> Customer.id once it becomes a deal
  title       String
  // NEW | QUALIFYING | PROPOSAL | NEGOTIATION | WON | LOST
  stage       String   @default("NEW")
  amount      Float    @default(0)
  probability Int      @default(10)   // 0-100
  expectedClose DateTime?
  lostReason  String?
  ownerId     String?
  leadRef     Lead?    @relation(fields: [leadId], references: [id])
  activities  CrmActivity[]
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([tenantId, stage])
  @@index([tenantId, ownerId])
}

model CrmActivity {
  id            String   @id @default(cuid())
  tenantId      String
  opportunityId String
  // CALL | EMAIL | MEETING | NOTE | TASK
  type          String
  summary       String
  dueAt         DateTime?
  doneAt        DateTime?
  opportunityRef Opportunity @relation(fields: [opportunityId], references: [id])
  createdAt     DateTime @default(now())
  @@index([tenantId, opportunityId])
}
```
- **Routes:** `/(app)/crm` — a **Kanban pipeline board** (Heritage) with stage columns + drag-to-stage; lead inbox; opportunity detail. KPI cards: pipeline value, win-rate, leads-this-month.
- **Brain:** `SalesPipelineExpert.ts` — scores/forecasts deals, flags stalled opportunities, feeds the council ("which deals are at risk?").
- **Effort:** ~3–4 days. **Deps:** none (Customer exists). **Pitch value:** very high (visual board, "AI deal scoring").

### P2 · HR / HCM — employees, org, leave, appraisal *(payroll deferred)*
**Odoo reference:** Employees (directory, contracts, org chart), Recruitment (applicant pipeline), **Time Off** (request→approve→auto-timesheet), Appraisals, Planning. **Defer Payroll** — Jordan payroll/tax is locale-heavy; phase it later.

```prisma
// prisma/schema/hr.prisma
model Employee {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String?         // -> User.id if they log in
  companyId   String?         // which group company they belong to
  fullName    String
  email       String?
  phone       String?
  positionId  String?
  managerId   String?         // self-relation -> Employee.id
  hireDate    DateTime?
  // ACTIVE | ON_LEAVE | TERMINATED
  status      String   @default("ACTIVE")
  positionRef Position? @relation(fields: [positionId], references: [id])
  leaves      LeaveRequest[]
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([tenantId, status])
  @@index([tenantId, companyId])
}

model Position {
  id         String   @id @default(cuid())
  tenantId   String
  title      String
  department String?         // FINANCE | OPS | SALES | HR | IT ...
  employees  Employee[]
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  @@unique([tenantId, title])
}

model LeaveRequest {
  id         String   @id @default(cuid())
  tenantId   String
  employeeId String
  // ANNUAL | SICK | UNPAID | OTHER
  type       String
  startDate  DateTime
  endDate    DateTime
  // PENDING | APPROVED | REJECTED
  status     String   @default("PENDING")
  reason     String?
  employeeRef Employee @relation(fields: [employeeId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([tenantId, status])
  @@index([tenantId, employeeId])
}

model Appraisal {
  id         String   @id @default(cuid())
  tenantId   String
  employeeId String
  period     String          // "2026-Q2"
  score      Int?            // 1-5
  // DRAFT | SUBMITTED | FINALIZED
  status     String   @default("DRAFT")
  summary    String?
  createdAt  DateTime @default(now())
  @@index([tenantId, employeeId])
}
```
- **Routes:** `/(app)/hr` — directory + **org chart** (manager self-relation), leave calendar/approvals, appraisals. (There's already an `employees` route to absorb/upgrade.)
- **Brain:** `PeopleExpert.ts` — headcount/cost signals, leave-coverage risk, attrition flags.
- **Effort:** ~4–5 days (without payroll). **Deps:** `User`/`Company`. **Note:** reconcile with the existing `employees` route + `User` model — don't duplicate.

### P3 · Asset Management — fixed assets, depreciation, maintenance
**Odoo reference:** Assets in Accounting (capitalization, depreciation schedules) + Maintenance (equipment, preventive/corrective requests). Ties into Finance (`LedgerAccount`/`JournalEntry`).

```prisma
// prisma/schema/assets.prisma
model FixedAsset {
  id            String   @id @default(cuid())
  tenantId      String
  companyId     String?
  name          String
  category      String?         // VEHICLE | EQUIPMENT | BUILDING | IT
  acquisitionCost Float
  acquiredAt    DateTime
  usefulLifeMonths Int
  // STRAIGHT_LINE | DECLINING
  depreciationMethod String @default("STRAIGHT_LINE")
  ledgerAccountId String?        // -> LedgerAccount.id (asset account)
  // ACTIVE | FULLY_DEPRECIATED | DISPOSED
  status        String   @default("ACTIVE")
  entries       DepreciationEntry[]
  maintenance   MaintenanceRequest[]
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([tenantId, status])
  @@index([tenantId, category])
}

model DepreciationEntry {
  id        String   @id @default(cuid())
  tenantId  String
  assetId   String
  period    String          // "2026-06"
  amount    Float
  bookValue Float           // remaining value after this entry
  posted    Boolean  @default(false)  // -> JournalEntry when posted
  assetRef  FixedAsset @relation(fields: [assetId], references: [id])
  createdAt DateTime @default(now())
  @@index([tenantId, assetId])
}

model MaintenanceRequest {
  id        String   @id @default(cuid())
  tenantId  String
  assetId   String
  // PREVENTIVE | CORRECTIVE
  kind      String
  // OPEN | IN_PROGRESS | DONE
  status    String   @default("OPEN")
  scheduledAt DateTime?
  cost      Float?
  notes     String?
  assetRef  FixedAsset @relation(fields: [assetId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tenantId, status])
}
```
- **Routes:** `/(app)/assets` — register, depreciation schedule, maintenance board.
- **Brain:** fold into `FinanceBrain` (depreciation impact) + a maintenance-risk signal; no new pack required.
- **Effort:** ~2–3 days. **Deps:** Finance (post depreciation → `JournalEntry`).

---

## 5. Enrichment specs (the 🟠 partials — P4–P7, sketched)

- **P4 · Manufacturing / MRP** — `prisma/schema/manufacturing.prisma`: `BillOfMaterials` + `BomLine` (component `Product` + qty), `ManufacturingOrder` (status `DRAFT|CONFIRMED|IN_PROGRESS|DONE`), `WorkCenter`. Generalize `DairyBatch` as one consumer of this. Brain: `ProductionExpert.ts`. ~5–6 days. *Deps: Inventory (consume components → produce finished `Product`).*
- **P5 · Project depth** — extend `Task` + add `Project` (link to `FutureProject`), `Milestone`, `Timesheet` (hours per task/employee). Route `/(app)/projects` upgrade to a board + Gantt + timesheet grid. ~3–4 days. *Deps: HR (`Employee` for timesheets).*
- **P6 · WMS depth** — add `StorageLocation` (bin), `PickList`/`PickLine`; extend `InventoryMovement` with from/to location + pick/pack states; barcode entry. ~4 days. *Deps: Inventory.*
- **P7 · QMS** — `QualityControlPoint` (attach to receipt/production step) + `QualityCheck` (pass/fail, measured value). Wire into P2P receipt and P4 MO. ~2–3 days. *Deps: Inventory + Manufacturing.*

---

## 6. Recommendation & first slice

**Build order:** **CRM (P1) → HR core (P2) → Assets (P3)**, then enrichment P4–P7 as a later wave.

Why CRM first: (a) extends `Customer` (no new isolation seam), (b) the **pipeline Kanban** is the single most *demo-able* surface for the pitch ("watch a lead become a won deal, with AI deal-scoring"), (c) moderate effort, (d) gives the Brain a juicy new domain (deal-risk council).

**Concrete first slice (CRM, ~1 day to a working vertical):**
1. `prisma/schema/crm.prisma` with `Lead` + `Opportunity` (skip `CrmActivity` for slice 1) → `db:push` (sqlite dev flip), add both to `TENANT_SCOPED_MODELS`.
2. `/(app)/crm/page.tsx` — server component, `Topbar` (Arabic title "إدارة علاقات العملاء"), KPI cards (pipeline value, open opps, win-rate).
3. `/(app)/crm/PipelineClient.tsx` — Heritage Kanban, columns = stages, drag → `updateStage` server action.
4. `actions.ts` — `createLead`, `convertLeadToOpportunity`, `updateStage`, `markWonLost` (each: `requireUser()` + zod + `prisma` + `revalidatePath` + `flashToast`).
5. Orrery entry + `SalesPipelineExpert.ts` stub.
6. Seed a few demo opportunities; green gate; PR.

## 7. Checkpoint

This is the plan. **Awaiting Anas's go/no-go** on: (a) start building, (b) which module first (recommend **CRM**), (c) confirm payroll is deferred out of the HR slice. Nothing is built until then.

*Generated 2026-06-30. Schema sketches follow the verified `finance.prisma` convention. Companion: `docs/ERP-KNOWLEDGE-BASE.md`.*
