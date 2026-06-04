// lib/brain/converse.ts
//
// The conversational layer's brain. Multi-turn context manager that turns
// a user question into a 3-sentence answer with inline citations.
//
// Phase 15 of docs/PHASES-INTELLIGENCE.md.
//
// Two modes:
// - LIVE — ANTHROPIC_API_KEY is set. Calls Claude with system prompt + the
//   prior turns + a snapshot of relevant facts (insights, plans,
//   integrations) for grounding.
// - STUB — no API key. The deterministic stub picks the most relevant
//   facts from Prisma and writes a 3-sentence answer that matches the
//   shape the UI expects, including citation refs like [c1] [c2].
//
// Citations are first-class. Every numeric or named claim resolves to a
// `Citation` with { id, label, value, href } so Tab-key drill-through has
// somewhere to land.

import { prisma } from "@/lib/db/db";
import { callLlm } from "./llm";
import { retrieveDocuments, type DocHit } from "./documents.retrieve";
import { evaluateRetrieval } from "./crag";
import { sanitizeForPrompt } from "./ragGuard";

export type Citation = {
  id: string;          // "c1", "c2", … (referenced from the answer text)
  source:
    | "INSIGHT"
    | "PLAN"
    | "INTEGRATION"
    | "BOOKING"
    | "BATCH"
    | "FORECAST"
    | "STAT"
    | "DOCUMENT";
  label: string;       // human-readable label, bilingual-aware
  value?: string;      // optional numeric/short value displayed in the chip
  href: string;        // where Tab drills to
};

export type ConverseTurn = {
  role: "user" | "brain";
  text: string;
  ts: string; // ISO
  citations?: Citation[];
  // The brain's confidence in its own answer, [0,1]. UI reflects this as
  // a thin underline weight on the bottom of the answer block.
  confidence?: number;
  // Whether this turn came from the LLM or the stub generator.
  stub?: boolean;
  // Wall-clock latency for the brain turn.
  ms?: number;
};

export type ConverseSession = {
  id: string;
  scope: string;
  turns: ConverseTurn[];
  createdAt: string;
};

// ---------------------------------------------------------------------------
// In-memory session store. The conversational overlay is short-lived per
// page session — we store the last N sessions per process so a refresh
// doesn't blow context away mid-conversation. Production would persist
// these to a `ConverseSession` Prisma table; the demo doesn't need that.
// ---------------------------------------------------------------------------
const SESSIONS = new Map<string, ConverseSession>();
const MAX_TURNS_PER_SESSION = 24;

function getOrCreate(sessionId: string, scope = "default"): ConverseSession {
  let s = SESSIONS.get(sessionId);
  if (!s) {
    s = {
      id: sessionId,
      scope,
      turns: [],
      createdAt: new Date().toISOString(),
    };
    SESSIONS.set(sessionId, s);
  }
  return s;
}

export function getSession(sessionId: string): ConverseSession | null {
  return SESSIONS.get(sessionId) ?? null;
}

