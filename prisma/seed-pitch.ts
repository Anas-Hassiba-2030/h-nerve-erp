/**
 * prisma/seed-pitch.ts — the PITCH gap-filler.
 *
 * seed.ts seeds the executive/operator data and seed-demo.ts seeds the ERP
 * back-office. A handful of surfaces had no data either way and rendered
 * empty (Alerts, Brain insights, Documents, Messages/Inbox, the weekly
 * Digest, Workflows). This seed fills exactly those gaps with calculated,
 * believable content so NO section of the system looks dead during a demo.
 *
 * Idempotent: every section checks if it already has rows and skips, so it
 * is safe to re-run and safe to run after seed.ts + seed-demo.ts.
 *
 *   DATABASE_URL=... npx tsx prisma/seed-pitch.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANTS = ["hourani-hotels", "maha-dairy", "loran-agri", "tank-incubator"];
const at = (daysAgo: number, hour = 10) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

async function main() {
  console.log("• Pitch gap-filler — seeding the surfaces seed.ts/seed-demo.ts leave empty …\n");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const companies = await prisma.company.findMany();
  if (users.length === 0) {
    console.log("  ! No users found. Run `npm run db:seed` first.");
    return;
  }

  // Wipe the gap tables this seed owns (FK-safe: children first) so re-runs
  // are deterministic. seed.ts's user-wipe can cascade-delete messages while
  // leaving threads, which would otherwise leave these surfaces inconsistent.
  await prisma.workflowEdge.deleteMany();
  await prisma.workflowNode.deleteMany();
  await prisma.workflowRun.deleteMany().catch(() => {});
  await prisma.workflow.deleteMany();
  await prisma.message.deleteMany();
  await prisma.threadParticipant.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.document.deleteMany();
  await prisma.brainInsight.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.digest.deleteMany();
  const admin = users.find((u) => u.role === "ADMIN") ?? users[0];
  const byCode = (c: string) => companies.find((x) => x.code === c);

  // ── Alert rules ────────────────────────────────────────────────────────
  if ((await prisma.alertRule.count()) === 0) {
    const arena = byCode("ARENA") ?? byCode("HOTELS");
    const maha = byCode("MAHA");
    const loran = byCode("LORAN");
    // kind MUST be a canonical ALERT_KINDS key (lib/alertEngine.ts) — the page
    // looks up the def by kind and renders nothing for unknown kinds. threshold
    // stays within each kind's [thresholdMin, thresholdMax].
    const rules = [
      { kind: "OCCUPANCY_LOW", name: "إشغال منخفض", nameEn: "Low occupancy", severity: "WARN", threshold: 35, scopeCompanyId: arena?.id ?? null },
      { kind: "EXPIRY_SOON", name: "ألبان قرب انتهاء الصلاحية", nameEn: "Dairy expiring soon", severity: "CRITICAL", threshold: 72, scopeCompanyId: maha?.id ?? null },
      { kind: "FARM_CRITICAL", name: "تنبيه مزرعة حرج", nameEn: "Farm critical", severity: "CRITICAL", threshold: 1, scopeCompanyId: loran?.id ?? null },
      { kind: "REVENUE_DROP", name: "هبوط الإيراد", nameEn: "Revenue drop", severity: "WARN", threshold: 20, scopeCompanyId: null },
      { kind: "ESG_GAP", name: "فجوة الاستدامة", nameEn: "ESG gap", severity: "INFO", threshold: 10, scopeCompanyId: null },
      { kind: "STALE_FORECAST", name: "توقعات قديمة", nameEn: "Stale forecasts", severity: "INFO", threshold: 7, scopeCompanyId: null },
      { kind: "MARGIN_TOP", name: "فرصة هامش ربح", nameEn: "Top margin opportunity", severity: "OPPORTUNITY", threshold: 40, scopeCompanyId: null },
    ];
    for (const r of rules) {
      await prisma.alertRule.create({
        data: {
          ...r,
          isActive: true,
          cooldownHours: 24,
          triggerCount: Math.floor(Math.random() * 6),
          lastTriggered: Math.random() < 0.6 ? at(Math.floor(Math.random() * 12)) : null,
          createdById: admin.id,
        },
      });
    }
    console.log(`  ✓ ${rules.length} alert rules`);
  }

  // ── Brain insights ─────────────────────────────────────────────────────
  if ((await prisma.brainInsight.count()) === 0) {
    const rows = [
      { tenantId: "hourani-hotels", type: "REORDER_RECOMMENDATION", severity: "WARNING", title: "إعادة طلب مستلزمات الحمامات", body: "معدّل الاستهلاك في أرينا عمّان يتجاوز نقطة إعادة الطلب خلال 6 أيام — يُنصح بطلب 800 وحدة." },
      { tenantId: "hourani-hotels", type: "STALE_PRODUCT", severity: "INFO", title: "صنف بطيء الحركة", body: "أدوات الضيافة الفاخرة (HOTEL-006) لم تُصرف منذ 41 يوماً — راجع التسعير أو التدوير." },
      { tenantId: "maha-dairy", type: "LOW_STOCK", severity: "CRITICAL", title: "مخزون اللبنة تحت الحد الآمن", body: "مخزون LABNEH أقل من نقطة إعادة الطلب مع 3 طلبات بيع مؤكدة هذا الأسبوع." },
      { tenantId: "maha-dairy", type: "IMPORT_ANOMALY", severity: "WARNING", title: "تباين في فاتورة مورّد", body: "سعر وحدة الأعلاف في آخر فاتورة أعلى 18٪ من المتوسط — يستحق المراجعة." },
      { tenantId: "loran-agri", type: "REORDER_RECOMMENDATION", severity: "INFO", title: "تحضير موسم الحصاد", body: "الطماطم في مزرعة الأغوار تقترب من الحصاد — احجز سعة التبريد والنقل مسبقاً." },
      { tenantId: "tank-incubator", type: "STALE_PRODUCT", severity: "INFO", title: "مادة تدريبية راكدة", body: "حزمة EDU-002 منخفضة الطلب — اعرضها ضمن باقة الفصل القادم." },
    ];
    for (const r of rows) {
      await prisma.brainInsight.create({ data: { ...r, metadata: "{}", createdAt: at(Math.floor(Math.random() * 9)) } });
    }
    console.log(`  ✓ ${rows.length} brain insights`);
  }

  // ── Documents ──────────────────────────────────────────────────────────
  if ((await prisma.document.count()) === 0) {
    const docs = [
      { kind: "invoice", fileName: "INV-كامبريدج-2026-0412.pdf", title: "فاتورة مورّد — كامبريدج بريس", titleEn: "Supplier invoice — Cambridge Press", status: "MATCHED", matchedSupplierName: "كامبريدج بريس الأردن", matchConfidence: 0.96, fileSize: 184320 },
      { kind: "invoice", fileName: "INV-أعلاف-المراعي-8841.pdf", title: "فاتورة أعلاف — المراعي", titleEn: "Feed invoice — Almarai", status: "MATCHED", matchedSupplierName: "مزارع الأعلاف الوطنية", matchConfidence: 0.91, fileSize: 220115 },
      { kind: "contract", fileName: "عقد-توريد-كارفور-2026.pdf", title: "عقد توريد سنوي — كارفور", titleEn: "Annual supply contract — Carrefour", status: "PARSED", fileSize: 512000 },
      { kind: "report", fileName: "تقرير-إشغال-أرينا-مايو.pdf", title: "تقرير إشغال أرينا — مايو", titleEn: "Arena occupancy report — May", status: "PARSED", fileSize: 98304 },
      { kind: "purchase_order", fileName: "PO-TNK-002.pdf", title: "أمر شراء — حاضنة Tank", titleEn: "Purchase order — Tank", status: "PARSING", fileSize: 64200 },
      { kind: "other", fileName: "شهادة-ايزو-22000.pdf", title: "شهادة ISO 22000 — المها", titleEn: "ISO 22000 certificate — Maha", status: "PARSED", fileSize: 156000 },
    ];
    for (const d of docs) {
      await prisma.document.create({
        data: { ...d, scope: "default", mimeType: "application/pdf", uploadedById: admin.id, parsedMs: 600 + Math.floor(Math.random() * 1800), createdAt: at(Math.floor(Math.random() * 20)) },
      });
    }
    console.log(`  ✓ ${docs.length} documents`);
  }

  // ── Message threads + messages ─────────────────────────────────────────
  if ((await prisma.messageThread.count()) === 0 && users.length >= 2) {
    const threads = [
      { title: "حملة إشغال البحر الميت — الربيع", kind: "GROUP", msgs: [
        ["خطة الحملة جاهزة للمراجعة، نستهدف رفع الإشغال إلى 75٪.", 0],
        ["ممتاز — اعتمد الميزانية التسويقية وابدأ الأسبوع القادم.", 1],
        ["تم. سأشارك النتائج الأولية بعد 10 أيام.", 0],
      ] },
      { title: "نقص مخزون اللبنة", kind: "DIRECT", msgs: [
        ["مخزون اللبنة تحت الحد الآمن مع 3 طلبات مؤكدة.", 2],
        ["أصدر أمر شراء عاجل وأبلغ خط الإنتاج برفع الدفعة القادمة.", 1],
      ] },
      { title: "مراجعة ميزانية الربع الثالث", kind: "GROUP", msgs: [
        ["المصاريف التشغيلية ضمن الحدود، لكن التسويق تجاوز 8٪.", 1],
        ["لنعد توزيع الفائض من بند الصيانة المؤجّلة.", 0],
      ] },
    ];
    for (const t of threads) {
      const thread = await prisma.messageThread.create({
        data: { title: t.title, kind: t.kind, createdById: admin.id, createdAt: at(Math.floor(Math.random() * 14)) },
      });
      const participantIds = Array.from(new Set(t.msgs.map((m) => users[(m[1] as number) % users.length].id)));
      for (const uid of participantIds) {
        await prisma.threadParticipant.create({ data: { threadId: thread.id, userId: uid, lastReadAt: at(Math.floor(Math.random() * 3)) } });
      }
      let order = t.msgs.length;
      for (const [body, who] of t.msgs) {
        await prisma.message.create({
          data: { threadId: thread.id, authorId: users[(who as number) % users.length].id, body: body as string, createdAt: at(Math.floor(Math.random() * 12) + order) },
        });
        order--;
      }
    }
    console.log(`  ✓ ${threads.length} message threads`);
  }

  // ── Weekly digests ─────────────────────────────────────────────────────
  if ((await prisma.digest.count()) === 0) {
    for (let w = 1; w <= 4; w++) {
      const weekStart = at(w * 7 + 6);
      const weekEnd = at(w * 7);
      const insightCount = 4 + Math.floor(Math.random() * 6);
      await prisma.digest.create({
        data: {
          weekStart, weekEnd, insightCount,
          summary: `أسبوع ${w}: الإشغال مستقر حول 72٪، الإيراد التشغيلي ضمن الخطة، و${insightCount} إشارة ذكاء جديدة.`,
          body: `خلال هذا الأسبوع حافظت أرينا على إشغال قوي قارب 72٪، وسجّلت المها مبيعات ألبان فوق المتوقع بنسبة 6٪. رصد الدماغ ${insightCount} إشارة — أبرزها توصية بإعادة طلب مستلزمات الضيافة وتنبيه مبكر لقرب انتهاء صلاحية دفعة لبنة. الذمم المتأخرة ضمن الحدود. التوصية: اعتماد حملة البحر الميت الربيعية ومتابعة مخزون الألبان.`,
          createdAt: weekEnd,
        },
      });
    }
    console.log(`  ✓ 4 weekly digests`);
  }

  // ── Workflows (with nodes + edges) ─────────────────────────────────────
  if ((await prisma.workflow.count()) === 0) {
    const flows = [
      { name: "إعادة طلب تلقائية عند نقص المخزون", description: "عند هبوط المخزون تحت نقطة إعادة الطلب، أنشئ مسودّة أمر شراء وأبلغ المشتريات.", enabled: true, status: "ACTIVE",
        nodes: [["trigger", "low_stock", "نقص مخزون"], ["action", "create_po", "إنشاء أمر شراء"], ["action", "notify", "إشعار المشتريات"]] },
      { name: "تنبيه قرب انتهاء صلاحية الألبان", description: "قبل 3 أيام من انتهاء الصلاحية، نبّه خط الإنتاج واقترح تخفيضاً.", enabled: true, status: "ACTIVE",
        nodes: [["trigger", "expiry_risk", "قرب الانتهاء"], ["action", "notify", "تنبيه الإنتاج"], ["action", "suggest_discount", "اقتراح خصم"]] },
      { name: "تقرير الإشغال الأسبوعي", description: "كل اثنين، جمّع إشغال الفنادق وأرسل التقرير للإدارة.", enabled: false, status: "DRAFT",
        nodes: [["trigger", "schedule", "كل اثنين"], ["action", "aggregate", "تجميع الإشغال"], ["action", "email", "إرسال التقرير"]] },
    ];
    for (const f of flows) {
      const wf = await prisma.workflow.create({
        data: { name: f.name, description: f.description, enabled: f.enabled, status: f.status, scope: "default", runCount: f.enabled ? 4 + Math.floor(Math.random() * 20) : 0, lastRunAt: f.enabled ? at(Math.floor(Math.random() * 5)) : null },
      });
      const made: string[] = [];
      let x = 80;
      for (const [kind, templateKey, label] of f.nodes) {
        const n = await prisma.workflowNode.create({
          data: { workflowId: wf.id, kind, templateKey, label, configJson: "{}", posX: x, posY: 120 },
        });
        made.push(n.id);
        x += 220;
      }
      for (let i = 0; i < made.length - 1; i++) {
        await prisma.workflowEdge.create({ data: { workflowId: wf.id, fromNodeId: made[i], toNodeId: made[i + 1] } });
      }
    }
    console.log(`  ✓ ${flows.length} workflows`);
  }

  // ── Brain: graph + memory + feedback + meta + federation ────────────
  // The brain pages are the differentiator — they MUST render with data.
  // These seeders are idempotent (clear-then-write or upsert), safe to re-run.
  const brainGraph = await prisma.brainNode.count();
  if (brainGraph === 0) {
    console.log("\n→ Seeding brain (graph + memory + feedback + meta + federation)…");
    const { seedBrainGraph } = await import("../lib/brain/seedGraph");
    const { seedMemoryLake } = await import("../lib/brain/seedMemories");
    const { seedFeedback } = await import("../lib/brain/seedFeedback");
    const { seedMetaHistory } = await import("../lib/brain/seedMetaHistory");
    const { seedFederation } = await import("../lib/brain/seedFederation");
    const g = await seedBrainGraph();
    const m = await seedMemoryLake();
    const fb = await seedFeedback();
    const mt = await seedMetaHistory();
    const fe = await seedFederation();
    console.log(`  ✓ graph ${g.nodesUpserted}/${g.edgesUpserted}, memory ${m.written}, feedback ${fb.written}, meta ${mt.iqRowsWritten} iq + ${mt.reportsWritten} reports, federation ${fe.written}`);
  } else {
    console.log(`  ✓ brain graph already has ${brainGraph} nodes — skipping brain seeds`);
  }

  // Council debates — 5 past sessions across hotels/dairy/agri/edu/IT.
  const councilCount = await prisma.councilSession.count();
  if (councilCount === 0) {
    console.log("\n→ Seeding council debates…");
    const sessions = [
      { topic: "خفض أسعار الغرف بنسبة 15% في الموسم المنخفض؟", recommendation: "خفض الأسعار بنسبة 8–10% فقط، مقترناً بحملة \"إقامتين مع وجبة\" — يُحسّن الإشغال دون تآكل ADR.", confidence: 0.78, dissent: "ضابط المخاطر يحذّر من تثبيت سعر مرجعي أقل لدى المسافرين المتكررين.", duration: 4200, voices: [
        { agentId: "hospitality-expert", labelAr: "خبير الضيافة", labelEn: "Hospitality Expert", position: "qualify", thesis: "خفض 15% يرفع الإشغال 22% لكنه يحجز الذهن على \"الفندق الرخيص\". 8–10% مع باقة تجريبية أأمن — اختبار A/B لأسبوعين، ثم وسّع للأفضل." },
        { agentId: "finance-brain", labelAr: "العقل المالي", labelEn: "Finance Brain", position: "qualify", thesis: "RevPAR الحالي 84 JOD. خفض 8% يحرّك RevPAR إلى 87 (إشغال +14%). خفض 15% يكبّس RevPAR إلى 81. الرياضيات تفضّل الخفض المعتدل." },
        { agentId: "risk-officer", labelAr: "ضابط المخاطر", labelEn: "Risk Officer", position: "oppose", thesis: "خفض السعر سهل، الرفع صعب. السعر المرجعي يلتصق في ذاكرة العملاء المتكررين 9 أشهر. مخاطرة سمعة + Booking.com." },
        { agentId: "moderator", labelAr: "المُيسِّر", labelEn: "Moderator", position: "moderate", thesis: "اتفاق ضمني: خفض معتدل 8–10% + باقة تجريبية + قياس أسبوعي. لو RevPAR لم يتحسّن خلال 14 يوماً، عُد للسعر الأصلي." },
      ]},
      { topic: "توسعة مزرعة المها بـ 60 رأس ماعز جديدة الربع القادم؟", recommendation: "نعم — توسعة بـ 40 رأس فقط (لا 60) بسبب طاقة المراعي الحالية، مع شراء خزّان حليب ثانٍ مسبقاً.", confidence: 0.84, dissent: null, duration: 3850, voices: [
        { agentId: "dairy-expert", labelAr: "خبير الألبان", labelEn: "Dairy Expert", position: "support", thesis: "الطلب على حليب الماعز ارتفع 31% YoY في عمّان. 40 رأس إضافية يرفع الإنتاج اليومي 280 لتر — متماشٍ مع طاقة التبريد بعد شراء خزّان ثانٍ." },
        { agentId: "finance-brain", labelAr: "العقل المالي", labelEn: "Finance Brain", position: "qualify", thesis: "ROI لـ 40 رأس + خزّان: 19 شهر. لـ 60 رأس بدون خزّان كافٍ: تالف الحليب يأكل 23% من الإيراد. 40 هو الرقم." },
        { agentId: "risk-officer", labelAr: "ضابط المخاطر", labelEn: "Risk Officer", position: "qualify", thesis: "بياطرة المنطقة محدودون — أضف عقد بيطرة طارئ مع \"عيادة الشمال\" قبل التوسعة. درس وباء PPR في 2019." },
        { agentId: "moderator", labelAr: "المُيسِّر", labelEn: "Moderator", position: "support", thesis: "توافق واضح. خطة: 40 رأس + خزّان 2 + عقد بيطرة. تخفيف من 60 إلى 40 يحافظ على الجودة." },
      ]},
      { topic: "زراعة الكينوا في حقل لوران الجنوبي بدل الذرة؟", recommendation: "تجربة على 12% من الحقل فقط هذا الموسم. لو نجحت، توسعة 40% في الموسم التالي.", confidence: 0.62, dissent: "خبير الزراعة قلق من ندرة سوق محلي يتقبّل سعراً عادلاً.", duration: 5100, voices: [
        { agentId: "agri-expert", labelAr: "خبير الزراعة", labelEn: "Agri Expert", position: "qualify", thesis: "الكينوا تتحمّل ملوحة الأردن الجنوبي + استهلاك مياه أقل 38% من الذرة. لكن السوق المحلي ضعيف — لا تزرع 100% بدون عقد توريد مسبق." },
        { agentId: "finance-brain", labelAr: "العقل المالي", labelEn: "Finance Brain", position: "qualify", thesis: "سعر الكينوا في عمّان: 12 JOD/kg. الذرة 0.8 JOD/kg. لكن العائد للهكتار يتقارب لأن الكينوا غلّتها أقل. لا يستحقّ الانتقال الكامل." },
        { agentId: "risk-officer", labelAr: "ضابط المخاطر", labelEn: "Risk Officer", position: "oppose", thesis: "تغيير 100% للمحصول = مخاطرة وجودية لو فشل الموسم. ابدأ بـ 12% كحقل تجريبي، احفظ 88% ذرة معروفة." },
        { agentId: "moderator", labelAr: "المُيسِّر", labelEn: "Moderator", position: "moderate", thesis: "تجربة محدودة + بحث عن مشترٍ مسبق. لو الحصاد +35% من الذرة بالقيمة وتأمنّا عقد توريد، توسّع تدريجياً." },
      ]},
      { topic: "إطلاق برنامج ذكاء اصطناعي تطبيقي في حاضنة Tank؟", recommendation: "أطلق الموسم القادم — 25 مقعد، 4 شهور، شراكة مع جهة محلية للوظائف.", confidence: 0.81, dissent: null, duration: 3200, voices: [
        { agentId: "agri-expert", labelAr: "خبير المسار التعليمي", labelEn: "Education Expert", position: "support", thesis: "الطلب: 8 من 10 من خريجي البرامج السابقة سُئلوا عن AI. السوق الأردني الناشئ يحتاج 800 وظيفة AI خلال 2026." },
        { agentId: "finance-brain", labelAr: "العقل المالي", labelEn: "Finance Brain", position: "support", thesis: "تكلفة البرنامج: 12 ألف JOD لكل دفعة. سعر المقعد: 850 JOD × 25 = 21,250. هامش 43% — صحّي." },
        { agentId: "risk-officer", labelAr: "ضابط المخاطر", labelEn: "Risk Officer", position: "qualify", thesis: "ندرة المدرّبين الجيدين في AI. وقّع عقد مع 2 مدرّب على الأقل قبل الإعلان، وإلا انتظر دفعة الخريف." },
        { agentId: "moderator", labelAr: "المُيسِّر", labelEn: "Moderator", position: "support", thesis: "إطلاق مشروط بتوقيع عقدَي مدرّب. لو لم يتوفّرا في 30 يوماً، أجّل بشهرين. ربط بشركاء توظيف يقلّل مخاطر السمعة." },
      ]},
      { topic: "استبدال نظام الحجوزات الحالي بـ Cloud PMS؟", recommendation: "نعم، لكن انتقال متدرّج: فندقَين تجريبياً 90 يوم، ثم البقية.", confidence: 0.71, dissent: "ضابط المخاطر يلفت لخطر هجرة بيانات ضائعة في فنادق غير مستعدّة.", duration: 6400, voices: [
        { agentId: "hospitality-expert", labelAr: "خبير الضيافة", labelEn: "Hospitality Expert", position: "support", thesis: "النظام الحالي عمره 9 سنوات، لا API حديث، التكامل مع Booking.com يحدث يدوياً 3 مرات يومياً. PMS سحابي يوفّر 14 ساعة عمل/أسبوع." },
        { agentId: "finance-brain", labelAr: "العقل المالي", labelEn: "Finance Brain", position: "qualify", thesis: "تكلفة الانتقال: 38,000 JOD لمرة واحدة + 1,800/شهر اشتراك. مقابل وفر 14 ساعة × 6 أشهر = استرداد في 16 شهر." },
        { agentId: "risk-officer", labelAr: "ضابط المخاطر", labelEn: "Risk Officer", position: "qualify", thesis: "هجرة 47,000 سجل ضيف عبر 4 فنادق متزامناً = كارثة محتملة. ابدأ بـ Arena + Beverly Hills (الأحدث رقمياً)، تعلّم، ثم وسّع." },
        { agentId: "moderator", labelAr: "المُيسِّر", labelEn: "Moderator", position: "moderate", thesis: "اتفاق على \"نعم متدرّج\". 90 يوم تجريبي مع فندقَين + خطة rollback. لو نجحت، البقية في 6 أشهر. لو فشلت، عُد لـ on-prem مع تجديد." },
      ]},
    ];
    const now = Date.now();
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      await prisma.councilSession.create({
        data: {
          topic: s.topic, contextRefs: "[]", recommendation: s.recommendation,
          confidence: s.confidence, dissentNote: s.dissent ?? null, status: "DONE",
          ranAt: new Date(now - (i + 1) * 4 * 24 * 60 * 60 * 1000),
          durationMs: s.duration, usedLiveLlm: false,
          voices: { create: s.voices.map((v, idx) => ({
            agentId: v.agentId, speakerLabelAr: v.labelAr, speakerLabelEn: v.labelEn,
            position: v.position, thesis: v.thesis, evidenceJson: "[]", orderIndex: idx, isStub: true,
          }))},
        },
      });
    }
    console.log(`  ✓ ${sessions.length} council debates`);
  } else {
    console.log(`  ✓ council already has ${councilCount} sessions — skipping`);
  }

  console.log("\n✓ Pitch gap-filler complete.");
}

export { main as seedPitch };

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed-pitch.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
