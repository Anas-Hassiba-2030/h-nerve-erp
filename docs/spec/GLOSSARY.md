# H-Nerve — Bilingual Domain Glossary (المعجم)

> **Purpose:** the *ubiquitous language* — every domain term defined **once**,
> with its **locked Arabic + English** form. This is the highest-rework-risk doc
> for H-Nerve specifically, because the stack is bilingual (Arabic-default, RTL)
> and inconsistent naming silently fragments the product. When you introduce a
> term, define it here first; never coin a second translation in code.
>
> **Source of truth:** Arabic is canonical (the UI defaults to Arabic). English
> is the secondary label. Values verified against `lib/utils.ts`,
> `lib/gamification.ts`, `lib/i18n.ts`, and `prisma/seed.ts`.
> Owner: product + platform. Last-updated: 2026-06-02.
> Part of the spec set in `docs/governance/RE-INFRASTRUCTURE-PLAN.md` §3.

---

## 1. The product & the deployment

| Term | العربية | Meaning |
|---|---|---|
| **H-Nerve** | إتش-نيرف | The generic, white-labelable ERP **intelligence platform**. Not a chatbot on a dashboard — the Brain sits beneath every screen. |
| **The Brain** | الدماغ / العقل | The causal-graph + multi-agent + memory + planner intelligence layer (`lib/brain/`). Read-mostly: it proposes, never mutates domain data. |
| **Hourani Group** | مجموعة الحوراني | The first/anchor tenant. The seeded demo data models this group. |
| **Tenant** | مستأجر | A white-label customer org. Keyed by an opaque `Tenant.slug`. |
| **Workspace** | مساحة العمل | The active **company** context an operator is working inside (cookie-driven). |
| **Heritage Modern** | — | The default design vocabulary (deep emerald + gold/amber). One vocabulary per surface; never mix. |

## 2. Roles (الأدوار)

String-union `Role`, stored as a plain column. Hierarchy low→high. Source:
`lib/authz.ts` (levels), `lib/utils.ts` (labels).

| Code | العربية | English | Level |
|---|---|---|---|
| `STAFF` | موظف | Staff | 1 |
| `MANAGER` | مدير وحدة | Unit Manager | 2 |
| `EXECUTIVE` | إدارة عليا | Executive | 3 |
| `ADMIN` | مدير النظام | System Admin | 4 |

`requireRole("MANAGER")` accepts MANAGER, EXECUTIVE, and ADMIN (≥ level).

## 3. Chess ranks — gamification (الرتب)

The operator's standing, separate from `Role`. Source: `lib/gamification.ts`.
Earned by XP; drives the avatar piece and bonus.

| Code | العربية | English | Piece |
|---|---|---|---|
| `PAWN` | بيدق | Pawn | ♟ |
| `BISHOP` | فيل | Bishop | ♝ |
| `KNIGHT` | حصان | Knight | ♞ |
| `QUEEN` | وزير | Queen | ♛ |
| `KING` | ملك | King | ♚ |

> Note: in Arabic chess the queen is **الوزير** (the vizier), not "ملكة" — keep
> this; it's the correct cultural term and is the locked translation.

## 4. Sectors (القطاعات)

`Company.sector` string-union. Determines which industry pack + modules load.

| Code | العربية | English |
|---|---|---|
| `HOSPITALITY` | ضيافة وفنادق | Hospitality |
| `DAIRY` | صناعات غذائية — ألبان | Dairy |
| `AGRICULTURE` | زراعة | Agriculture |
| `EDUCATION` | تعليم | Education |
| `INVESTMENT` | استثمار | Investment |
| `TRADE` | تجارة | Trade |

## 5. The seeded companies (الشركات النموذجية)

The demo tenant's companies (`prisma/seed.ts`). Use these exact names in demos.

| Code | العربية | English | Sector |
|---|---|---|---|
| `ARENA` | أرينا سبيس للضيافة | Arena Space Hospitality | Hospitality |
| `MAHA` | المها للألبان | Maha Dairy | Dairy |
| `LORAN` | لوران الزراعية | Loran Agriculture | Agriculture |
| `AHLIYYA` | الأهلية (حاضنة Tank) | Ahliyya / The Tank | Education |

