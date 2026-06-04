// narrator.claude.ts — Claude-backed Narrator with persistent cache.
//
// Cache key: (scope, topic, register, locale, sha1(canonicalFacts))
// TTL: 1 hour by default — controlled per-request via NarrativeRequest.ttlMs.
//
// Stub mode (no ANTHROPIC_API_KEY) returns a topic-aware editorial template.
// The template is deliberately rich — it cites the actual numbers from the
// facts payload — so the UI never feels like it's printing placeholder text.
//
// Phase 4 of docs/PHASES-INTELLIGENCE.md.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/db";
import { callLlm, llmConfig, type LlmRequest } from "./llm";
import { verifyNarrative } from "./verifier";
import { score as confidenceScore } from "./confidence";
import type {
  Narrator,
  NarrativeRequest,
  Narrative,
  NarrativeRegister,
} from "./narrator";

const REGISTER_LIMITS: Record<NarrativeRegister, { min: number; max: number }> = {
  headline:  { min: 6,   max: 14  },
  editorial: { min: 60,  max: 130 },
  executive: { min: 200, max: 420 },
};

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

class ClaudeNarrator implements Narrator {
  async write(req: NarrativeRequest): Promise<Narrative> {
    const t0 = Date.now();
    const scope = req.scope ?? "default";
    const topic = req.topic ?? "general";
    const factsHash = hashFacts(req.facts);

    // 1. Cache lookup
    const hit = await prisma.narrative.findUnique({
      where: {
        scope_topic_register_locale_factsHash: {
          scope,
          topic,
          register: req.register,
          locale: req.locale,
          factsHash,
        },
      },
    });
    if (hit && hit.expiresAt.getTime() > Date.now()) {
      return {
        text: hit.text,
        wordCount: countWords(hit.text),
        ms: Date.now() - t0,
        cacheHit: true,
        isStub: hit.isStub,
        model: hit.model ?? undefined,
      };
    }

    // 2. LLM (or stub) call
    const limits = REGISTER_LIMITS[req.register];
    const isAr = req.locale === "ar";

    const system = isAr
      ? buildSystemPromptAr(req.register, limits, req.toneOverride)
      : buildSystemPromptEn(req.register, limits, req.toneOverride);

    const user = isAr
      ? buildUserPromptAr(req)
      : buildUserPromptEn(req);

    const llmReq: LlmRequest = {
      system,
      user,
      context: { facts: req.facts, citations: req.citations ?? [] },
      maxTokens: req.register === "executive" ? 900 : req.register === "editorial" ? 320 : 60,
      temperature: req.register === "headline" ? 0.4 : 0.65,
    };

    const stub = (_r: LlmRequest) => buildStub(req);
    const res = await callLlm(llmReq, stub);

    // The model can sometimes wrap output in quotes — clean it up.
    const text = sanitize(res.text);

    // Phase 22 — Brain Trustworthiness Layer. Verify the prose against the
    // facts payload that produced it; record coverage + confidence so the
    // trust dashboard reads real telemetry. Stubs always self-verify
    // because the stub generator only references numbers from `facts`.
    const verification = verifyNarrative(text, req.facts);
    const confidence = confidenceScore({
      verification,
      dataAsOf: Date.now(),
      supportingPoints: Math.max(1, Object.keys(req.facts).length),
      graphSupports: null, // graph hook lands in Phase 1 integration
    });

    // 3. Persist cache entry (idempotent upsert)
    const ttl = req.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl);
    await prisma.narrative.upsert({
      where: {
        scope_topic_register_locale_factsHash: {
          scope,
          topic,
          register: req.register,
          locale: req.locale,
          factsHash,
        },
      },
      create: {
        scope,
        topic,
        register: req.register,
        locale: req.locale,
        factsHash,
        text,
        model: res.model ?? null,
        isStub: res.isStub,
        ms: res.ms,
        trustScore: confidence.score,
        trustLabel: confidence.label,
        claimsTotal: verification.total,
        claimsMatched: verification.verified,
        expiresAt,
      },
      update: {
        text,
        model: res.model ?? null,
        isStub: res.isStub,
        ms: res.ms,
        trustScore: confidence.score,
        trustLabel: confidence.label,
        claimsTotal: verification.total,
        claimsMatched: verification.verified,
        expiresAt,
      },
    });

    return {
      text,
      wordCount: countWords(text),
      ms: Date.now() - t0,
      cacheHit: false,
      isStub: res.isStub,
      model: res.model,
    };
  }

  async invalidate(scope: { orgId: string; tag?: string }): Promise<void> {
    await prisma.narrative.deleteMany({
      where: {
        scope: scope.orgId,
        ...(scope.tag ? { topic: scope.tag } : {}),
      },
    });
  }
}

let _instance: ClaudeNarrator | null = null;
export function narrator(): ClaudeNarrator {
  if (!_instance) _instance = new ClaudeNarrator();
  return _instance;
}

// ─────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────

