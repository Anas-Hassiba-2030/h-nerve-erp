// prisma/seedDemoDocuments.ts
//
// The demo document corpus (contracts, policies, a lab report) used by the
// brain's RAG retrieval. Shared between the full seed (prisma/seed.ts) and the
// deploy-time top-up (scripts/seed/ensure-demo-docs.ts), so the data lives in
// ONE place. Each document carries an extraction headline + verbatim clauses
// (bilingual) so document retrieval and the council can cite real text.

import type { PrismaClient } from "@prisma/client";

export type DemoDocument = {
  kind: string;
  fileName: string;
  linkedTo: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  headline: string;
  headlineEn: string;
  fields: Record<string, unknown>;
  clauses: Array<{ kind: string; severity: string; quote: string; quoteEn: string; note: string; noteEn: string }>;
};

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    kind: "contract",
    fileName: "arena-deadsea-lease-2024.pdf",
    linkedTo: "ARENA",
    title: "عقد إيجار أرينا سبيس البحر الميت",
    titleEn: "Arena Space Dead Sea lease agreement",
    summary: "عقد إيجار للمساحة التجارية في أرينا البحر الميت لمدة ثلاث سنوات مع بند تجديد وشرط إشغال أدنى.",
    summaryEn: "Three-year commercial lease for the Arena Dead Sea space, with a renewal option and a minimum-occupancy clause.",
    headline: "عقد إيجار 14 صفحة — مدة 3 سنوات، تجديد تلقائي، إيجار سنوي 84,000 دينار",
    headlineEn: "14-page lease — 3-year term, auto-renewal, 84,000 JOD annual rent",
    fields: { parties: ["Hourani Group", "Dead Sea Development Co."], termMonths: 36, annualRent: 84000, currency: "JOD", renewal: true },
    clauses: [
      { kind: "renewal", severity: "medium", quote: "يُجدَّد هذا العقد تلقائياً لمدة سنة إضافية ما لم يُخطر أحد الطرفين الآخر كتابياً قبل تسعين يوماً من انتهاء المدة.", quoteEn: "This lease auto-renews for one additional year unless either party gives written notice ninety days before expiry.", note: "نافذة الإخطار 90 يوماً — يجب وضع تذكير قبل انتهاء المدة.", noteEn: "90-day notice window — set a reminder before term end." },
      { kind: "obligation", severity: "high", quote: "يلتزم المستأجر بالحفاظ على نسبة إشغال سنوية لا تقل عن 65٪ وإلا حُقّ للمؤجر إعادة التفاوض على الإيجار.", quoteEn: "Lessee shall maintain an annual occupancy of at least 65%, failing which the lessor may renegotiate the rent.", note: "شرط الإشغال الأدنى يربط العقد مباشرة بأداء الفندق التشغيلي.", noteEn: "The minimum-occupancy floor ties the lease directly to hotel operating performance." },
      { kind: "termination", severity: "high", quote: "يحق لأي من الطرفين إنهاء العقد بإشعار مدته 120 يوماً في حال الإخلال الجوهري غير المعالَج.", quoteEn: "Either party may terminate on 120 days’ notice in the event of an uncured material breach.", note: "بند الإنهاء قياسي لكنه يتطلب توثيق أي إخلال.", noteEn: "Standard termination clause, but any breach must be documented." },
    ],
  },
  {
    kind: "contract",
    fileName: "maha-dairy-supply-2024.pdf",
    linkedTo: "MAHA",
    title: "عقد توريد ألبان المها لمنافذ التجزئة",
    titleEn: "Maha dairy retail supply contract",
    summary: "عقد توريد منتجات ألبان المها (لبنة، أجبان) لمنافذ التجزئة مع شروط سلسلة التبريد وأحجام شهرية والتعامل مع قرب انتهاء الصلاحية.",
    summaryEn: "Supply of Maha dairy products (labneh, cheeses) to retail outlets, covering cold-chain terms, monthly volumes, and near-expiry handling.",
    headline: "عقد توريد — أحجام شهرية، سلسلة تبريد 2-6°م، بند استرجاع قرب انتهاء الصلاحية",
    headlineEn: "Supply contract — monthly volumes, 2–6°C cold chain, near-expiry return clause",
    fields: { supplier: "Maha Dairy", monthlyVolumeKg: 4200, coldChainC: [2, 6], currency: "JOD" },
    clauses: [
      { kind: "obligation", severity: "high", quote: "يجب نقل وتخزين جميع المنتجات ضمن نطاق حراري من 2 إلى 6 درجات مئوية طوال سلسلة التبريد.", quoteEn: "All products must be transported and stored within a 2–6°C range throughout the cold chain.", note: "أي خرق لسلسلة التبريد يُبطل ضمان الجودة.", noteEn: "Any cold-chain breach voids the quality guarantee." },
      { kind: "info", severity: "medium", quote: "تُسترجَع الدفعات التي يقل عمرها المتبقي عن خمسة أيام أو تُحوَّل إلى عروض ترويجية بموافقة الطرفين.", quoteEn: "Batches with less than five days of remaining shelf life are returned or routed to promotional offers by mutual agreement.", note: "هذا البند يدعم توصية تحويل اللبنة القريبة من الانتهاء إلى منافذ التجزئة.", noteEn: "This clause backs the recommendation to route near-expiry labneh to retail." },
      { kind: "renewal", severity: "low", quote: "تُراجَع الأحجام الشهرية والأسعار كل ربع سنة بناءً على الطلب الفعلي.", quoteEn: "Monthly volumes and pricing are reviewed quarterly based on actual demand.", note: "مراجعة ربع سنوية — فرصة لتعديل الأحجام حسب الموسم.", noteEn: "Quarterly review — a chance to adjust volumes by season." },
    ],
  },
  {
    kind: "lab_report",
    fileName: "loran-greenhouse-irrigation.pdf",
    linkedTo: "LORAN",
    title: "دليل ري دفيئات لوران ومعايرة المستشعرات",
    titleEn: "Loran greenhouse irrigation & sensor calibration manual",
    summary: "دليل تشغيلي لري دفيئات لوران الذكية: عتبات رطوبة التربة، دورات الري، ومعايرة المستشعرات.",
    summaryEn: "Operating manual for Loran’s smart greenhouses: soil-moisture thresholds, irrigation cycles, and sensor calibration.",
    headline: "دليل تشغيلي — عتبة رطوبة 30٪، دورة ري كل 12 دقيقة، معايرة أسبوعية",
    headlineEn: "Ops manual — 30% moisture threshold, 12-minute polling, weekly calibration",
    fields: { moistureThresholdPct: 30, pollMinutes: 12, greenhouses: 2 },
    clauses: [
      { kind: "info", severity: "medium", quote: "تُشغَّل دورة الري عندما تنخفض رطوبة التربة تحت 30٪ على مستشعرين متجاورين على الأقل.", quoteEn: "An irrigation cycle triggers when soil moisture drops below 30% on at least two adjacent sensors.", note: "العتبة المزدوجة تمنع الري الكاذب من مستشعر معطوب.", noteEn: "The dual-sensor threshold prevents false irrigation from a faulty sensor." },
      { kind: "obligation", severity: "low", quote: "تُعاير المستشعرات أسبوعياً مقابل قراءة مرجعية يدوية لضمان انحراف أقل من 3٪.", quoteEn: "Sensors are calibrated weekly against a manual reference reading to keep drift under 3%.", note: "المعايرة الأسبوعية شرط لموثوقية قراءات الرطوبة.", noteEn: "Weekly calibration is required for reliable moisture readings." },
    ],
  },
  {
    kind: "other",
    fileName: "employee-handbook-2024.pdf",
    linkedTo: "GROUP",
    title: "دليل الموظفين — سياسات الإجازات والرواتب",
    titleEn: "Employee handbook — leave & payroll policy",
    summary: "دليل الموارد البشرية لمجموعة الحوراني: سياسة الإجازات، جدول الرواتب، ومراجعات الأداء.",
    summaryEn: "Hourani Group HR handbook: leave policy, payroll schedule, and performance reviews.",
    headline: "دليل موارد بشرية — 21 يوم إجازة سنوية، راتب نهاية الشهر، مراجعة أداء نصف سنوية",
    headlineEn: "HR handbook — 21 annual leave days, end-of-month payroll, semi-annual reviews",
    fields: { annualLeaveDays: 21, payrollDay: "month-end", reviewCadence: "semi-annual" },
    clauses: [
      { kind: "info", severity: "low", quote: "يستحق الموظف بدوام كامل 21 يوم إجازة سنوية مدفوعة، تُرحَّل منها حتى 10 أيام للسنة التالية.", quoteEn: "A full-time employee accrues 21 paid annual leave days, of which up to 10 may carry over.", note: "ترحيل الإجازات محدود بعشرة أيام.", noteEn: "Leave carry-over is capped at ten days." },
      { kind: "info", severity: "low", quote: "تُصرف الرواتب في آخر يوم عمل من كل شهر عبر التحويل البنكي.", quoteEn: "Salaries are paid on the last working day of each month by bank transfer.", note: "موعد الرواتب ثابت — نهاية الشهر.", noteEn: "Fixed payroll date — month-end." },
    ],
  },
];

