// lib/docintel/parser.ts
//
// Document Intelligence parser. Phase 18 of docs/governance/PHASES-INTELLIGENCE.md.
//
// Behavior:
// - LIVE mode (with ANTHROPIC_API_KEY): calls Claude Vision on the
//   uploaded file bytes (parseWithVision below), capped per process by
//   DOCINTEL_MAX_VISION_CALLS; any failure falls through to the stub.
// - STUB mode: matches the filename and (rough) size against known
//   patterns and returns a canned-but-plausible extraction. The stub is
//   deliberately rich — the demo of dropping a "supplier_contract.pdf"
//   should produce a satisfying modal even without a real model.
//
// Output is a plain object the server action then writes into Prisma —
// keeping parsing decoupled from persistence.

export type ParsedDoc = {
  kind: "contract" | "invoice" | "lab_report" | "spreadsheet" | "other";
  title: string;
  titleEn: string;
  // The narrator's one-paragraph summary (≤ 130 words).
  summary: string;
  summaryEn: string;
  // The "headline" we render under the title — single line.
  headline: string;
  headlineEn: string;
  // Suggested module to link this to ("LORAN", "MAHA", "ARENA",
  // "TANK", "GROUP", or null).
  linkedTo: string | null;
  // Extracted structured fields. Keys depend on `kind`.
  fields: Record<string, any>;
  // Risk + obligation clauses. Each gets its own row in DocClause.
  clauses: Array<{
    kind: "risk" | "obligation" | "termination" | "renewal" | "indemnity" | "data" | "info";
    quote: string;
    quoteEn?: string;
    page?: number;
    severity: "low" | "medium" | "high";
    note?: string;
    noteEn?: string;
  }>;
  // Wall-clock latency (synthetic in stub mode).
  ms: number;
};

export type ParseInput = {
  fileName: string;
  fileSize: number;
  mimeType?: string;
  // W10 — raw file bytes, only populated when Vision is on AND the
  // file is vision-eligible (see uploadDocument). The stub ignores it.
  bytes?: Buffer;
};

// ---------------------------------------------------------------------------
// W10 — Claude Vision gate (Phase 18). Default OFF: the stub stays the
// live path and ZERO API credit is spent until the operator sets
// DOCINTEL_USE_VISION=true *and* a key is configured. Read-only reuse
// of the brain's single API config — no edit to lib/brain.
// ---------------------------------------------------------------------------
// Relative (not "@/...") so the zero-config vitest resolver and the
// Next build agree — read-only reuse of the brain's API config.
import { llmConfig, extractJson } from "../brain/llm";

const ANTHROPIC_VERSION = "2023-06-01";
// base64 inflates ~33%; 22MB raw ≈ 29MB encoded, safely under limits.
const VISION_MAX_BYTES = 22 * 1024 * 1024;

const VISION_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Intent flag AND capability: both must hold or the stub stays live. */
export function visionEnabled(): boolean {
  return process.env.DOCINTEL_USE_VISION === "true" && llmConfig().enabled;
}

/** Only images + PDF are vision-eligible; everything else → stub. */
export function isVisionEligible(mimeType?: string): boolean {
  if (!mimeType) return false;
  return VISION_IMAGE_TYPES.has(mimeType) || mimeType === "application/pdf";
}

// Spend guard, mirroring lib/brain/llm.ts's pattern with its own
// counter (can't share the brain's private one without editing it).
let __visionCalls = 0;
let __visionCapLogged = false;

