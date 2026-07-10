# HOME REDESIGN — the simple Heritage dashboard that replaces the Orrery

> ## ⏸ STATUS: PARKED — do not build yet
> This is a **ready-to-execute** spec. **Do not implement any of it until Anas says
> the word** (e.g. "build the home redesign" / "go"). Until then this file only
> *describes* the plan; it changes no code. When Anas gives the word, a session can
> open this file and start building **directly from it** — every decision, token,
> data source, and phase is captured below.
>
> Created 2026-06-22. Companion to `docs/prompts/LOGIN-REDESIGN.md` (login is owned
> by Claude Design — **out of scope here**). See also `docs/governance/RE-INFRASTRUCTURE-PLAN.md`
> (the broader rebuild) and `docs/governance/DESIGN-SKILL.md` §1.D (Heritage Modern).

---

## 1. The intent (what Anas asked for)

Replace the **Orrery "solar-system" hub** as the default authenticated landing with a
**simple, owner-friendly dashboard** — the clarity of an Oracle NetSuite home (labeled
grid, KPIs up top, few doors), but in **Heritage Modern** (cream/emerald/gold,
Arabic-first RTL) and **simpler + warmer than Oracle**.

Audience = **owners / Hourani leadership**, not power users. Guiding rule:
**clarity over capability** — one obvious flow per screen, plain language, no overwhelm.

**The differentiator that beats Oracle:** surface the **Brain's daily brief** (plain-
language insight + a *لماذا؟* "why") as the hero of the home. Oracle shows numbers;
H-Nerve explains them. The data and the Brain already exist — this is a presentation
layer, **not a rebuild**.

The pixel reference for the home screen is embedded in **Appendix A** (the mockup shown
to Anas on 2026-06-22).

---

## 2. What it replaces, and the routing change

- **Today:** `src/app/page.tsx` routes a signed-in user → `/orrery` (the cosmic hub,
  an iframe of `public/orrery/index.html`).
- **After:** signed-in → the new **Home** (`/home`, or repurpose `/dashboard`).
- **Do NOT delete the Orrery.** Keep it reachable as an optional "explore" view (a link
  / menu item), behind a flag if needed. Nothing is lost; Anas decides later whether to
  retire it. The unit-tested `src/lib/orrery/routeMap.ts` and `OrreryFrame` stay.
