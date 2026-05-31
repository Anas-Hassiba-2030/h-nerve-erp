# Orrery → Real App: Port Map

Source of truth for porting the Claude Design **Orrery** (cinematic navigation hub)
into the real Next.js app. The exported standalone HTML was unpacked into:

```
docs/design/orrery/
  index.html            ← faithful, openable reference (rewired to ./resources/*)
  resources/*.woff2     ← Cairo + Cormorant fonts (11)
  resources/9f74afc4*.js← GSAP (vendor — use npm `gsap` in the port)
  resources/0c0262e6*.js← app-layer.js  (shared chrome: palette, toasts, advisor, drill)
  resources/be70906d*.js← states.js     (HNState: loading skeleton, empty/error)
  PORT-MAP.md           ← this file
```

The Orrery home itself is the inline `<script>` in index.html (orbit geometry, the
Gathering entry, dive transition, center-orb variants, language toggle, insight stars,
morning briefing). `app-layer.js` and `states.js` are **global** — designed to mount on
every section page, not just the hub.

## Palette (matches CLAUDE.md Heritage Luxury)
`--ivory #F6F1E7 · --cream #FEFCF7 · --emerald #1F4D3F · --gold #C2A35A · --ink #2A2A26 · --sage #7E9B86 · --brick #A86A5C` · night `#0D1F1A`.
Display font: Cormorant Garamond / Newsreader (serif). UI font: Cairo.

## Architecture decision
The Orrery is **Gear 2** of the 3-Gear Model (Overture → **Orrery hub** → Work Surface).
It is the *hub you return to*, not persistent chrome. Therefore:

- Port it as a dedicated full-screen route **`/orrery`** (its own layout, **no sidebar**).
- Diving into a star → `router.push(realRoute)`. Section pages stay exactly as they are
  (they already work, 376 tests green) and keep their current sidebar for in-context nav.
- Post-login landing flips from `/dashboard` → `/orrery` (one line in `app/page.tsx`,
  fully reversible). `/dashboard` stays intact and reachable as a star.
- First pass = **host the artifact**: inject the design markup + run its imperative
  engine in a client component, with hrefs rewired and dive intercepted to use the Next
  router. Wire real data (role/locale/IQ/user). Progressive React-ification later. This is
  the fastest, most faithful, lowest-risk path for a heavy bespoke animation.

## Real-data wiring (replaces mockup placeholders)
| Mockup placeholder | Real source |
|---|---|
| role chip / user name | `getCurrentUser()` session (already in `(app)/layout.tsx`) |
| IQ "٩٢" in top bar | `brainIQHistory` (latest) via `lib/timemachine`/brain |
| AR/EN toggle (broken in mockup) | **native** `lib/i18n.ts` + `h_nerve_locale` cookie — solves the mockup's "dynamic content won't translate" problem for free |
| clock | client time |
| insight stars text | real `/insights` data (later; static copy for v1) |

## Star → Route map
`href` shown is the design path; **Route** is where the dive goes in the real app.

### لوحة المجموعة / Group Board (`overview`)
| Star (AR / EN) | Design href | Route |
|---|---|---|
| لوحة المجموعة / Group Board | ui_kits/dashboard | `/dashboard` |
| العرض / Presentation | — | `/dashboard` *(TODO: Board Presentation mode)* |
| البحث / Search | — | `/search` |
| المثبّت / Pinned | — | `/pinned` |
| الشركات / Companies | — | `/companies` |
| التحليلات المتقدمة / Advanced Analytics | — | `/analytics` |
| المقارنة / Compare | — | `/compare` |
| مكتبة المكوّنات / Component Library | — | `/showcase` |

### القطاعات / Sectors (`sectors`)
| Star | Design href | Route |
|---|---|---|
| أرينا / Arena | sections/arena | `/hotels` |
| المها / Maha | sections/maha | `/dairy` |
| لوران / Loran | sections/loran | `/farms` |
| الحاضنة / Incubator | sections/ahliyya | `/education` |
| سلسلة التوريد / Supply Chain | sections/supply | `/supply-chain` |
| مسارات العمل / Workflows | — | `/workflows` |

### العقل / The Brain (`intel`)
| Star | Design href | Route |
|---|---|---|
| مركز الدماغ / Brain Hub | sections/brain | `/brain` |
| الرؤى / Insights | sections/insights | `/insights` |
| التنبيهات / Alerts | sections/alerts | `/alerts` |
| الخطط / Plans | sections/plans | `/plans` |
| المستندات / Documents | sections/documents | `/documents` |
| الرسم السببي / Causal Graph | sections/causal | `/brain/graph` |
| ماذا لو / What-if | sections/whatif | `/brain/scenarios` |
| المجلس / Council | sections/council | `/brain/council` |
| بحيرة الذاكرة / Memory Lake | sections/memory | `/brain/memory` |
| التعلّم / Learning | sections/learning | `/brain/learning` |
| المعايير / Benchmarks | sections/benchmarks | `/brain/benchmarks` |
| ذكاء الدماغ / Brain IQ | sections/brainiq | `/brain/iq` |
| الراوي / Narrate | sections/narrate | `/brain` *(TODO: no narrate route yet)* |

### المالية / Finance (`finance`)
| Star | Design href | Route |
|---|---|---|
| المركز المالي / Financial Hub | sections/finance | `/finance` |
| التحليلات / Analytics | sections/analytics | `/analytics` |
| مقارنة / Compare | sections/compare | `/compare` |
| الأسواق / Markets | sections/markets | `/markets` |
| التقارير / Reports | sections/reports | `/reports` |
| الاستدامة / Sustainability | — | `/sustainability` |
| المشاريع المستقبلية / Future Projects | — | `/projects` |

### الفريق / Team (`team`)
| Star | Design href | Route |
|---|---|---|
| الرسائل / Messages | sections/messages | `/messages` |
| المهام / Tasks | sections/tasks | `/tasks` |
| صندوق الوارد / Inbox | sections/inbox | `/inbox` |
| الموجز / Digest | sections/digest | `/digest` |
| الإنجازات / Achievements | sections/tasks | `/achievements` |
| الموظفون / Staff | sections/employees | `/employees` |
| الفريق / Team | sections/employees | `/users` |

### النظام / System (`system`)
| Star | Design href | Route |
|---|---|---|
| المستأجرون / Tenants | sections/admin | `/admin/tenants` |
| الإمبراطورية / Empire | sections/holding | `/admin/empire` |
| الإدارة ERP / Admin ERP | sections/admin | `/admin/products` *(ERP entry)* |
| مساحة العمل / Workspace | sections/workspace | `/workspace` |
| الأتمتة / Workflows | sections/workflows | `/workflows` |
| التكاملات / Integrations | sections/integrations | `/integrations` |
| التدقيق الشامل / Audit 360 | sections/audit | `/audit-360` |
| سجل النشاط / Activity | sections/audit | `/activity` |
| صحة النظام / System Health | sections/system | `/system` |
| البحث / Search | sections/search | `/search` |
| المثبّت / Pinned | sections/pinned | `/pinned` |
| المحذوفات / Trash | sections/trash | `/trash` |
| المساعدة / Help | sections/info | `/help` |
| خارطة الطريق / Roadmap | sections/info | `/roadmap` |
| الإعدادات / Settings | sections/system | `/settings` |

**Coverage:** 2 soft spots only — *Narrate* (→ `/brain`, no route yet) and
*Presentation* (→ `/dashboard`, Board Presentation mode not built). Everything else maps
to a route that already exists and passes tests.