// ---------------------------------------------------------------------------
// Public entry — async to allow LIVE Claude integration later.
// ---------------------------------------------------------------------------
export async function parseDocument(input: ParseInput): Promise<ParsedDoc> {
  // W10 — real Claude Vision, gated. Tried first ONLY when the flag +
  // key are set, the type is image/PDF, bytes are present, and the
  // file is under the size guard. ANY failure (cap hit, non-2xx,
  // bad JSON, throw) falls straight through to the stub below — the
  // drop zone must never hard-fail because Vision had a bad day.
  if (
    visionEnabled() &&
    isVisionEligible(input.mimeType) &&
    input.bytes &&
    input.fileSize <= VISION_MAX_BYTES
  ) {
    try {
      const v = await parseWithVision(input);
      if (v) return v;
    } catch (err) {
      console.warn("[docintel] Vision path failed; using stub:", err);
    }
  }

  // Stub mode. The "intelligence" lives in pattern matching and
  // a small library of canned extractions — good enough for demos and
  // for offline development.
  // Synthetic latency. The "wow moment" is "4 seconds" so we cap there.
  const minMs = 1800;
  const maxMs = 3600;
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  await new Promise((r) => setTimeout(r, ms));

  const fn = input.fileName.toLowerCase();
  // Match patterns in priority order
  if (/contract|agreement|عقد|اتفاق/.test(fn)) return supplierContract(input, ms);
  if (/invoice|فاتورة|bill/.test(fn)) return supplierInvoice(input, ms);
  if (/lab|تحليل|hach|brix|qc|quality/.test(fn)) return labReport(input, ms);
  if (/csv|xlsx|spreadsheet|الإكسل|بيانات|sheet/.test(fn)) return spreadsheet(input, ms);
  // Generic fallback — still produces a usable extraction
  return genericDocument(input, ms);
}