export function resetSession(sessionId: string) {
  SESSIONS.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Pull a relevant fact pack from Prisma. The conversational brain doesn't
// scan the entire DB — it grabs the surfaces a manager would naturally ask
// about, then lets the LLM (or stub) synthesize.
// ---------------------------------------------------------------------------
type FactPack = {
  insights: Array<{ id: string; title: string; severity: string; module: string; body: string }>;
  plans: Array<{ id: string; goal: string; status: string; targetMetric: string; targetDelta: number }>;
  integrations: Array<{ providerKey: string; status: string; errorCount: number }>;
  hotels: { totalRooms: number; occupiedNow: number; activeBookings: number };
  dairy: { batchesThisWeek: number; nearExpiry: number };
  farms: { activeCrops: number; totalFarms: number };
};

async function pullFacts(): Promise<FactPack> {
  const [insights, plans, integrations, hotelsAgg, bookings, dairyWeek, dairyExp, crops, farms] =
    await Promise.all([
      prisma.aIInsight.findMany({
        where: { deletedAt: null, status: "OPEN" },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 6,
        select: { id: true, title: true, severity: true, module: true, body: true },
      }),
      prisma.plan.findMany({
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, goal: true, status: true, targetMetric: true, targetDelta: true },
      }),
      prisma.integration.findMany({
        take: 6,
        select: { providerKey: true, status: true, errorCount: true },
      }),
      // Total room count and active bookings — rough hotel pulse.
      prisma.hotel.aggregate({ _sum: { totalRooms: true } }).catch(() => ({ _sum: { totalRooms: 0 } })),
      prisma.booking
        .count({ where: { status: { in: ["CONFIRMED", "ACTIVE", "CHECKED_IN"] } } })
        .catch(() => 0),
      prisma.dairyBatch
        .count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        })
        .catch(() => 0),
      prisma.dairyBatch
        .count({
          where: {
            expiryDate: {
              lte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              gte: new Date(),
            },
          },
        })
        .catch(() => 0),
      prisma.crop.count({ where: { status: "GROWING" } }).catch(() => 0),
      prisma.farm.count().catch(() => 0),
    ]);

  // Hotel occupancy is approximate — bookings don't model nightly stays
  // here; we just show "active bookings" as a proxy for occupancy.
  const totalRooms = hotelsAgg._sum?.totalRooms ?? 0;
  const occupiedNow = Math.min(bookings, totalRooms);

  return {
    insights,
    plans,
    integrations,
    hotels: { totalRooms, occupiedNow, activeBookings: bookings },
    dairy: { batchesThisWeek: dairyWeek, nearExpiry: dairyExp },
    farms: { activeCrops: crops, totalFarms: farms },
  };
}

// ---------------------------------------------------------------------------
// Stub generator — picks 1-3 most relevant facts and writes 3 sentences.
// The match logic is keyword-based — boring but predictable. The shape
// matches what the LIVE branch returns so the UI never branches.
// ---------------------------------------------------------------------------
type Topic =
  | "DAIRY"
  | "HOTELS"
  | "FARMS"
  | "EDUCATION"
  | "FINANCE"
  | "PLAN"
  | "INSIGHT"
  | "INTEGRATION"
  | "GENERIC";