/**
 * Insert the demo document corpus (documents + extraction + clauses).
 * Caller decides WHEN to run it (the full seed always; the deploy top-up only
 * when the Document table is empty). `uploaderId` is the uploading user's id
 * (nullable — falls back to no uploader).
 */
export async function seedDemoDocuments(
  prisma: PrismaClient,
  uploaderId: string | null,
): Promise<number> {
  const now = Date.now();
  for (let di = 0; di < DEMO_DOCUMENTS.length; di++) {
    const d = DEMO_DOCUMENTS[di];
    await prisma.document.create({
      data: {
        scope: "default",
        kind: d.kind,
        fileName: d.fileName,
        fileSize: 120000 + di * 4096,
        mimeType: "application/pdf",
        title: d.title,
        titleEn: d.titleEn,
        summary: d.summary,
        summaryEn: d.summaryEn,
        status: "READY",
        linkedTo: d.linkedTo,
        parsedMs: 800 + di * 120,
        uploadedById: uploaderId,
        createdAt: new Date(now - (di + 2) * 3 * 24 * 60 * 60 * 1000),
        extraction: {
          create: {
            fieldsJson: JSON.stringify(d.fields),
            headline: d.headline,
            headlineEn: d.headlineEn,
          },
        },
        clauses: {
          create: d.clauses.map((c, ci) => ({
            kind: c.kind,
            severity: c.severity,
            quote: c.quote,
            quoteEn: c.quoteEn,
            note: c.note,
            noteEn: c.noteEn,
            orderIndex: ci,
            page: ci + 1,
          })),
        },
      },
    });
  }
  return DEMO_DOCUMENTS.length;
}