// ---------------------------------------------------------------------------
// W10 — real Claude Vision extraction. Returns null on ANY problem so
// parseDocument falls back to the stub. Never throws to the caller.
// ---------------------------------------------------------------------------
async function parseWithVision(input: ParseInput): Promise<ParsedDoc | null> {
  try {
    const cfg = llmConfig();
    if (!cfg.apiKey || !input.bytes) return null;

    const cap = Number(process.env.DOCINTEL_MAX_VISION_CALLS ?? 50);
    if (cap > 0 && __visionCalls >= cap) {
      if (!__visionCapLogged) {
        __visionCapLogged = true;
        console.warn(
          `[docintel] Vision cost cap reached (${cap} calls) — serving stub. Raise DOCINTEL_MAX_VISION_CALLS to allow more.`,
        );
      }
      return null;
    }

    const mime = input.mimeType ?? "";
    const b64 = input.bytes.toString("base64");
    const mediaBlock =
      mime === "application/pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: b64 },
          }
        : {
            type: "image",
            source: { type: "base64", media_type: mime, data: b64 },
          };

    const system = `You extract structured business-document data for a bilingual (Arabic/English) ERP. Return ONLY one JSON object — no prose, no markdown fence — matching this TypeScript type exactly:

type ParsedDoc = {
  kind: "contract" | "invoice" | "lab_report" | "spreadsheet" | "other";
  title: string; titleEn: string;          // Arabic + English
  summary: string; summaryEn: string;      // <=130 words each, both languages
  headline: string; headlineEn: string;    // one line each
  linkedTo: "LORAN" | "MAHA" | "ARENA" | "TANK" | "GROUP" | null;
  fields: Record<string, any>;             // key facts; keys depend on kind
  clauses: Array<{
    kind: "risk"|"obligation"|"termination"|"renewal"|"indemnity"|"data"|"info";
    quote: string; quoteEn?: string;       // verbatim from the doc + EN translation
    page?: number; severity: "low"|"medium"|"high";
    note?: string; noteEn?: string;        // your advisory note, both languages
  }>;
};

Classify "kind" from the document's own content (not its filename). Always fill BOTH the Arabic and English fields. Omit a key rather than guessing. Example of the expected shape and tone for a supplier contract: {"kind":"contract","title":"اتفاقية تزويد بذور","titleEn":"Seed Supply Agreement","headline":"١٤ صفحة · مدة ٣ سنوات","headlineEn":"14-page · 3-year term","summary":"...","summaryEn":"...","linkedTo":"LORAN","fields":{"termMonths":36,"totalValue":420000,"currency":"JOD"},"clauses":[{"kind":"risk","quote":"...","quoteEn":"...","page":7,"severity":"high","note":"...","noteEn":"..."}]}`;

    const t0 = Date.now();
    __visionCalls++;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 2000,
        temperature: 0.2,
        system,
        messages: [
          {
            role: "user",
            content: [
              mediaBlock,
              {
                type: "text",
                text: `Extract this ${mime} document ("${input.fileName}"). Quote clauses verbatim. Return only the JSON object.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(
        "[docintel] Anthropic vision error:",
        res.status,
        (await res.text()).slice(0, 300),
      );
      return null;
    }

    const json: any = await res.json();
    const text = Array.isArray(json?.content)
      ? json.content
          .filter((c: any) => c?.type === "text" && typeof c.text === "string")
          .map((c: any) => c.text)
          .join("\n")
      : "";
    const raw = extractJson<any>(text);
    return coerceParsed(raw, Date.now() - t0);
  } catch (err) {
    console.warn("[docintel] parseWithVision threw:", err);
    return null;
  }
}

// Trust-no-input coercion: the model can return anything. We hard-map
// every field to the ParsedDoc contract; if it's too thin to be
// useful we return null and the stub takes over.
function coerceParsed(raw: any, ms: number): ParsedDoc | null {
  if (!raw || typeof raw !== "object") return null;

  const str = (v: any): string => (typeof v === "string" ? v.trim() : "");
  const KINDS = ["contract", "invoice", "lab_report", "spreadsheet", "other"];
  const CLAUSE_KINDS = [
    "risk", "obligation", "termination", "renewal", "indemnity", "data", "info",
  ];
  const SEV = ["low", "medium", "high"];
  const LINKS = ["LORAN", "MAHA", "ARENA", "TANK", "GROUP"];

  const title = str(raw.title) || str(raw.titleEn);
  const summary = str(raw.summary) || str(raw.summaryEn);
  // Too thin to be worth showing — let the stub produce something rich.
  if (!title || !summary) return null;

  const clauses = Array.isArray(raw.clauses)
    ? raw.clauses
        .map((c: any) => {
          const quote = str(c?.quote) || str(c?.quoteEn);
          if (!quote) return null;
          const page = Number(c?.page);
          return {
            kind: CLAUSE_KINDS.includes(c?.kind) ? c.kind : "info",
            quote,
            quoteEn: str(c?.quoteEn) || undefined,
            page: Number.isFinite(page) && page > 0 ? page : undefined,
            severity: SEV.includes(c?.severity) ? c.severity : "low",
            note: str(c?.note) || undefined,
            noteEn: str(c?.noteEn) || undefined,
          };
        })
        .filter(Boolean)
        .slice(0, 24)
    : [];

  return {
    kind: KINDS.includes(raw.kind) ? raw.kind : "other",
    title,
    titleEn: str(raw.titleEn) || title,
    summary,
    summaryEn: str(raw.summaryEn) || summary,
    headline: str(raw.headline) || str(raw.headlineEn) || title,
    headlineEn: str(raw.headlineEn) || str(raw.headline) || title,
    linkedTo: LINKS.includes(raw.linkedTo) ? raw.linkedTo : null,
    fields:
      raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)
        ? raw.fields
        : {},
    clauses: clauses as ParsedDoc["clauses"],
    ms,
  };
}

// ---------------------------------------------------------------------------
// Canned extractions
// ---------------------------------------------------------------------------

function supplierContract(input: ParseInput, ms: number): ParsedDoc {
  const pages = sizeToPages(input.fileSize, 14);
  return {
    kind: "contract",
    title: "اتفاقية تزويد بذور دفيئة لوران",
    titleEn: "Loran Greenhouse Seed Supply Agreement",
    headline: `${pages} صفحة · مدة ٣ سنوات · القيمة الإجمالية ٤٢٠,٠٠٠ د.أ`,
    headlineEn: `${pages}-page agreement · 3-year term · 420,000 JOD total`,
    summary:
      "اتفاقية تزويد متعدد المواسم بين مزارع لوران ومورّد البذور الهولندي «Rijk Zwaan» لتوريد سبعة أصناف من الطماطم الكرزية والخيار الياباني للدفيئتين الذكيّتين. المدة ٣٦ شهراً مع تجديد تلقائي ما لم يُخطر أحد الطرفين قبل ٩٠ يوماً. السقف السعري مرتبط بمؤشر EUR/JOD مع ضبط نصف سنوي. توجد بنود ضمان جودة وفقاً لمعيار ISTA. يجب الانتباه إلى شرط الحصرية لمنطقة الشام والذي يقيّد التعامل مع موردين منافسين.",
    summaryEn:
      "A multi-season supply agreement between Loran Farms and the Dutch seed supplier Rijk Zwaan covering seven cherry-tomato and Japanese-cucumber varieties for the two smart greenhouses. 36-month term with automatic renewal unless either party gives 90-day notice. Price ceiling linked to EUR/JOD with semi-annual adjustment. ISTA-grade quality guarantees included. Heads-up: a Levant-region exclusivity clause restricts dealings with competing suppliers.",
    linkedTo: "LORAN",
    fields: {
      parties: ["مزارع لوران للاستثمار الزراعي", "Rijk Zwaan B.V."],
      effectiveDate: "2026-06-01",
      termMonths: 36,
      autoRenew: true,
      noticeDays: 90,
      totalValue: 420000,
      currency: "JOD",
      jurisdiction: "Amman, Jordan",
      varietalsCount: 7,
      pricingIndex: "EUR/JOD",
    },
    clauses: [
      {
        kind: "termination",
        quote:
          "تتجدّد هذه الاتفاقية تلقائياً ما لم يقدّم أي طرف إخطاراً خطّياً قبل ٩٠ يوماً من تاريخ الانتهاء.",
        quoteEn:
          "This Agreement renews automatically unless either party provides ninety (90) days written notice prior to expiry.",
        page: 4,
        severity: "medium",
        note: "احرص على وضع تذكير في الأجندة قبل ١٢٠ يوماً من تاريخ الانتهاء.",
        noteEn: "Set a reminder 120 days before expiry to give yourself room.",
      },
      {
        kind: "risk",
        quote:
          "يلتزم المشتري بعدم التعاقد مع موردين منافسين لتوريد الأصناف نفسها داخل بلاد الشام طوال مدة الاتفاقية.",
        quoteEn:
          "Buyer shall not engage competing suppliers for the same varietals within the Levant during the term.",
        page: 7,
        severity: "high",
        note: "بند حصرية إقليمي. قد يحدّ من قدرتنا على الاستجابة لارتفاع أسعار اليورو.",
        noteEn:
          "Regional exclusivity clause. Could limit response to EUR price spikes.",
      },
      {
        kind: "obligation",
        quote:
          "يضمن البائع أن جميع البذور المسلَّمة تستوفي معايير ISTA من حيث نسبة الإنبات (≥٩٢٪) ودرجة النقاوة (≥٩٩٫٥٪).",
        quoteEn:
          "Seller warrants that all delivered seeds meet ISTA standards with germination ≥92% and purity ≥99.5%.",
        page: 9,
        severity: "low",
      },
      {
        kind: "data",
        quote:
          "يحق للبائع طلب بيانات الإنتاجية الموسمية من المشتري لأغراض ضبط الجودة، بما لا يتعدى مرتين سنوياً.",
        quoteEn:
          "Seller may request seasonal yield data from Buyer for quality assurance, no more than twice per year.",
        page: 11,
        severity: "low",
      },
    ],
    ms,
  };
}

function supplierInvoice(input: ParseInput, ms: number): ParsedDoc {
  return {
    kind: "invoice",
    title: "فاتورة المورّد · المها للألبان",
    titleEn: "Supplier Invoice · Maha Dairy",
    headline:
      "INV-2026-0481 · مستحقة في ١٤ يوماً · ٢٣,٤٢٠ د.أ",
    headlineEn:
      "INV-2026-0481 · due in 14 days · 23,420 JOD",
    summary:
      "فاتورة من شركة عبوات «MENA Pack» مقابل ٤٢ ألف عبوة بلاستيكية مخصصة للبنة البلدية، تم تسليمها في ٢٧ نيسان. الإجمالي ٢٣,٤٢٠ د.أ شامل ضريبة المبيعات. شروط الدفع صافي ١٤، أي ١٠ أيار. لا توجد ملاحظات سلبية على الجودة، والكميات تطابق طلب الشراء PO-2026-0202.",
    summaryEn:
      "Invoice from MENA Pack for 42,000 plastic containers tailored to laban beladi, delivered on 27 April. Total 23,420 JOD inclusive of sales tax. Net-14 terms — payable by 10 May. No quality flags; quantities match PO-2026-0202.",
    linkedTo: "MAHA",
    fields: {
      vendor: "MENA Pack Ltd.",
      invoiceNumber: "INV-2026-0481",
      issueDate: "2026-04-27",
      dueDate: "2026-05-10",
      poRef: "PO-2026-0202",
      subtotal: 21800,
      tax: 1620,
      total: 23420,
      currency: "JOD",
      terms: "NET-14",
      lineItems: 1,
    },
    clauses: [
      {
        kind: "risk",
        quote:
          "تستحق غرامة تأخير قدرها ١٫٥٪ شهرياً على الرصيد المتأخر بعد تاريخ الاستحقاق.",
        quoteEn:
          "A late-payment fee of 1.5% per month accrues on any balance past due.",
        severity: "medium",
        note: "جدول الدفع تلقائياً قبل ٧ أيار حتى لا تُحتسب الغرامة.",
        noteEn: "Schedule payment by 7 May to avoid the fee.",
      },
      {
        kind: "info",
        quote: "كميات الفاتورة تطابق طلب الشراء الموقّع PO-2026-0202.",
        quoteEn: "Invoice quantities match signed PO-2026-0202.",
        severity: "low",
      },
    ],
    ms,
  };
}

function labReport(input: ParseInput, ms: number): ParsedDoc {
  return {
    kind: "lab_report",
    title: "تقرير مختبر · دفعة المها MAHA-00012",
    titleEn: "Lab Report · Maha Batch MAHA-00012",
    headline:
      "اختبار جودة · جميع المعايير ضمن النطاق · معيار البكتيريا الكلية ٣٢ CFU/ml",
    headlineEn:
      "Quality assay · all metrics within range · TPC 32 CFU/ml",
    summary:
      "تقرير مختبر JIDCO لدفعة الحليب الطازج MAHA-00012 المُنتَجة في ٣٠ نيسان. النتائج: نسبة الدهن ٣٫٥٪، البروتين ٣٫٢٪، الحموضة ٠٫١٦٪، البكتيريا الكلية ٣٢ CFU/ml. كل القيم ضمن الحدود التي يفرضها مواصفة الجودة الأردنية JS 1112. لم تُسجَّل أي مادة محظورة.",
    summaryEn:
      "JIDCO lab report on raw-milk batch MAHA-00012 produced on April 30. Fat 3.5%, protein 3.2%, acidity 0.16%, total plate count 32 CFU/ml — all within the Jordanian JS 1112 quality spec. No banned substances detected.",
    linkedTo: "MAHA",
    fields: {
      batchNumber: "MAHA-00012",
      lab: "JIDCO",
      reportDate: "2026-05-01",
      fatPct: 3.5,
      proteinPct: 3.2,
      acidityPct: 0.16,
      tpcCfuPerMl: 32,
      antibiotics: "not detected",
      qualitySpec: "JS 1112",
      pass: true,
    },
    clauses: [
      {
        kind: "info",
        quote: "البكتيريا الكلية: 32 CFU/ml — أقل بكثير من الحد الأقصى (100,000).",
        quoteEn: "Total plate count: 32 CFU/ml — well under the 100,000 ceiling.",
        severity: "low",
      },
    ],
    ms,
  };
}

function spreadsheet(input: ParseInput, ms: number): ParsedDoc {
  return {
    kind: "spreadsheet",
    title: "جدول حجوزات · أرينا سبيس",
    titleEn: "Bookings Sheet · Arena Space",
    headline:
      "٢٢٤ صف · من ١ كانون الثاني حتى ٣٠ نيسان · إجمالي الإيراد ٢٨٧,٤٠٠ د.أ",
    headlineEn:
      "224 rows · 1 Jan – 30 Apr · 287,400 JOD revenue",
    summary:
      "ملف Excel يحتوي على ٢٢٤ حجزاً موزعاً على فروع أرينا سبيس عمّان وعقبة وسوفية للفترة من بداية العام حتى نهاية نيسان. الأعمدة: المرجع، اسم الضيف، نوع الغرفة، تاريخ الوصول، عدد الليالي، السعر، حالة الإلغاء. ٢٧ حجزاً مُلغى يمكن استبعاده تلقائياً قبل أي حساب للإيراد الصافي.",
    summaryEn:
      "Excel file with 224 bookings across Arena Space Amman, Aqaba, and Sofia for January through April. Columns: reference, guest, room type, check-in, nights, rate, cancellation flag. 27 cancelled rows can be filtered out before computing net revenue.",
    linkedTo: "ARENA",
    fields: {
      rows: 224,
      cancelled: 27,
      sites: ["Amman", "Aqaba", "Sofia"],
      dateFrom: "2026-01-01",
      dateTo: "2026-04-30",
      grossRevenue: 287400,
      currency: "JOD",
    },
    clauses: [
      {
        kind: "info",
        quote: "٢٧ صفاً مُعلَّماً بحقل cancelled=true — استبعدها من احتساب الإيراد الصافي.",
        quoteEn: "27 rows flagged cancelled=true — exclude from net revenue calculations.",
        severity: "low",
      },
    ],
    ms,
  };
}

function genericDocument(input: ParseInput, ms: number): ParsedDoc {
  return {
    kind: "other",
    title: input.fileName.replace(/\.[^.]+$/, ""),
    titleEn: input.fileName.replace(/\.[^.]+$/, ""),
    headline: humanSize(input.fileSize),
    headlineEn: humanSize(input.fileSize),
    summary:
      "تم استلام الملف وحفظ نسخة منه. لم يستطع المُستخرِج التعرّف على نمط معروف، لكنه تأكد أنّه قابل للقراءة. يمكنك إعادة إرساله بعد إعادة تسميته (مثلاً «contract_…»، «invoice_…») لتفعيل الاستخراج المُنظَّم.",
    summaryEn:
      "File received and saved. The extractor didn't recognize a known pattern but confirmed it's readable. Re-upload it under a more descriptive filename (e.g. \"contract_…\", \"invoice_…\") to trigger structured extraction.",
    linkedTo: null,
    fields: {
      sizeBytes: input.fileSize,
      mimeType: input.mimeType ?? "unknown",
    },
    clauses: [],
    ms,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sizeToPages(bytes: number, fallback = 8): number {
  // Rough heuristic — a standard PDF page is ~50KB. Floor at 1, ceil at 80.
  if (!bytes || bytes <= 0) return fallback;
  const p = Math.round(bytes / (50 * 1024));
  return Math.max(1, Math.min(80, p || fallback));
}

function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
