// lib/protocol/clauses.ts — Phase 20 (The Living Protocol).
//
// The canonical seed of the Hourani Group constitution: five governing
// clauses, Arabic-first with an English mirror. Single source of truth shared
// by the seed (prisma/seed.ts upserts these under tenantId="default") AND the
// GET /api/protocol fallback (so /protocol renders even before the migration
// is applied to a fresh DB). Pure data — no DB, no imports.

export type SeedClause = {
  key: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  orderIndex: number;
};

export const DEFAULT_PROTOCOL_CLAUSES: SeedClause[] = [
  {
    key: "procurement",
    orderIndex: 0,
    title: "سياسة المشتريات",
    titleEn: "Procurement policy",
    body:
      "تُمنح أوامر الشراء التي تتجاوز ١٠٬٠٠٠ دينار أردني بعد عرضَين تنافسيَّين على الأقل. " +
      "يحقّ للدماغ اقتراح المورّد الأنسب، لكنّ الاعتماد النهائي يبقى بيد مدير الوحدة. " +
      "تُسجَّل كل عملية شراء في دفتر الأستاذ خلال ٤٨ ساعة من الاستلام.",
    bodyEn:
      "Purchase orders above JOD 10,000 require at least two competitive quotes. " +
      "The brain may recommend the best-fit supplier, but final approval stays with the unit manager. " +
      "Every purchase is posted to the ledger within 48 hours of receipt.",
  },
  {
    key: "hospitality",
    orderIndex: 1,
    title: "معايير الضيافة",
    titleEn: "Hospitality standards",
    body:
      "يُحافَظ على نسبة إشغال مستهدفة لا تقل عن ٦٥٪ عبر التسعير الديناميكي الموجَّه بالطلب. " +
      "تُعالَج كل شكوى نزيل خلال ٢٤ ساعة، وتُرفع الحالات الحرجة إلى مدير الفندق فوراً. " +
      "لا يُخفَّض سعر الغرفة دون السعر الأساس إلا بموافقة موثَّقة.",
    bodyEn:
      "A target occupancy of at least 65% is maintained via demand-driven dynamic pricing. " +
      "Every guest complaint is handled within 24 hours; critical cases escalate to the hotel manager at once. " +
      "Room rates are never cut below the baseline ADR without a documented approval.",
  },
  {
    key: "data-governance",
    orderIndex: 2,
    title: "حوكمة البيانات",
    titleEn: "Data governance",
    body:
      "بيانات كل وحدة معزولة عن غيرها؛ لا تتسرّب أرقام مستأجر إلى لوحة مستأجر آخر. " +
      "لا يكتب الدماغ في بيانات التشغيل مباشرةً — يقترح فقط، والقرار يُعتمد عبر إجراء موثَّق. " +
      "تُحفظ سجلات التدقيق كاملةً ويمكن استرجاع أثر أي توصية في أي وقت.",
    bodyEn:
      "Each unit's data is isolated; one tenant's numbers never leak into another's dashboard. " +
      "The brain never writes operational data directly — it only proposes; decisions commit through a documented action. " +
      "Full audit logs are retained and any recommendation's trace is retrievable at any time.",
  },
  {
    key: "supplier",
    orderIndex: 3,
    title: "معايير اختيار المورّدين",
    titleEn: "Supplier criteria",
    body:
      "يُقيَّم المورّدون على الجودة والالتزام بالمواعيد والسعر والاستدامة وفق وزن معلَن. " +
      "يجب أن يجتاز كل مورّد جديد فترة تجريبية بثلاث شحنات قبل اعتماده مورّداً دائماً. " +
      "يُراجَع أداء المورّدين كل ربع سنة، وتُستبعَد التوريدات التي تقل عن عتبة الجودة.",
    bodyEn:
      "Suppliers are scored on quality, on-time delivery, price, and sustainability with a published weighting. " +
      "Every new supplier must clear a three-shipment trial before becoming a standing vendor. " +
      "Supplier performance is reviewed quarterly; deliveries below the quality threshold are dropped.",
  },
  {
    key: "crisis",
    orderIndex: 4,
    title: "الاستجابة للأزمات",
    titleEn: "Crisis response",
    body:
      "عند أي حدث حرج (سحب دفعة، عطل سلسلة تبريد، اختراق بيانات) يُعقد مجلس النقاش خلال ساعة. " +
      "يُعيَّن مالك واحد للأزمة، وتُوثَّق كل خطوة في خطة استجابة قابلة للتراجع. " +
      "يُبلَّغ أصحاب العلاقة بصدقٍ وسرعة، ويُجرى تحليل لاحق للأسباب الجذرية خلال أسبوع.",
    bodyEn:
      "On any critical event (a batch recall, a cold-chain failure, a data breach) the council convenes within one hour. " +
      "A single crisis owner is named and every step is recorded in a reversible response plan. " +
      "Stakeholders are informed honestly and quickly, and a root-cause post-mortem follows within a week.",
  },
];
