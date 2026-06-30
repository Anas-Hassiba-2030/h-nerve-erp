# ERP Knowledge Base — Theory ⊕ Odoo ⊕ H-Nerve

> **What this is.** The single "whole picture" of Enterprise Resource Planning, fused from three sources and mapped onto this codebase. It serves two readers at once:
> 1. **Anas, the student** — an exam-ready synthesis of the ERP course (Bradford textbook + the 5 chapter decks + study guide).
> 2. **H-Nerve, the build** — the bridge into **Phase 27** (ERP module expansion). Every module below carries a ✅/🟠/🔴 status against what H-Nerve has today.
>
> Companion file: **`docs/spec/PHASE-27-ERP-MODULES.md`** (the actionable gap-analysis + enrichment plan derived from this KB).

## Sources ingested (2026-06-30)

| Layer | Sources | Role |
|---|---|---|
| **Academic theory** | *Modern ERP* — Marianne Bradford, 3rd ed. (**535 pp**) · 5 course decks (CH1 Intro · CH2 BPR · CH3 Model & Modules · CH4 Implementation & Integration · CH5 Enabling Technologies) · Study Guide · ERP+Blockchain essay | The canonical concepts, vocabulary, and exam scope |
| **Real-world reference** | **Odoo 19** official docs — 652 sections crawled across Accounting, Inventory, Manufacturing, Purchase, Quality, Sales, CRM, HR/Payroll/Recruitment/Time-Off, Project/Timesheets/Planning, Contacts | How a modern ERP actually implements each module |
| **The product** | H-Nerve Prisma models, `(app)` routes, brain agents, `docs/PHASES-INTELLIGENCE.md` § Phase 27 | What we already have vs. the gaps |

> Excluded as out-of-scope: the loose `Ch 2–8 .pdf` files (these are a **microeconomics** course — "Principles of Economics: The Production Process", etc.), and `for fully automated ERP system.json` (a **Neon data-pipeline** roadmap, not ERP curriculum — noted in the enabling-tech section).

---

# Part I — ERP Foundations

## 1.1 What ERP is

**Enterprise Resource Planning (ERP)** is *an integrated suite of IT applications that support the operations of an enterprise from a **process** perspective.* (CH1) Its defining traits:

- **Cross-functional** — one system serves many departments (finance, sales, logistics, procurement, HR…).
- **Process-centered** — organized around end-to-end business processes, not isolated departments.
- **Built on a relational database** — **one data store, one source of truth.** Data entered by one department is immediately available to every authorized user.
- **Modular** — sold and deployed in modules; you need not implement them all. *More modules implemented → more integration → more ROI.*

The "single source of truth" is the whole point: Finance closes the books fast, Sales manages all orders, Logistics ships the right goods, Procurement sources and manages suppliers, AP pays on time, and management gets instant performance visibility — all reading and writing the **same** data.

## 1.2 Why it matters / who needs it

A company needs ERP when fragmented, departmental ("siloed") systems cause redundant data entry, reconciliation pain, and no enterprise-wide visibility. Banks and shareholders also depend on the reliable, auditable records an ERP produces.

## 1.3 Evolution (the canonical timeline)

| Era | Stage | Focus |
|---|---|---|
| 1960s | **Inventory control / reorder-point** | Track stock |
| 1970s | **MRP** (Material Requirements Planning) | Explode a BoM + master schedule → what to buy/make and when |
| 1980s | **MRP II** (Manufacturing Resource Planning) | Add capacity, shop-floor, finance feedback loop |
| 1990s | **ERP** | Integrate *all* back-office functions on one database (SAP R/3 era) |
| 2000s | **ERP II / extended ERP** | Reach outward — CRM, SCM, e-business, supplier/customer portals |
| 2010s–now | **Cloud / Postmodern / "Next-Gen" ERP** | SaaS, mobile, analytics/AI, low-code, federated best-of-breed |

H-Nerve sits at the leading edge of that last row — a **cloud, AI-native ("Brain") ERP intelligence layer**. See Part VI.