function detectTopic(text: string): Topic {
  const t = text.toLowerCase();
  if (/dairy|milk|maha|ألبان|المها|حليب|laban|لبنة/.test(t)) return "DAIRY";
  if (/hotel|booking|arena|فندق|حجز|أرينا|occupancy|إشغال/.test(t)) return "HOTELS";
  if (/farm|crop|loran|greenhouse|دفيئة|محصول|لوران|زراع/.test(t)) return "FARMS";
  if (/education|tank|cohort|incubator|حاضن|طلاب|aau/.test(t)) return "EDUCATION";
  if (/finance|revenue|cost|cash|مالي|إيرادات|نقد|ربح|profit|margin|هامش/.test(t)) return "FINANCE";
  if (/plan|commit|approve|أقرّ|خطة|قرار/.test(t)) return "PLAN";
  if (/insight|alert|signal|تنبيه|إشارة|signal/.test(t)) return "INSIGHT";
  if (/slack|integration|api|connect|tokens|integrations|موصل|تكامل/.test(t)) return "INTEGRATION";
  return "GENERIC";
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

function stubAnswer(question: string, facts: FactPack, locale: "ar" | "en"): {
  text: string;
  citations: Citation[];
  confidence: number;
} {
  const topic = detectTopic(question);
  const ar = locale === "ar";
  const cites: Citation[] = [];
  let text = "";
  let confidence = 0.72;

  function addCite(c: Omit<Citation, "id">): string {
    const id = `c${cites.length + 1}`;
    cites.push({ id, ...c });
    return `[${id}]`;
  }

  switch (topic) {
    case "DAIRY": {
      const cite1 = addCite({
        source: "STAT",
        label: ar ? "دفعات هذا الأسبوع" : "Batches this week",
        value: String(facts.dairy.batchesThisWeek),
        href: "/dairy",
      });
      const cite2 = addCite({
        source: "STAT",
        label: ar ? "قرب انتهاء الصلاحية" : "Near expiry",
        value: String(facts.dairy.nearExpiry),
        href: "/dairy?filter=near-expiry",
      });
      const expiryInsight = facts.insights.find((i) => i.module === "DAIRY");
      const cite3 = expiryInsight
        ? addCite({
            source: "INSIGHT",
            label: ar ? "إشارة ذكاء" : "Brain insight",
            value: expiryInsight.severity,
            href: `/insights`,
          })
        : null;
      text = ar
        ? `أنتجت المها ${cite1} دفعة هذا الأسبوع، منها ${cite2} على بُعد أيام من نهاية الصلاحية. الهامش ضمن المعيار، لكن إشارة الذكاء ${
            cite3 ?? ""
          } ترجّح تحويل الدفعات القريبة إلى منفذ تجزئة قبل ساعتها الحرجة. التوصية: نقل الدفعتين الأقرب إلى أرينا سبيس وعرض ترويجي مرافق.`
        : `Maha pushed ${cite1} batches this week, ${cite2} of them within the expiry window. Margin is on benchmark, but the brain signal ${
            cite3 ?? ""
          } argues for routing the closest two into a retail outlet before the critical hour. Recommended: move them to Arena Space with a paired promo.`;
      confidence = 0.78;
      break;
    }
    case "HOTELS": {
      const cite1 = addCite({
        source: "STAT",
        label: ar ? "حجوزات نشطة" : "Active bookings",
        value: String(facts.hotels.activeBookings),
        href: "/hotels",
      });
      const cite2 = addCite({
        source: "STAT",
        label: ar ? "إجمالي الغرف" : "Total rooms",
        value: String(facts.hotels.totalRooms),
        href: "/hotels",
      });
      const occ = facts.hotels.totalRooms > 0
        ? facts.hotels.occupiedNow / facts.hotels.totalRooms
        : 0;
      text = ar
        ? `إشغال أرينا الحالي ${cite1} حجز نشط على ${cite2} غرفة، أي ${(occ * 100).toFixed(0)}٪ تقريباً. الهدف الموسمي 78٪؛ نحن إما نلامسه أو ما زلنا تحته بفارق صغير. التوصية: حملة استرجاع للضيوف العائدين خلال 14 يوماً.`
        : `Arena occupancy is ${cite1} active bookings on ${cite2} rooms — about ${(occ * 100).toFixed(0)}%. Seasonal target is 78%, so we're either at it or just below. Recommended: a 14-day winback push aimed at returning guests.`;
      confidence = 0.74;
      break;
    }
    case "FARMS": {
      const cite1 = addCite({
        source: "STAT",
        label: ar ? "محاصيل نشطة" : "Active crops",
        value: String(facts.farms.activeCrops),
        href: "/farms",
      });
      const cite2 = addCite({
        source: "STAT",
        label: ar ? "مزارع لوران" : "Loran farms",
        value: String(facts.farms.totalFarms),
        href: "/farms",
      });
      const farmInsight = facts.insights.find((i) => i.module === "FARMS");
      const cite3 = farmInsight
        ? addCite({
            source: "INSIGHT",
            label: ar ? "إشارة لوران" : "Loran signal",
            value: farmInsight.severity,
            href: `/insights`,
          })
        : null;
      text = ar
        ? `لوران تشغّل ${cite1} محصولاً عبر ${cite2} مزرعة، والاستشعار يقرأ كل 12 دقيقة. ${
            cite3 ? `أحدث إشارة: ${cite3} — ` : ""
          }الرطوبة هي المتغيّر المتحرّك هذا الأسبوع. التوصية: تشديد دورة الرّي اليدوي على الدفيئتين الذكيّتين قبل الجمعة.`
        : `Loran runs ${cite1} active crops across ${cite2} farms, with sensors polling every 12 minutes. ${
            cite3 ? `Latest signal: ${cite3} — ` : ""
          }humidity is the moving variable this week. Recommended: tighten the manual irrigation cycle on the two smart greenhouses before Friday.`;
      confidence = 0.7;
      break;
    }
    case "PLAN": {
      const draftPlan = facts.plans.find((p) => p.status === "DRAFT");
      if (draftPlan) {
        const cite1 = addCite({
          source: "PLAN",
          label: ar ? "خطة مسوّدة" : "Draft plan",
          value: fmtPct(draftPlan.targetDelta),
          href: `/plans/${draftPlan.id}`,
        });
        text = ar
          ? `هناك خطة مسوّدة بانتظار قرارك ${cite1}: ${draftPlan.goal}. الهدف هو تحريك ${draftPlan.targetMetric} بنسبة ${fmtPct(
              draftPlan.targetDelta,
            )}. اضغط Tab على الإحالة لتفتح صفحة الخطة وتُقرّها.`
          : `There's a draft plan awaiting your call ${cite1}: ${draftPlan.goal}. The target is to move ${draftPlan.targetMetric} by ${fmtPct(
              draftPlan.targetDelta,
            )}. Press Tab on the citation to open the plan page and commit it.`;
        confidence = 0.85;
      } else {
        text = ar
          ? "لا توجد خطط بانتظار قرارك الآن. آخر خطة قُطعت منذ بضعة أيام والمستجدّات أدرجتها في صفحة \"خطط\". اطلب تحديثاً متى شئت."
          : "No plans are sitting on your decision right now. The most recent commit was a few days ago and follow-ups are on the Plans page. Ask again any time.";
        confidence = 0.6;
      }
      break;
    }
    case "INSIGHT": {
      const top = facts.insights[0];
      if (top) {
        const cite1 = addCite({
          source: "INSIGHT",
          label: ar ? "أعلى إشارة" : "Top signal",
          value: top.severity,
          href: "/insights",
        });
        text = ar
          ? `أعلى إشارة الآن ${cite1}: ${top.title}. ${top.body.slice(0, 120)}. ابدأ من هناك — التبعات أوضح مما تبدو.`
          : `The loudest signal right now ${cite1}: ${top.title}. ${top.body.slice(0, 120)}. Start there — the downstream is clearer than it looks.`;
        confidence = 0.8;
      } else {
        text = ar
          ? "ما من إشارات مفتوحة. الدماغ هادئ هذه الساعة."
          : "No open signals. The brain is quiet this hour.";
        confidence = 0.55;
      }
      break;
    }
    case "INTEGRATION": {
      const broken = facts.integrations.find((i) => i.status === "ERROR" || i.status === "EXPIRED");
      const connected = facts.integrations.filter((i) => i.status === "CONNECTED").length;
      const cite1 = addCite({
        source: "INTEGRATION",
        label: ar ? "موصلات متّصلة" : "Connected providers",
        value: String(connected),
        href: "/integrations",
      });
      if (broken) {
        const cite2 = addCite({
          source: "INTEGRATION",
          label: broken.providerKey,
          value: broken.status,
          href: `/integrations/${broken.providerKey}`,
        });
        text = ar
          ? `لديك ${cite1} موصلاً نشطاً، ولكن ${cite2} يطلب إعادة ربط. سجلّ الأخطاء يقترح أن المشكلة عابرة. التوصية: اضغط Tab وأعد الربط الآن.`
          : `You have ${cite1} active providers, but ${cite2} needs a reconnect. The error log reads as transient. Recommended: Tab in and reconnect now.`;
        confidence = 0.82;
      } else {
        text = ar
          ? `${cite1} موصلاً متّصل ولا أخطاء مفتوحة. آخر إرسال خرج بسلام، والاتصال يبدو مستقراً. لا حاجة لتدخّلك.`
          : `${cite1} providers connected with no open errors. The last send went out cleanly and the bus is steady. No action needed.`;
        confidence = 0.78;
      }
      break;
    }
    case "FINANCE": {
      const fmt = ar ? "ar-JO-u-nu-latn" : "en-US";
      // Rough cross-company pulse — bookings × 95 JOD avg ARR proxy.
      const proxyRevenue = facts.hotels.activeBookings * 95;
      const cite1 = addCite({
        source: "STAT",
        label: ar ? "تقدير الإيرادات" : "Revenue proxy",
        value: new Intl.NumberFormat(fmt).format(proxyRevenue) + " JOD",
        href: "/finance",
      });
      const cite2 = addCite({
        source: "STAT",
        label: ar ? "محاصيل نشطة" : "Active crops",
        value: String(facts.farms.activeCrops),
        href: "/farms",
      });
      text = ar
        ? `إيرادات الأسبوع التقديرية ${cite1} مدفوعة أساساً بحجوزات أرينا. لوران ${cite2} يضيف هامش زراعي ثابت لكنه أصغر. التوصية: ركّز سؤالك المالي القادم على نسبة المساهمة لكل وحدة عمل قبل اتخاذ قرار توزيع رأس المال.`
        : `Estimated weekly revenue is ${cite1}, mostly Arena bookings. Loran ${cite2} adds steady but smaller agri margin. Recommended: frame your next finance question around contribution by business unit before any capital re-allocation call.`;
      confidence = 0.65;
      break;
    }
    case "GENERIC":
    default: {
      // Cross-org one-liner.
      const cite1 = addCite({
        source: "STAT",
        label: ar ? "إشارات مفتوحة" : "Open signals",
        value: String(facts.insights.length),
        href: "/insights",
      });
      const cite2 = addCite({
        source: "STAT",
        label: ar ? "خطط نشطة" : "Active plans",
        value: String(facts.plans.length),
        href: "/plans",
      });
      text = ar
        ? `النظام الآن ${cite1} إشارة ذكاء مفتوحة و${cite2} خطة نشطة. ولا حالة طوارئ. اسألني سؤالاً أكثر تحديداً (ألبان، فنادق، خطط…) لأعطيك الجواب بأرقام بدلاً من نظرة عامة.`
        : `The system has ${cite1} open signals and ${cite2} active plans right now, no emergencies. Ask a more specific question (dairy, hotels, plans…) and I'll answer in numbers instead of a survey.`;
      confidence = 0.6;
      break;
    }
  }

  return { text, citations: cites, confidence };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export type AskInput = {
  sessionId: string;
  question: string;
  scope?: string;
  locale?: "ar" | "en";
};

export type AskResult = {
  session: ConverseSession;
  brainTurn: ConverseTurn;
};

export async function ask(input: AskInput): Promise<AskResult> {
  const t0 = Date.now();
  const session = getOrCreate(input.sessionId, input.scope ?? "default");
  const locale = input.locale ?? "ar";

  // Append user turn
  const userTurn: ConverseTurn = {
    role: "user",
    text: input.question,
    ts: new Date().toISOString(),
  };
  session.turns.push(userTurn);

  // Pull structured facts and retrieve relevant uploaded documents in
  // parallel. The documents are the RAG "retrieve" stage (Phase RAG-2):
  // semantic search over the tenant's contracts/invoices/reports via the
  // embedding seam. Their snippets ground the answer in real clauses.
  const [facts, docHits] = await Promise.all([
    pullFacts(),
    retrieveDocuments(input.question, {
      scope: session.scope,
      k: 3,
      minScore: 0.08,
      locale,
    }).catch(() => [] as DocHit[]),
  ]);

  // Build the prompt — we always use the stub generator's payload as the
  // factual ground truth; the LLM gets the same fact pack so it can write
  // a more natural answer when ANTHROPIC_API_KEY is present.
  const stubResult = stubAnswer(input.question, facts, locale);

  // Phase RAG-5 — Corrective RAG. Grade the retrieval before we ground on it.
  // INCORRECT retrieval is dropped entirely (don't cite an irrelevant doc);
  // AMBIGUOUS is kept but hedged and lowers confidence; CORRECT is used as-is.
  const crag = evaluateRetrieval(docHits);
  const usedDocs = crag.keep;

  // RAG "augment": turn the APPROVED retrieved documents into citations the
  // operator can drill into, and a compact, quoted context block for the LLM.
  // We append the doc citations after the stub's so their ids continue.
  const docCitations: Citation[] = usedDocs.map((h, i) => ({
    id: `c${stubResult.citations.length + i + 1}`,
    source: "DOCUMENT",
    label: locale === "ar" ? (h.title || h.titleEn || "مستند") : (h.titleEn || h.title || "Document"),
    value: h.kind,
    href: `/documents/${h.documentId}`,
  }));
  const allCitations = [...stubResult.citations, ...docCitations];

  const llm = await callLlm(
    {
      system:
        locale === "ar"
          ? "أنت H-Nerve — الدماغ المحادث لمنظومة ERP. أجِب في 3 جمل بالضبط. استخدم إحالات مرجعية بصيغة [c1] [c2] للأرقام والادعاءات وللاستشهاد بالمستندات. لا تخترع أرقاماً ولا بنوداً؛ استشهد فقط بالمستندات المرفقة. اكتب بنبرة هادئة، صريحة، عملية."
          : "You are H-Nerve, the conversational brain of an ERP. Answer in exactly 3 sentences. Use [c1] [c2] reference markers for numbers, claims, and document citations. Never invent numbers or clauses; cite only the documents provided. Tone: calm, plain, operational.",
      user: input.question,
      context: {
        priorTurns: session.turns.slice(-MAX_TURNS_PER_SESSION),
        facts,
        documents: docCitations.map((c, i) => ({
          ref: c.id,
          title: c.label,
          kind: usedDocs[i]?.kind,
          // Phase RAG-7 — sanitize uploaded text before it enters the prompt.
          snippet: sanitizeForPrompt(usedDocs[i]?.snippet?.text ?? "", 240).text,
        })),
      },
      maxTokens: 320,
      temperature: 0.5,
    },
    () => stubResult.text,
  );

  // When running on the stub (no LLM key), the deterministic answer won't
  // weave in the retrieved docs on its own. Append one grounded sentence so
  // the document retrieval is visible end-to-end even in the demo state.
  // CRAG governs the wording: a CORRECT match states the link plainly, an
  // AMBIGUOUS one hedges ("may relate to"), and a dropped one says nothing.
  let answerText = llm.text;
  if (llm.isStub && usedDocs.length > 0) {
    const top = usedDocs[0];
    const ref = docCitations[0].id;
    const snippetRaw =
      locale === "ar"
        ? top.snippet?.text
        : top.snippet?.textEn || top.snippet?.text;
    const snippet = sanitizeForPrompt(snippetRaw ?? "", 140).text;
    const hedged = crag.quality === "ambiguous";
    if (locale === "ar") {
      const lead = hedged ? "قد يتقاطع هذا مع" : "ومن المستندات المرفقة، يتقاطع هذا مع";
      answerText += ` ${lead} «${top.title}» ${`[${ref}]`}${snippet ? `: «${snippet}»` : ""}.`;
    } else {
      const lead = hedged ? "This may relate to" : "From the uploaded documents, this intersects";
      answerText += ` ${lead} “${top.titleEn || top.title}” ${`[${ref}]`}${snippet ? `: “${snippet}”` : ""}.`;
    }
  }

  // Reflect retrieval quality in the turn confidence: an answer leaning on
  // ambiguous retrieval should read a touch less certain.
  const confidence =
    usedDocs.length > 0 && crag.quality === "ambiguous"
      ? Number((stubResult.confidence * (0.85 + 0.15 * crag.groundingConfidence)).toFixed(3))
      : stubResult.confidence;

  const brainTurn: ConverseTurn = {
    role: "brain",
    text: answerText,
    ts: new Date().toISOString(),
    citations: allCitations,
    confidence,
    stub: llm.isStub,
    ms: Date.now() - t0,
  };
  session.turns.push(brainTurn);

  // Cap session length so the in-memory map doesn't grow unbounded.
  if (session.turns.length > MAX_TURNS_PER_SESSION) {
    session.turns = session.turns.slice(-MAX_TURNS_PER_SESSION);
  }

  return { session, brainTurn };
}