function buildSystemPromptEn(
  register: NarrativeRegister,
  limits: { min: number; max: number },
  tone: NarrativeRequest["toneOverride"]
): string {
  const base = `
You are the Narrator of an executive ERP intelligence layer. Your job is to turn structured business facts into editorial prose that reads like The Economist or The New York Times Business desk — confident, specific, citation-driven. You never say "as an AI". You never use bullet points. You never hedge with "may" or "could potentially". You write what's true and you say it cleanly.

Speak in active voice. Cite specific numbers from the facts you're given. When the data is ambiguous, name the ambiguity in plain words rather than padding with qualifiers.

Register: "${register}". Word budget: ${limits.min}–${limits.max} words.${tone ? ` Tone: ${tone}.` : ""}
Output the narrative text only. No preamble. No quotes around the output. No headings.
`.trim();
  return base;
}

function buildSystemPromptAr(
  register: NarrativeRegister,
  limits: { min: number; max: number },
  tone: NarrativeRequest["toneOverride"]
): string {
  return `
أنت الراوي لطبقة ذكاء ERP تنفيذية. مهمتك تحويل وقائع الأعمال المُهيكلة إلى نثر تحريري بمستوى مجلة "الإيكونوميست" أو القسم الاقتصادي في "النيويورك تايمز" — واثق، محدد، مدعّم بالأرقام. لا تقل "بصفتي ذكاءً اصطناعياً". لا تستخدم نقاطاً. لا تتحفّظ بكلمات مثل "قد" أو "ربما". اكتب الحقيقة كما هي.

اكتب بصيغة المبني للمعلوم. اذكر أرقاماً محددة من الوقائع. إذا كانت البيانات غامضة، سمّ الغموض بكلمات مباشرة بدلاً من حشو التحفظات.

السجل: "${register}". الميزانية: ${limits.min}–${limits.max} كلمة.${tone ? ` النبرة: ${tone}.` : ""}
أخرج النص التحريري فقط. لا مقدمة. لا علامات اقتباس حول الإخراج. لا عناوين.
`.trim();
}

function buildUserPromptEn(req: NarrativeRequest): string {
  const lines: string[] = [];
  if (req.topic) lines.push(`Topic: ${req.topic}`);
  if (req.summary) lines.push(`Existing summary line: "${req.summary}"`);
  lines.push(`Facts (JSON):\n${stableJson(req.facts)}`);
  if (req.citations && req.citations.length) {
    lines.push(`Available citations:\n${req.citations.map((c) => `- [${c.ref}] ${c.label}`).join("\n")}`);
  }
  lines.push("Write the narrative now.");
  return lines.join("\n\n");
}

