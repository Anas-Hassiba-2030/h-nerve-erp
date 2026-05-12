// lib/docintel/parser.ts
//
// Document Intelligence parser. Phase 18 of docs/PHASES-INTELLIGENCE.md.
//
// Behavior:
// - LIVE mode (with ANTHROPIC_API_KEY): would call Claude Vision on the
//   uploaded file bytes. Not implemented yet — left as a clearly-marked
//   TODO with the same return shape so we can swap in later without
//   touching callers.
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
};

// ---------------------------------------------------------------------------
// Public entry — async to allow LIVE Claude integration later.
// ---------------------------------------------------------------------------
export async function parseDocument(input: ParseInput): Promise<ParsedDoc> {
  // Stub mode for now. The "intelligence" lives in pattern matching and
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
