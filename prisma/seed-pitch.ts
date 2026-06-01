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