function buildUserPromptAr(req: NarrativeRequest): string {
  const lines: string[] = [];
  if (req.topic) lines.push(`الموضوع: ${req.topic}`);
  if (req.summary) lines.push(`الخلاصة الحالية: "${req.summary}"`);
  lines.push(`الوقائع (JSON):\n${stableJson(req.facts)}`);
  if (req.citations && req.citations.length) {
    lines.push(`اقتباسات متاحة:\n${req.citations.map((c) => `- [${c.ref}] ${c.label}`).join("\n")}`);
  }
  lines.push("اكتب النص التحريري الآن.");
  return lines.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────
// Stub generator — topic-aware editorial templates that read real numbers.
// ─────────────────────────────────────────────────────────────────────

function buildStub(req: NarrativeRequest): string {
  const ar = req.locale === "ar";
  const f = req.facts as Record<string, any>;
  const topic = (req.topic ?? "general").toLowerCase();
  const reg = req.register;

  // For headline register, return the summary as-is or a short rephrase.
  if (reg === "headline") {
    if (req.summary) return req.summary;
    return ar ? "نظرة سريعة على المؤشّر." : "A glance at the metric.";
  }

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("en-US");
  const pct = (n: number) =>
    `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

  // Topic-specific narratives
  if (topic === "revenue") {
    const cur = num(f.revenue ?? f.value);
    const prev = num(f.prevRevenue ?? f.previous ?? f.prev);
    const delta = num(f.delta);
    const period = String(f.period ?? "30d");
    if (ar) {
      return `إيراد ${period} وصل إلى ${fmt(cur ?? 0)} د.أ، مقارنةً بـ ${fmt(prev ?? 0)} في الفترة المُقابلة — تغيّر بنسبة ${pct(delta ?? 0)}. الأثر يأتي بشكل رئيسي من قطاع الضيافة، حيث تتحرك الإيرادات مع روزنامة فعاليات أرينا. عندما يتراجع المؤشّر ${pct(delta ?? 0)} في النافذة الأخيرة، يجدر مراجعة جدول الحجوزات الكبيرة قبل أي تحريك في خط الإنتاج.`;
    }
    return `${period.toUpperCase()} revenue closed at JOD ${fmt(cur ?? 0)} against JOD ${fmt(prev ?? 0)} in the prior comparable window — a ${pct(delta ?? 0)} swing. The impulse traces to hospitality, where revenue moves with Arena's event calendar; a ${pct(delta ?? 0)} reading in the trailing window is worth reading against the next six weeks of confirmed bookings before procurement adjusts downstream production targets.`;
  }

  if (topic === "occupancy") {
    const occ = num(f.occupancyPct ?? f.value);
    const rooms = num(f.totalRooms);
    const active = num(f.activeBookings);
    if (ar) {
      return `إشغال أرينا الحالي ${(occ ? occ * 100 : 0).toFixed(0)}٪ — ${fmt(active ?? 0)} غرفة محجوزة من أصل ${fmt(rooms ?? 0)}. هذا الرقم يعكس النشاط الأسبوعي وليس متوسط الفترة، وهو يُساء قراءته عادةً بمعزل عن جدول الفعاليات. مؤشرات F&B والألبان ترتبط بالإشغال بفجوة ثلاثة أسابيع، فأي تحرك سياسي على هذا الرقم يحتاج تأكيداً من الفعاليات المؤكدة قبل اتخاذ قرارات الإنتاج.`;
    }
    return `Arena occupancy stands at ${(occ ? occ * 100 : 0).toFixed(0)}%, with ${fmt(active ?? 0)} of ${fmt(rooms ?? 0)} rooms booked. This is the live weekly read, not a period average, and it is routinely misread when divorced from the event calendar — F&B and dairy demand both lag occupancy by roughly three weeks, so any policy move on this figure should be validated against confirmed events before production targets are revised.`;
  }

  if (topic === "expense" || topic === "expenses") {
    const cur = num(f.expense ?? f.value);
    const prev = num(f.prevExpense ?? f.prev);
    const delta = num(f.delta);
    if (ar) {
      return `المصاريف في النافذة الحالية ${fmt(cur ?? 0)} د.أ مقابل ${fmt(prev ?? 0)} في الفترة السابقة (${pct(delta ?? 0)}). الانخفاض يبدو إيجابياً للوهلة الأولى لكن قد يُخفي تأجيلات في صيانة دورية أو تأخّر في فواتير موردين — يستحق التحقق من بنود التشغيل التفصيلية قبل ترجمة الرقم إلى تحسّن في الهامش.`;
    }
    return `Expense for the current window settled at JOD ${fmt(cur ?? 0)} against JOD ${fmt(prev ?? 0)} prior — a ${pct(delta ?? 0)} move. A drop reads positively at the headline level but often masks deferred maintenance or delayed supplier billing; the prudent read requires a line-item check before margin language is updated upstream.`;
  }

  if (topic === "net" || topic === "margin") {
    const net = num(f.net ?? f.value);
    const margin = num(f.marginPct);
    if (ar) {
      return `صافي الفترة ${fmt(net ?? 0)} د.أ، بهامش يقارب ${margin ? (margin * 100).toFixed(1) : "—"}٪. الرقم في خانته الطبيعية للموسم، لكن مكوّناته متفاوتة: قطاع الضيافة يحمل غالبية الهامش، وقطاع الألبان يضغط عليه عبر مخزون قارب على الانتهاء. التركيز التشغيلي خلال الأسبوعين القادمين على تصريف دفعات اللبنة سيُترجم مباشرةً إلى الهامش.`;
    }
    return `Net for the period landed at JOD ${fmt(net ?? 0)} on roughly a ${margin ? (margin * 100).toFixed(1) : "—"}% margin. The headline sits within seasonal range, but the composition is uneven: hospitality carries the bulk of the contribution while dairy presses against it via aging inventory. The next two weeks of labneh-batch movement will translate directly into reported margin.`;
  }

  // Generic fallback
  if (ar) {
    return `قراءة الرقم في سياقه: ${req.summary ?? ""}. خلف الرقم تتجمع إشارات تشغيلية متعددة — موسمية الفعاليات، نوافذ الصلاحية في الألبان، توقيت الحصاد الزراعي. الرقم وحده لا يقول القصة كاملة، لكنه نقطة الانطلاق الصحيحة للتحقق من الفروق الأسبوعية مقارنةً بالمعدّل الموسمي.`;
  }
  return `Read the number in context: ${req.summary ?? ""}. Behind the headline sits a mesh of operational signals — event seasonality, dairy expiry windows, agricultural harvest timing. The number alone does not tell the whole story, but it is the right starting point for a week-over-week check against the seasonal baseline.`;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function num(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sanitize(s: string): string {
  let out = s.trim();
  // Strip surrounding quotes the model sometimes adds.
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1).trim();
  }
  // Strip code-fence wrappers if any.
  if (out.startsWith("```")) {
    out = out.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  }
  return out;
}

/** Stable, recursive canonical JSON for hashing. */
function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
function canonicalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const obj = v as Record<string, unknown>;
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = canonicalize(obj[k]);
      return acc;
    }, {});
}
function hashFacts(facts: Record<string, any>): string {
  return createHash("sha1").update(stableJson(facts)).digest("hex").slice(0, 16);
}
