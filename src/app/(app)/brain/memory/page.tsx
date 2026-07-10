// /brain/memory — the memory lake.
//
// Ported to its Claude Design reference (docs/design/system/sections/
// memory.html + memory.js). Night-register contemplative timeline:
// alternating cards along a central rule, hover-driven emerald
// "recall" lines to related memories, dark lake field with CSS waves.
// Real Memory rows are mapped into the reference's slot shape; the
// recall animation lives in components/brain/MemoryLake.tsx (a faithful
// port of memory.js). No DaylightShell — exact reference markup.
//
// Phase 6 of docs/governance/PHASES-INTELLIGENCE.md.

import "../../daylight.css";
import "./memory.css";
import { Brain, Database, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { MemoryLake, type MemoryItem } from "@/components/brain/MemoryLake";
import { seedMemories, clearMemories } from "./actions";

export const dynamic = "force-dynamic";

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "ضيافة", en: "Hotels" },
  DAIRY:     { ar: "ألبان", en: "Dairy" },
  FARMS:     { ar: "زراعة", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "مالية", en: "Finance" },
  GROUP:     { ar: "مجموعة", en: "Group" },
  SUPPLY:    { ar: "توريد", en: "Supply" },
};

const AR_MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];
const EN_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function toAr(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function formatDate(d: Date, ar: boolean): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  return ar ? `${toAr(y)} · ${AR_MONTHS[m]}` : `${EN_MONTHS_SHORT[m]} ${y}`;
}

function safeStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function BrainMemoryPage() {
  const ar = (await getLocale()) === "ar";

  let rows: Awaited<ReturnType<typeof prisma.memory.findMany>> = [];
  try {
    rows = await prisma.memory.findMany({
      orderBy: { occurredAt: "desc" },
      take: 60,
    });
  } catch {
    // DB unavailable or table missing — show empty state so the page
    // renders rather than crashing into the error boundary.
    rows = [];
  }

  if (rows.length === 0) {
    return (
      <div className="dl-page" data-section="memory" dir={ar ? "rtl" : "ltr"}>
        <div className="ml-wrap">
          <div id="lake" aria-hidden>
            <div className="wave w1"></div>
            <div className="wave w2"></div>
            <div className="wave w3"></div>
          </div>
          <EmptyState ar={ar} />
        </div>
      </div>
    );
  }

  // Heuristic: outcome is "good" when no signed delta is recorded (positive
  // lessons) or when the delta is non-negative; otherwise "bad".
  const memories: MemoryItem[] = rows.map((r) => {
    const dom = (ar
      ? MODULE_LABEL[r.module]?.ar
      : MODULE_LABEL[r.module]?.en) ?? r.module;
    const out: "good" | "bad" =
      r.outcomeDelta == null ? "good" : r.outcomeDelta >= 0 ? "good" : "bad";
    const tags = safeStringArray(r.tagsJson);
    // We don't store related ids on Memory; approximate "related" via shared
    // tags so the recall lines mean something even without a vector index.
    return {
      id: r.id,
      date: formatDate(r.occurredAt, ar),
      yr: String(r.occurredAt.getFullYear()),
      dom,
      out,
      sit: ar ? r.headlineAr : r.headlineEn,
      dec: ar ? (r.bodyAr || r.bodyEn) : (r.bodyEn || r.bodyAr),
      outBadge: { good: ar ? "نجحت" : "Succeeded", bad: ar ? "تعثّرت" : "Stumbled" },
      decLabel: ar ? "القرار:" : "Decision:",
      tags,
      related: [] as string[],
    };
  });

  // Wire up "related" by shared tags (top 3 most overlapping memories per node).
  for (const m of memories) {
    const me = m.tags;
    if (me.length === 0) continue;
    const overlap = memories
      .filter((o) => o.id !== m.id)
      .map((o) => ({
        id: o.id,
        score: o.tags.filter((t) => me.indexOf(t) >= 0).length,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.id);
    m.related = overlap;
  }

  const domains = Array.from(new Set(memories.map((m) => m.dom)));
  const years = Array.from(new Set(memories.map((m) => m.yr))).sort();

  return (
    <div className="dl-page" data-section="memory" dir={ar ? "rtl" : "ltr"}>
      <div className="ml-wrap">
        <MemoryLake
          ar={ar}
          memories={memories}
          domains={domains}
          years={years}
          labels={{
            sector: ar ? "القطاع" : "Sector",
            outcome: ar ? "النتيجة" : "Outcome",
            year: ar ? "السنة" : "Year",
            all: ar ? "الكل" : "All",
            good: ar ? "ناجحة" : "Succeeded",
            bad: ar ? "متعثّرة" : "Stumbled",
            searchPlaceholder: ar
              ? "اسأل الذاكرة… (مثال: هبوط إيراد، توسّع إنتاج، خطر هدر)"
              : "Ask the memory… (e.g. revenue drop, expansion, waste risk)",
            // NOTE: no function props here — MemoryLake is a Client Component and
            // a Server Component cannot hand it a function (it throws and crashes
            // the page). The "X of Y memories" count is built inside MemoryLake.
            empty: ar ? "لا ذكريات مطابقة. جرّب بحثاً آخر." : "No matching memories. Try a different query.",
          }}
        />

        {/* Maintenance controls — re-seed / clear. Reference HTML doesn't show
            these (it ships hard-coded demo data); we keep them on the surface
            so operators can re-populate or reset. */}
        <div className="ml-maint">
          <form action={seedMemories}>
            <button type="submit" className="ml-maint-btn">
              <Database className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "إعادة الزرع" : "Re-seed"}
            </button>
          </form>
          <form action={clearMemories}>
            <button type="submit" className="ml-maint-btn danger">
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "مسح الكل" : "Clear all"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <div style={{ position: "relative", zIndex: 1, padding: "60px 32px", textAlign: "center" }}>
      <div
        className="inline-flex h-12 w-12 items-center justify-center"
        style={{
          border: "1px solid rgba(194,163,90,.3)",
          color: "var(--gold-soft)",
          background: "rgba(13,31,26,.4)",
          borderRadius: 14,
          margin: "0 auto",
        }}
      >
        <Brain className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(24px, 3vw, 38px)",
          color: "#fff",
          marginTop: 20,
          fontWeight: 600,
          lineHeight: 1.05,
        }}
      >
        {ar ? "البحيرة فارغة." : "The lake is empty."}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--mist)",
          opacity: 0.7,
          marginTop: 12,
          lineHeight: 1.55,
          maxWidth: "52ch",
          marginInline: "auto",
        }}
      >
        {ar
          ? "اضغط على الزر بالأسفل لزرع ثماني ذكريات تأسيسية. لاحقاً، كل حدث مهمّ يحفظه الدماغ تلقائياً."
          : "Press the button below to seed eight foundational memories. Going forward, the brain captures every meaningful event automatically."}
      </p>
      <div style={{ marginTop: 24 }}>
        <form action={seedMemories}>
          <button type="submit" className="ml-maint-btn primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع البحيرة" : "Seed the lake"}
          </button>
        </form>
      </div>
    </div>
  );
}