## 1.4 Advantages vs. disadvantages (exam staple)

**Advantages:** single source of truth · process standardization & automation · real-time cross-functional visibility · faster financial close · better planning/forecasting · stronger compliance & auditability · scalability · improved collaboration.

**Disadvantages / risks:** high cost (license + implementation + TCO) · long, disruptive implementations · organizational change resistance · the "customization trap" (heavy customization → painful upgrades) · process rigidity if BPR is skipped · vendor lock-in · data-migration risk. (Bradford Ch1 §Advantages/§Disadvantages.)

---

# Part II — ERP Technology & Architecture
*(Bradford Ch2: Evolution of ERP Architecture · RDBMS · Normalization · SQL · ERP Data · Configuration · Customization · Best-of-Breed · System Landscape · Cloud · Mobility)*

- **Architecture evolution** — mainframe → **two-tier** client/server → **three-tier** (presentation / application / database) → **web & cloud** (browser/mobile client, multitenant SaaS back end).
- **RDBMS** — the foundation. Data lives in related tables; integrity via keys.
- **Normalization** — organize tables to remove redundancy (1NF→3NF) so each fact is stored once. *This is exactly why ERP gives "one source of truth."*
- **SQL** — the query language every ERP report and integration ultimately speaks.
- **Configuration vs. Customization** — **configure** (use built-in settings to fit your process — preferred) vs. **customize** (write code to change the system — powerful but raises cost and upgrade risk). Rule of thumb: *configure first, customize last.*
- **Best-of-breed vs. single-vendor** — pick the best app per function and integrate, vs. one vendor for everything. Trade-off: capability vs. integration cost.
- **System landscape** — the Dev → Test/QA → Production environment chain (mirrors H-Nerve's local-dev → Railway-prod discipline).
- **Cloud computing & mobility** — SaaS removes infra burden; mobile gives anywhere access. (Bradford Ch2 closes here; CH5 expands it.)

**H-Nerve realization:** PostgreSQL (Railway, prod) + Prisma, three-tier Next.js App Router, `Dev→Railway` landscape, cloud-native, mobile surface at `/m`. The architecture chapter is essentially a description of how H-Nerve is already built.

---

# Part III — Business Process Reengineering (BPR)
*(CH2 deck + Bradford Ch3 "ERP and Business Process Redesign")*

## 3.1 Definition (Hammer & Champy)

> **Reengineering** is *the fundamental rethinking and radical redesign of business processes to achieve dramatic improvements in critical, contemporary measures of performance — cost, quality, service, and speed.*

## 3.2 Why organizations need BPR

- **The 3 C's** driving change: **Customers** (know what they want, will pay for it), **Competition** (relentless pressure on price/quality/service/delivery), **Change** (in people, culture, structure, policy, technology).
- **Techniques lag technology** — firms are technologically capable but not functionally operational.
- **Fragmented, piecemeal systems** — vertical silos with redundant effort; integration across departmental/organizational boundaries is missing.

## 3.3 BPR vs. its softer cousins

| | **BPR (Reengineering)** | **Process Simplification** | **Continuous Improvement (TQM/Kaizen)** |
|---|---|---|---|
| Change | Radical transformation | Incremental | Incremental, ongoing |
| Driver | Vision-led | Process-led | Process-led |
| Leadership | Director-led | Management-led | Team-led |
| Scope | Few, high-impact initiatives | Many simultaneous | Many, continuous |

(Source framing: Coulson-Thomas, 1992, per CH2.)

## 3.4 Why BPR + ERP belong together

Installing ERP on top of broken processes just automates the mess. **Reengineer the process first, then configure the ERP to the improved process.** ERP packages embody industry best-practice processes — adopting them *is* a form of reengineering.

## 3.5 Process modeling

Flowchart vocabulary (CH2): **Activity**, **Document**, **Decision**, **Data (input/output)**. Used to map "as-is" → "to-be" processes before configuration. The two processes every ERP student must know cold are **Order-to-Cash** and **Procure-to-Pay** — see Part VII.

---

# Part IV — The ERP Module Model (the centerpiece)

The course teaches ERP **two complementary ways** (CH3): (a) an enumerated **"13 Modules"** list — the framework your professor uses (it matches the Oracle NetSuite *13 ERP Modules* taxonomy), and (b) a layered **"ERP Model"** (the classic MRP II grid). Both are exam material; both are below. Each module is shown three ways: **academic definition** → **Odoo 19 app** (real-world reference) → **H-Nerve status**.

## 4.1 The "13 Modules" (CH3 slides 12–26 — the exam list)

| # | Module (as the course names it) | Odoo 19 app | H-Nerve today | Status |
|---|---|---|---|---|
| 1 | **Finance** (GL, AP/AR, reporting) | Accounting | `LedgerAccount`, `JournalEntry/Line`, `FinancialPeriod`, `Transaction` | ✅ |
| 2 | **Procurement** | Purchase | `PurchaseOrder/Line`, `Supplier` | ✅ |
| 3 | **Manufacturing** | Manufacturing | `DairyBatch` only — no general BoM/MO | 🟠 |
| 4 | **Inventory Management** | Inventory | `Product`, `InventoryMovement`, `Warehouse` | ✅ |
| 5 | **Order Management** | Sales | `SalesOrder/Line`, `Customer` | ✅ |
| 6 | **Warehouse Management** | Inventory (receive/pick/pack/ship) | `Warehouse` exists; no pick/pack | 🟠 |
| 7 | **Supply Chain Management (SCM)** | Inventory + Purchase + MRP routes | `SupplyForecast` + cross-tenant bridge | ✅ |
| 8 | **Customer Relationship Management (CRM)** | CRM | `Customer` exists; no lead/pipeline | 🔴 |
| 9 | **Project / Professional Services Automation (PSA)** | Project, Timesheets, Planning | `FutureProject`, `Task` (shallow) | 🟠 |
| 10 | **Workforce Management (WFM)** (attendance, hours, payroll) | Employees, Time Off, Planning, Payroll | none | 🔴 |
| 11 | **Human Resource Management (HRM/HCM)** (records, performance) | Employees, Recruitment, Appraisals | `User` + employees list only | 🔴 |
| 12 | **Ecommerce** | Website / eCommerce | none | ⚪ |
| 13 | **Marketing Automation** | Marketing, Email Marketing | alerts/digests only | ⚪ |

> ✅ strong · 🟠 partial · 🔴 gap → build (Phase 27) · ⚪ out of H-Nerve's core scope (it's a **B2B group-operations** ERP, not a retail storefront — Ecommerce / Marketing-automation are deliberately deprioritised, not forgotten).
> **Two things to note for the exam:** the course **splits HR into two** (WFM #10 = time/attendance/payroll; HRM #11 = records/performance), and it **counts Ecommerce + Marketing automation** inside the core 13. Asset Management, Quality, and Maintenance are **not** in this list — they live in the layered model next.

## 4.1b The layered "ERP Model" (CH3 slides 27–31 — the MRP II grid)

A 2×2 of **planning vs. execution** × **material vs. resource**:

| | **Material side** | **Resource side** |
|---|---|---|
| **Planning** | new/existing product, **Bill of Materials**, product pricing, long-term forecasting, **capacity planning**, **engineering change mgmt** | intelligent resource planning, **Human Resource Planning**, **Quality Management** |
| **Execution** | inventory, order processing, **supplier mgmt**, inventory/warehouse mgmt, forecasting, **distribution mgmt**, scheduling | **recruitment**, **payroll**, job evaluation & **performance appraisal**, **costing & budgeting**, **quality control**, **maintenance engineering & scheduling**, **Fixed Assets**, **Central Database** |

This grid is where **Fixed Assets**, **Quality Management/Control**, and **Maintenance** live — the *extended* modules detailed in §4.3. The **Central Database** ("one source of truth") sits at the centre — exactly H-Nerve's single PostgreSQL.

## 4.2 The 13 modules in detail (course order)

### 1 · Finance ✅
- **Theory:** the system of record and *the foundation of just about every ERP* (CH3 S14) — General Ledger, Accounts Payable/Receivable, every transaction, financial reporting.
- **Odoo:** **double-entry bookkeeping** — Odoo auto-creates the journal entries behind every transaction (invoice, bill, POS order, expense, inventory valuation); each has a debit + matching credit so accounts always balance. Accrual + cash basis; chart of accounts; taxes & fiscal positions; customer invoices; vendor bills with OCR; payments; **bank sync & reconciliation**; analytic accounting; consolidation; multi-currency.
- **H-Nerve:** `finance.prisma` is our richest schema — `LedgerAccount`, `JournalEntry` + `JournalLine`, `FinancialPeriod`, `Transaction`. The Record-to-Report spine exists.

### 2 · Procurement ✅
- **Theory:** manage purchasing of raw materials or finished goods; automate RFQs and POs; tie to demand planning to avoid over/under-buying (CH3 S15).
- **Odoo:** purchase agreements, **RFQs** → POs; reordering rules, blanket orders, call for tenders, control policies, vendor bills; subcontractor POs, dropshipping, "suggest quantities from historical demand."
- **H-Nerve:** `PurchaseOrder` + `PurchaseOrderLine`, `Supplier`. Core P2P present.

### 3 · Manufacturing 🟠
- **Theory:** coordinate the steps of making products; keep production in line with demand; monitor in-progress and finished items (CH3 S16).
- **Odoo:** **Manufacturing** — BoMs, 1/2/3-step manufacturing, manufacturing orders, WIP costs; product-variant BoMs, **kits**, **multilevel BoMs**, **work centers**, **work-order dependencies**; PLM (engineering change orders, version control); Repairs.
- **H-Nerve:** only domain-specific `DairyBatch`. **Gap:** no general BoM, Manufacturing Order, or work center. → Phase 27.

### 4 · Inventory Management ✅
- **Theory:** show current inventory to the **SKU** level, updated in real time; measure inventory KPIs; optimise stock vs. forecast demand (CH3 S17).
- **Odoo:** "both an inventory app and a **WMS**" — lead times, automated replenishment, advanced routes; UoM/packages; **lot & serial tracking**, expiration / FEFO.
- **H-Nerve:** `Product`, `InventoryMovement`, `Warehouse` (+ `ImportLog`/`ImportRow`).

### 5 · Order Management ✅
- **Theory:** monitor and prioritise customer orders from **all channels** and track them through delivery; speeds fulfilment and improves CX (CH3 S18).
- **Odoo:** quotations → sales orders → delivery → invoice; pricelists, product catalog (POS-style add).
- **H-Nerve:** `SalesOrder` + `SalesOrderLine`, `Customer`.

### 6 · Warehouse Management 🟠
- **Theory:** direct warehouse activities — **receiving, picking, packing, shipping** — for time/cost savings (CH3 S19).
- **Odoo:** advanced Inventory — multi-step routes, putaway rules, pick/pack/ship, **barcode**, packages.
- **H-Nerve:** `Warehouse` exists, but no pick/pack/barcode layer. → Phase 27 (enrichment of Inventory).

### 7 · Supply Chain Management (SCM) ✅
- **Theory:** planning, execution, control, monitoring of supply — storage, transport, and matching demand ⇄ supply (CH3 S20).
- **Odoo:** emergent from Inventory routes + Purchase + Manufacturing + reordering.
- **H-Nerve:** `SupplyForecast` + the predictive cross-tenant **supply bridge** (`lib/supply/bridge.ts`) linking hotel demand ↔ dairy production ↔ agri inputs. A genuine differentiator.

### 8 · Customer Relationship Management (CRM) 🔴
- **Theory:** track all client communications, manage **leads**, enhance service, boost sales (CH3 S21).
- **Odoo:** **CRM** — leads, convert lead→opportunity, **pipeline** with stages, lost-reason, lead mining, sales teams, forecasts.
- **H-Nerve:** `Customer` exists but **no lead/opportunity/pipeline**. → Phase 27 **(highest pitch value)**.

### 9 · Project / Professional Services Automation (PSA) 🟠
- **Theory:** services firms use PSA to **plan and track projects** — time and resources spent — simplify client billing, aid collaboration (CH3 S22).
- **Odoo:** **Project** (tasks, stages, Gantt), **Timesheets** (time logging, billing rates), **Planning** (shift/resource scheduling).
- **H-Nerve:** `FutureProject` + generic `Task`, but no board / Gantt / timesheet depth. → Phase 27 (enrichment).

### 10 · Workforce Management (WFM) 🔴
- **Theory:** track **attendance and hours worked**; some manage **payroll**; record absenteeism and productivity by dept/team/employee (CH3 S23).
- **Odoo:** **Time Off** (request→approve→auto-timesheet), **Planning** (shifts), **Payroll**, attendance.
- **H-Nerve:** none. → Phase 27 (build alongside HRM as one HR module; **payroll deferred** — Jordan-locale heavy).

### 11 · Human Resource Management (HRM / HCM) 🔴
- **Theory:** keep **employee records** with detail — performance reviews, demographics, departments; similar to but broader than WFM (CH3 S24).
- **Odoo:** **Employees** (directory, contracts, org chart), **Recruitment** (applicant pipeline), **Appraisals**.
- **H-Nerve:** only `User`/roles + an employees list. **Biggest functional gap.** → Phase 27.

### 12 · Ecommerce ⚪ (out of core scope)
- **Theory:** manage back- and front-ends of online stores — site look/feel, product pages (CH3 S25).
- **Odoo:** **Website / eCommerce** builder.
- **H-Nerve:** none — and *intentionally so*. H-Nerve is a **B2B group-operations** ERP for the Hourani Group, not a consumer storefront. Listed for completeness; not a Phase-27 priority.

### 13 · Marketing Automation ⚪ (out of core scope)
- **Theory:** manage marketing across digital channels — email, web, social — optimise/personalise messaging (CH3 S26).
- **Odoo:** **Marketing Automation**, **Email Marketing**, social.
- **H-Nerve:** has alerts + weekly digests, but no campaign engine. Low priority vs. the operational gaps.

## 4.3 Extended modules — the ERP Model's resource layer (§4.1b)

These are taught in the layered model (CH3 S27–31), not the enumerated 13, but they're real ERP modules and real H-Nerve opportunities:

- **Asset Management / Fixed Assets** 🔴 — register, depreciation schedules, maintenance. **Odoo:** Assets (in Accounting) + **Maintenance** (preventive/corrective). **H-Nerve:** none. → Phase 27.
- **Quality Management / Control** 🟠 — control points & checks tied to receipts/production. **Odoo:** **Quality** (control points, checks, alerts, QC teams). **H-Nerve:** `Document`/`DocClause`/`ProtocolClause` + Document Intelligence (Phase 18); no QMS checks. → Phase 27 (enrichment).
- **Maintenance Engineering** 🔴 — equipment maintenance scheduling. **Odoo:** **Maintenance**. **H-Nerve:** none (pairs with Assets). → Phase 27.
- **Business Intelligence / Central Database** ✅ **(exceeds)** — the "one source of truth" + reporting/analytics. **Odoo:** Reporting, Spreadsheet, Dashboards. **H-Nerve:** single PostgreSQL + analytics/reports **plus the Brain** (causal graph, simulation, council, planner, memory, RAG). H-Nerve doesn't just report the past — it reasons about and plans the future. This is the differentiator a classic ERP lacks.

---

# Part V — ERP Implementation & Integration
*(CH4 deck + Bradford implementation chapters)*

## 5.1 The 7 stages of an ERP implementation (CH4)

1. **Discovery & planning** — assemble a cross-functional team; identify inefficient processes and roadblocks; produce a requirements document.
2. **Evaluation & selection** — evaluate leading offerings against the requirements; select the platform that best fits all departments and growth.
3. **Design** — design the to-be processes and the system configuration (this is where **BPR** is applied); identify needed customizations.
4. **Development / configuration** — configure the software, build customizations/integrations, set up data structures, and prepare **data migration**.
5. **Testing** — unit, integration, and **user-acceptance testing**; iterate with users; validate data conversion.
6. **Deployment (go-live)** — cut over to production using a chosen strategy (below); train users; provide hypercare support.
7. **Support & continuous improvement** — stabilize, optimize, add modules, and feed lessons back.

## 5.2 Deployment / cutover strategies

| Strategy | How | Trade-off |
|---|---|---|
| **Big Bang** | Switch everything at once | Fast, lower dual-run cost, but highest risk |
| **Phased** | Module-by-module or site-by-site | Lower risk, longer timeline, temporary integration glue |
| **Parallel** | Run old + new together for a period | Safest, highest cost (double data entry) |

## 5.3 Data migration & integration
- **Data migration:** extract → cleanse → transform → load → validate legacy data. The "garbage-in" risk is the silent killer of go-lives.
- **Integration:** ERP rarely lives alone — connect to CRM, e-commerce, banks, BI, IoT via APIs/EDI/middleware. (H-Nerve: the **connectors hub**, Phase 13, and the **Living Protocol**, Phase 20.)
- *(The `for fully automated ERP system.json` file is precisely a real-world integration design — logical replication from source systems → **Neon Postgres** via Estuary Flow → dashboards. It's a concrete "ERP → analytics warehouse" pipeline.)*

## 5.4 Critical success factors & why implementations fail
**CSFs:** top-management sponsorship · clear scope (avoid scope creep) · effective change management & training · minimal customization · clean data · a capable, empowered project team · realistic timeline/budget.
**Failure modes:** under-estimating change resistance · over-customization · poor data quality · weak executive sponsorship · "automating the broken process" (skipping BPR) · inadequate testing/training.

---

# Part VI — Enabling Technologies / Next-Gen ERP
*(CH5 deck + Anas's ERP+Blockchain essay)*

The next generation of ERP is **more agile, more modular, real-time, and intelligent.** Key enablers (CH5):

- **Cloud / SaaS** — scalable, cost-effective, remote; vendors integrate front + back office.
- **AI / ML** — intelligent automation, predictive analytics, anomaly detection, natural-language interfaces.
- **Big Data & Analytics** — "**data is the key to ERP**"; turn transactions into foresight.
- **Low-code / No-code** — let businesses extend the system without deep technical skill (cf. Odoo Studio).
- **IoT** — sensors feed real-time signals (production, logistics, condition monitoring) into the ERP.
- **Mobility** — anywhere access; approvals and dashboards on the phone.
- **Blockchain** — shared, tamper-evident ledger across organizations.

### Anas's thesis — ERP + Blockchain for supply-chain traceability
> *"Integrating ERP systems with blockchain can solve end-to-end supply-chain traceability."* ERP integrates information **inside** a company but cannot extend trust **across** organizational boundaries; products get trapped in **data silos**, so tracing origin-to-shelf takes days during a recall. A shared blockchain ledger layered on each party's ERP gives every actor a verifiable, common record — collapsing trace time and rebuilding trust.

**H-Nerve as a next-gen ERP:** it is cloud-native, AI-first (the Brain), modular (industry packs), has a mobile surface and a connector hub — it *is* the CH5 vision, and the supply bridge + brain are the differentiators a classic ERP lacks.

---

# Part VII — The end-to-end processes (know these cold)

| Process | Flow | Modules touched | Odoo | H-Nerve |
|---|---|---|---|---|
| **Order-to-Cash (O2C)** | Customer order → check stock → confirm → pick/ship → invoice → receive payment → GL | Sales, Inventory, Finance(AR) | Sales→Inventory→Accounting | SalesOrder→InventoryMovement→Transaction ✅ |
| **Procure-to-Pay (P2P)** | Need → RFQ → PO → receive goods → vendor bill → pay → GL | Procurement, Inventory, Finance(AP) | Purchase→Inventory→Accounting | PurchaseOrder→InventoryMovement→Transaction ✅ |
| **Plan-to-Produce (MRP)** | Forecast/demand → MRP run → MO + purchase → produce → stock | SCM, Manufacturing, Inventory | Manufacturing | SupplyForecast ✅ / BoM+MO 🔴 (Phase 27) |
| **Hire-to-Retire** | Requisition → recruit → onboard → pay/manage → offboard | HR/HCM | Recruitment→Employees→Payroll | 🔴 (Phase 27) |
| **Record-to-Report (R2R)** | Transactions → journals → close period → statements → analysis | Finance, BI | Accounting→Reporting | JournalEntry→FinancialPeriod→reports/Brain ✅ |

**The O2C reference (CH2):** Start (customer places order) → ERP creates **Sales Order** → check stock availability → (if short, trigger purchase/production) → confirm & reserve → pick/pack/ship → invoice → record payment → post to GL. This single thread shows *why* integration matters: one order touches Sales, Inventory, Procurement/Manufacturing, and Finance — all on one database.

---

# Part VIII — How H-Nerve maps onto ERP (bridge to Phase 27)

H-Nerve grew **organically** around the Hourani Group's verticals (hotels, dairy, agriculture, education). Measured against the canonical 13-module taxonomy, it is **already a real ERP** on the transactional spine (Finance, Procurement, Inventory, Sales, SCM, BI) and **surpasses** a classic ERP on intelligence (the Brain). The deliberate gaps are the **horizontal business modules** a vertical-first build naturally postponed:

- **🔴 Clear gaps (build):** CRM pipeline · HR (WFM + HRM/HCM as one module) · Asset Management · Maintenance
- **🟠 Partial / enrichment:** Manufacturing (general BoM/MRP) · Warehouse Mgmt (pick/pack/barcode) · Project/PSA depth · Quality (QMS)
- **⚪ Out of core scope:** Ecommerce · Marketing automation — in the course's 13, but H-Nerve is a B2B group-operations ERP, not a storefront

Closing them is **Phase 27**. Each new module follows the house pattern: a `(app)/<module>/` section + server actions, new Prisma models, a `lib/brain/agents/*` pack, and an orrery hub entry. → **`docs/spec/PHASE-27-ERP-MODULES.md`**.

---

# Appendix A — Keyword glossary (exam cram)

**ERP** · **MRP / MRP II** · **single source of truth** · **module** · **best-of-breed** · **configuration vs. customization** · **two/three-tier architecture** · **RDBMS / normalization / SQL** · **BPR (fundamental rethinking, radical redesign)** · **the 3 C's (Customers, Competition, Change)** · **process simplification vs. continuous improvement** · **Order-to-Cash / Procure-to-Pay / Hire-to-Retire / Record-to-Report / Plan-to-Produce** · **BoM** · **work center** · **pipeline (lead → opportunity)** · **chart of accounts** · **double-entry bookkeeping** · **AP/AR/GL** · **go-live (big bang / phased / parallel)** · **data migration** · **CSF (critical success factor)** · **change management** · **cloud/SaaS** · **low-code/no-code** · **data silo** · **blockchain traceability**.

# Appendix B — Course ↔ textbook ↔ this KB map

| Course deck | Bradford chapter(s) | KB part |
|---|---|---|
| CH1 Introduction to ERP | Ch1 Introduction | Part I |
| (architecture) | Ch2 ERP Technology | Part II |
| CH2 ERP & BPR | Ch3 ERP & Business Process Redesign | Part III |
| CH3 ERP Model & Modules | module chapters | Part IV |
| CH4 Implementation & Integration | implementation chapters | Part V |
| CH5 Enabling Technologies | trends / BI (Ch12) | Part VI |
| ERP+Blockchain essay | — (independent) | Part VI |

*Generated 2026-06-30 from the ingested corpus. Regenerate/extend via the context-mode index (sources labeled `CH1…CH5`, `Modern ERP Textbook Bradford 3rd ed`, `ERP Study Guide`, `ERP Blockchain Essay`, `ODOO19 …`).*