## 6. The Brain subsystems (أنظمة الدماغ)

Phase numbers map to `docs/governance/PHASES-INTELLIGENCE.md`. Files in `lib/brain/`.

| Term | العربية | What it is |
|---|---|---|
| **Causal Graph** | الرسم السببي | Entities = nodes, relationships = weighted edges (`graph.ts`). Phase 1. |
| **Simulator / What-If** | المحاكاة / ماذا لو | Propagates a perturbation over the graph (`simulator.ts`). Phase 2. |
| **Council** | المجلس | Multi-agent expert debate + Moderator synthesis (`council.ts`). Phase 3. |
| **Narrator** | الراوي / المخرجات | Turns findings into editorial bilingual prose (`narrator.ts`). Phase 4. |
| **Planner** | المُخطِّط / الخطط | Insight → ordered action plan (`planner.ts`). Phase 5. |
| **Memory** | الذاكرة | Episodic recall of analogous past situations (`memory.ts`). Phase 6. |
| **Feedback** | التغذية الراجعة / التعلّم | Every dismiss/override becomes training signal (`feedback.ts`). Phase 7. |
| **Federation** | الاتحاد | Cross-tenant anonymized pattern learning. Phase 8. |
| **Meta / Brain IQ** | الذكاء / ذكاء الدماغ | Self-reflection; owns the IQ score (`meta.ts`). Phase 10. |
| **Trust / Verifier** | الثقة | Phase 22 hallucination guard: claims matched to facts, confidence label. |
| **Industry pack** | حزمة قطاعية | Domain experts under `lib/brain/agents/` (HospitalityExpert, DairyExpert, …). |

## 7. Common status values (الحالات)

String-union status columns. Non-exhaustive; check the model's TS union.

| Value | العربية | Used by |
|---|---|---|
| `DRAFT` | مسودة | Plan, PurchaseOrder, SalesOrder, SelfTuningReport |
| `SENT` | مُرسَل | PurchaseOrder |
| `OPEN` | مفتوح | Insight, AlertRule |
| `RESOLVED` | محلول | Insight |
| `DISMISSED` | مُتجاهَل | Insight, signals |
| `RUNNING` | قيد التنفيذ | CouncilSession, WorkflowRun |
| `DONE` | مكتمل | CouncilSession, Task |
| `APPROVED` | معتمَد | SelfTuningReport, SupplyForecast |
| `ACTIVE` | نشط | Integration, AlertRule |
| `ENABLED` / `DISABLED` / `UNLEARNED` | مُفعَّل / مُعطَّل / مَنسِيّ | BrainPattern |

## 8. Cross-cutting platform terms

| Term | العربية | Meaning |
|---|---|---|
| **Orrery** | المدار | The hub navigation surface (`/orrery`) — the cosmic section map. |
| **Time Machine** | آلة الزمن | Cookie-driven `as-of` cursor for point-in-time views (`lib/timemachine.ts`). |
| **Living Protocol** | الميثاق الحيّ | The group-wide constitution clauses (`ProtocolClause`). Phase 20. |
| **Genesis** | البداية / التكوين | First-run seed wizard (`/admin/genesis`). Phase 21. |
| **Trash** | سلة المحذوفات | Soft-deleted rows before permanent purge (`lib/softDelete.ts`). |
| **View-as** | المعاينة كـ | Superadmin previews a tenant's theme without switching subdomain. |
| **Digest** | الموجز | On-demand executive summary the brain generates. |

---

## 9. Rules for adding terms

1. **Arabic first, and lock it.** Pick the culturally-correct Arabic term once
   (e.g. الوزير for Queen) and never vary it. English is the secondary label.
2. **One term, one translation, everywhere** — UI dictionary (`lib/i18n.ts`),
   labels (`lib/utils.ts`), and prose must agree. If you need a new label, add
   it here in the same PR.
3. **Codes stay English uppercase** (`HOSPITALITY`, `ADMIN`) — only the *labels*
   are translated; the stored string-union value is always the English code.