- The Orrery already shipped its first consolidation: **Group Board + Sectors merged
  6→5 groups** (PR #256, `public/orrery/index.html`). The new Home inherits that same
  consolidated nav model (§3).

---

## 3. The navigation — 6 sections, no more

Collapse the ~25 current routes into **6 top-level sections**. Nothing is deleted —
routes fold underneath as sub-nav / index-page tabs.

| # | Section (AR / EN) | Icon | Folds in (existing routes) |
|---|---|---|---|
| 1 | الرئيسية / Home | `ti-home` | the new dashboard itself (this spec) |
| 2 | الشركات والقطاعات / Companies & Sectors | `ti-building-skyscraper` | `/companies`, `/hotels` (Arena), `/dairy` (Maha), `/farms` (Loran), `/education` (Incubator), `/supply-chain`, `/compare` |
| 3 | المالية / Finance | `ti-coin` | `/finance`, `/analytics`, `/markets`, `/reports`, `/sustainability`, `/projects` |
| 4 | العقل / The Brain | `ti-bulb` | `/brain` + `/insights` `/alerts` `/plans` `/documents` `/brain/*` (council, memory, graph, scenarios, learning, benchmarks, iq, narrate) |
| 5 | الفريق / Team | `ti-users` | `/messages`, `/tasks`, `/inbox`, `/digest`, `/achievements`, `/employees`, `/users` |
| 6 | النظام / System | `ti-settings` | `/admin/*`, `/workspace`, `/workflows`, `/integrations`, `/audit-360`, `/activity`, `/system`, `/search`, `/pinned`, `/trash`, `/help`, `/roadmap`, `/settings` |

This mirrors the 5 Orrery groups (overview→1+2, intel→4, finance→3, team→5, system→6).
Decision to confirm at build time: "Companies" vs the four individual companies is the
known redundancy Anas flagged — fold the company list and the sector deep-dives under
one section with a sub-tab, don't show both as peers.

---

## 4. The Home screen (the mockup)

Light **Heritage daylight** surface (not the cosmic dark of `/brain`). Layout, top→bottom:

1. **Top bar** (white, gold hairline): logo mark (`ti-activity-heartbeat` gold-on-emerald)
   + "H-Nerve" + "مجموعة الحوراني" · a calm global search pill · Brain-IQ chip
   ("ذكاء النظام ١٢٧") · ع/EN toggle · user (initials avatar + name + role).
2. **Sidebar** (right, RTL): the 6 sections from §3; active = الرئيسية. Tiny footnote
   "٦ أقسام فقط — لا أكثر" to reinforce the restraint.
3. **Greeting**: "صباح الخير، {name}" (Reem Kufi) + date + one-line status.
4. **KPI row** (4 tiles): الإيراد الشهري · إشغال الفنادق · هامش المجموعة · تنبيهات نشطة.
   Tabular numerals, up/down delta badge (emerald up, terracotta/amber attention).
5. **Brain daily-brief card** (THE HERO): gold left-accent, "موجز اليوم من العقل",
   2–3 plain-language insights, each with an eyebrow (ضيافة/ألبان/…) + a *لماذا؟* link
   that expands the reasoning. This is the Oracle-beating moment.
6. **Sectors at a glance**: Arena/Maha/Loran/Incubator rows — icon, name, monthly figure,
   trend, status badge (جيد / انتباه).
7. **Needs attention**: 3 compact action items (expiry, approvals, report ready).

Arabic-Indic numerals throughout (locale=ar), as the real app renders.

---

## 5. Design tokens (Heritage daylight — exact values)

Pulled from `src/app/globals.css` + `src/app/(app)/daylight.css` (re-verify at build time):

```
--cream:#fefcf7   --ivory:#f6f1e7   --line:#e4dccb   --border:#e6e2d3
--emerald:#1f4d3f --emerald-soft:#2e6b57 --brand:#0f7a5a --brand-deep:#0a4d3a
--gold:#c2a35a    --gold-soft:#dcc38a    --accent:#c69345
--ink:#2a2a26     --ink-muted:#6b6459
status up:#0f7a5a  attention:#854f0b/#c2a35a  down:#b5532e  alert-amber bg:#faeeda
```

Fonts: **display** = `Reem Kufi` (AR) / `Fraunces` (Latin); **UI** = `IBM Plex Sans
Arabic`; **mono** = `JetBrains Mono`. Direction: **RTL**. One vocabulary only:
**Heritage Modern** (never mix in Sleek Operator / cosmic on this surface).

---

## 6. Reuse map (don't reinvent — wire these in)

| Need | Use what already exists |
|---|---|
| Page header | `src/components/Topbar.tsx` (every page renders one) |
| Brain brief | `src/components/brain/MorningBrief.tsx` |
| Brain IQ value | `brainIqAt(new Date())` from `src/lib/utils/timemachine` |
| KPI cards | `.kpi` brand class in `globals.css`; pattern in `src/app/(app)/dashboard/` |
| Money / dates / numbers | `formatMoney` `formatDate` `formatNumber` from `src/lib/utils/utils.ts` |
| Sidebar | extend/replace `src/components/layout/Sidebar.tsx` (cut to 6) |
| Export button | `<ExportMenu variant="heritage" />` (never default sleek on cream) |
| Sector figures | hotels/dairy/farms/education pages + finance |
| Toasts | `flashToast` (entity `SoftEntity \| "info"`) — every mutation toasts |

---

## 7. Build plan (when Anas says go) — small PRs, never big-bang

> Doctrine: PRs only (never push `main`), start from `origin/main`, green gate
> (`typecheck` + `vitest` + `lint`; `next build` for layout/route changes), one concern
> per PR. The Orrery hub is **iframe vanilla JS** → green checks can't catch it, so any
> hub change is **verified live in the preview** (load the page, assert the DOM), per #256.

1. **PR 1 — Home + slim shell behind a flag.** New `src/app/(app)/home/page.tsx` (the
   mockup) + a slimmed 6-item sidebar, gated by a flag so nothing else changes. Verify
   live at `/home`. Reuse §6.
2. **PR 2 — Section consolidation.** Add the 6-section sub-nav / index pages from §3;
   route the folded pages under their section. Nothing deleted.
3. **PR 3 — Make Home the default landing.** Flip `src/app/page.tsx` signed-in →
   `/home`; keep Orrery reachable as "explore". Remove the flag.
4. **PR 4 — Polish + owner review.** Consistent Heritage daylight, kill cosmic-vs-cream
   whiplash for owners, real data on every tile, empty/loading/error states.

Show owners after PR 1 and adjust before going wide. This is also exactly the
`docs/governance/RE-INFRASTRUCTURE-PLAN.md` philosophy: derive from the working app, module-by-
module, never rebuild from zero.

---

## 8. Guardrails

- **Don't touch login** — owned by Claude Design (`docs/prompts/LOGIN-REDESIGN.md`).
- **Don't delete the Orrery** or its `routeMap`/tests — keep it as an optional view.
- **Behaviour-preserving** — folding routes must not lose a destination; every old page
  stays reachable.
- **Heritage Modern only** on this surface; Arabic-first; RTL-safe.
- **Read first:** `docs/governance/DESIGN-SKILL.md` §1.D, `docs/governance/RE-INFRASTRUCTURE-PLAN.md`,
  `docs/MAP.md`. Re-verify all file paths/tokens above (this doc can drift).

---

## Appendix A — the mockup (visual source of truth)

The home screen Anas approved as the direction (rendered in chat 2026-06-22). This HTML
is the reference for spacing, hierarchy, and palette — **not** the production component
(production uses real components + data from §6). Self-contained; opens in any browser.

```html
<style>
@import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
.hn{font-family:"IBM Plex Sans Arabic","Cairo",system-ui,sans-serif;direction:rtl;background:#fefcf7;color:#2a2a26;border:0.5px solid #e4dccb;border-radius:14px;overflow:hidden;line-height:1.5;max-width:980px;margin:auto}
.hn-disp{font-family:"Reem Kufi","Cairo",serif}
.hn-nav{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;color:#6b6459;cursor:pointer;font-size:13px}
.hn-nav:hover{background:#f1ece0;color:#1f4d3f}
.hn-nav.on{background:#eef5ef;color:#0a4d3a;font-weight:500}
.hn-nav.on i{color:#c2a35a}
.kpi{background:#fff;border:0.5px solid #e9e2d2;border-radius:12px;padding:11px 13px}
.bdg{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:500;white-space:nowrap}
.row{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:0.5px solid #efe8d8}
</style>
<!-- Tabler icons webfont must be loaded for the <i class="ti …"> glyphs. -->
<div class="hn">
  <div style="display:flex;align-items:center;gap:12px;padding:11px 15px;border-bottom:0.5px solid #e4dccb;background:#fff">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:30px;height:30px;border-radius:8px;background:#1f4d3f;display:flex;align-items:center;justify-content:center;color:#dcc38a"><i class="ti ti-activity-heartbeat" style="font-size:17px"></i></span>
      <span><span class="hn-disp" style="font-size:15px;font-weight:600;color:#1f4d3f">H‑Nerve</span><span style="font-size:11.5px;color:#6b6459;margin-inline-start:6px">مجموعة الحوراني</span></span>
    </div>
    <div style="flex:1;display:flex;align-items:center;gap:8px;max-width:300px;background:#faf7f0;border:0.5px solid #e9e2d2;border-radius:999px;padding:7px 13px;color:#6b6459;font-size:12.5px"><i class="ti ti-search" style="font-size:15px"></i>ابحث عن أي شيء…</div>
    <div style="margin-inline-start:auto;display:flex;align-items:center;gap:10px">
      <span class="bdg" style="background:#eef5ef;color:#0a4d3a;display:flex;align-items:center;gap:5px"><i class="ti ti-bulb" style="font-size:13px"></i>ذكاء النظام ١٢٧</span>
      <span style="font-size:11.5px;color:#6b6459;border:0.5px solid #e4dccb;border-radius:7px;padding:3px 7px">ع / EN</span>
      <span style="display:flex;align-items:center;gap:7px"><span style="width:28px;height:28px;border-radius:50%;background:#1f4d3f;color:#fefcf7;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500">أ</span><span style="font-size:12px;line-height:1.25"><span style="display:block;font-weight:500;color:#2a2a26">أ. الحوراني</span><span style="color:#6b6459">الرئيس التنفيذي</span></span></span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:148px 1fr">
    <aside style="padding:13px 11px;background:#faf7f0;border-inline-start:0.5px solid #e4dccb">
      <div class="hn-nav on"><i class="ti ti-home" style="font-size:17px"></i>الرئيسية</div>
      <div class="hn-nav"><i class="ti ti-building-skyscraper" style="font-size:17px"></i>الشركات والقطاعات</div>
      <div class="hn-nav"><i class="ti ti-coin" style="font-size:17px"></i>المالية</div>
      <div class="hn-nav"><i class="ti ti-bulb" style="font-size:17px"></i>العقل</div>
      <div class="hn-nav"><i class="ti ti-users" style="font-size:17px"></i>الفريق</div>
      <div class="hn-nav"><i class="ti ti-settings" style="font-size:17px"></i>النظام</div>
      <div style="margin-top:14px;padding-top:12px;border-top:0.5px solid #e4dccb;font-size:11px;color:#9a9281">٦ أقسام فقط — لا أكثر</div>
    </aside>
    <main style="padding:16px 17px 20px;min-width:0">
      <div style="margin-bottom:14px">
        <div class="hn-disp" style="font-size:18px;font-weight:600;color:#1f4d3f">صباح الخير، أنس</div>
        <div style="font-size:12px;color:#6b6459">٢٢ حزيران ٢٠٢٦ · كل الأنظمة تعمل بثبات</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
        <div class="kpi"><div style="font-size:11.5px;color:#6b6459">الإيراد الشهري</div><div style="font-size:21px;font-weight:500;color:#1f4d3f;margin:2px 0">٢٫٤<span style="font-size:12px;color:#6b6459"> م د.أ</span></div><span class="bdg" style="background:#e8f1ea;color:#0f7a5a"><i class="ti ti-arrow-up-right" style="font-size:12px"></i> ٨٪</span></div>
        <div class="kpi"><div style="font-size:11.5px;color:#6b6459">إشغال الفنادق</div><div style="font-size:21px;font-weight:500;color:#1f4d3f;margin:2px 0">٧٨٪</div><span class="bdg" style="background:#e8f1ea;color:#0f7a5a"><i class="ti ti-arrow-up-right" style="font-size:12px"></i> ٣٪</span></div>
        <div class="kpi"><div style="font-size:11.5px;color:#6b6459">هامش المجموعة</div><div style="font-size:21px;font-weight:500;color:#1f4d3f;margin:2px 0">٣١٪</div><span class="bdg" style="background:#e8f1ea;color:#0f7a5a"><i class="ti ti-arrow-up-right" style="font-size:12px"></i> ١٫٢</span></div>
        <div class="kpi"><div style="font-size:11.5px;color:#6b6459">تنبيهات نشطة</div><div style="font-size:21px;font-weight:500;color:#854f0b;margin:2px 0">٤</div><span class="bdg" style="background:#faeeda;color:#854f0b">تحتاج نظرة</span></div>
      </div>
      <div style="background:#fff;border:0.5px solid #e9e2d2;border-inline-start:3px solid #c2a35a;border-radius:0 12px 12px 0;padding:14px 16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i class="ti ti-bulb" style="font-size:18px;color:#c2a35a"></i>
          <span class="hn-disp" style="font-size:15px;font-weight:600;color:#1f4d3f">موجز اليوم من العقل</span>
          <span style="margin-inline-start:auto;font-size:11px;color:#9a9281">يقرأ بياناتك ويشرح — لا مجرد أرقام</span>
        </div>
        <div style="padding:8px 0;border-top:0.5px solid #efe8d8">
          <span style="font-size:11px;color:#c69345;font-weight:500">ضيافة</span>
          <div style="font-size:13.5px;color:#2a2a26;margin-top:2px">إشغال أرينا فوق المعدل — يُنصح برفع التسعير للأسبوع القادم. <span style="color:#0f7a5a;font-weight:500;cursor:pointer">لماذا؟</span></div>
        </div>
        <div style="padding:8px 0;border-top:0.5px solid #efe8d8">
          <span style="font-size:11px;color:#c69345;font-weight:500">ألبان</span>
          <div style="font-size:13.5px;color:#2a2a26;margin-top:2px">٤ دفعات قرب الانتهاء خلال ٧٢ ساعة — وجّهها لمطابخ الفنادق قبل الفاقد. <span style="color:#0f7a5a;font-weight:500;cursor:pointer">لماذا؟</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:12px">
        <div style="background:#fff;border:0.5px solid #e9e2d2;border-radius:12px;padding:12px 14px">
          <div style="font-size:13px;font-weight:500;color:#1f4d3f;margin-bottom:2px">نظرة على القطاعات</div>
          <div class="row"><i class="ti ti-building" style="font-size:16px;color:#6b6459"></i><span style="font-size:13px;flex:1">أرينا · فنادق</span><span style="font-size:12px;color:#6b6459">٩٤٠ ألف</span><span class="bdg" style="background:#e8f1ea;color:#0f7a5a">جيد</span></div>
          <div class="row"><i class="ti ti-droplet" style="font-size:16px;color:#6b6459"></i><span style="font-size:13px;flex:1">المها · ألبان</span><span style="font-size:12px;color:#6b6459">٦١٠ ألف</span><span class="bdg" style="background:#faeeda;color:#854f0b">انتباه</span></div>
          <div class="row"><i class="ti ti-plant-2" style="font-size:16px;color:#6b6459"></i><span style="font-size:13px;flex:1">لوران · زراعة</span><span style="font-size:12px;color:#6b6459">٤٢٠ ألف</span><span class="bdg" style="background:#e8f1ea;color:#0f7a5a">جيد</span></div>
          <div class="row"><i class="ti ti-school" style="font-size:16px;color:#6b6459"></i><span style="font-size:13px;flex:1">الحاضنة · تعليم</span><span style="font-size:12px;color:#6b6459">٢٨٠ ألف</span><span class="bdg" style="background:#e8f1ea;color:#0f7a5a">جيد</span></div>
        </div>
        <div style="background:#fff;border:0.5px solid #e9e2d2;border-radius:12px;padding:12px 14px">
          <div style="font-size:13px;font-weight:500;color:#1f4d3f;margin-bottom:2px">تحتاج انتباهك</div>
          <div class="row"><span style="width:7px;height:7px;border-radius:50%;background:#b5532e"></span><span style="font-size:12.5px;flex:1">دفعات ألبان قرب الانتهاء</span><i class="ti ti-chevron-left" style="font-size:15px;color:#b4b2a9"></i></div>
          <div class="row"><span style="width:7px;height:7px;border-radius:50%;background:#c2a35a"></span><span style="font-size:12.5px;flex:1">٣ فواتير بانتظار اعتمادك</span><i class="ti ti-chevron-left" style="font-size:15px;color:#b4b2a9"></i></div>
          <div class="row"><span style="width:7px;height:7px;border-radius:50%;background:#0f7a5a"></span><span style="font-size:12.5px;flex:1">تقرير الأسبوع جاهز للعرض</span><i class="ti ti-chevron-left" style="font-size:15px;color:#b4b2a9"></i></div>
        </div>
      </div>
    </main>
  </div>
</div>
```
