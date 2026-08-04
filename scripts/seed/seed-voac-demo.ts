// scripts/seed/seed-voac-demo.ts
//
// Populates the VOAC ledger so /voac shows a real lifecycle rather than four
// empty panels: pending proposals awaiting a decision, one accepted with a
// realized outcome, and one rejected WITH a reason.
//
// The rejected-with-a-reason row matters most. It is the thing the whole design
// argues for — accept/reject alone conflates "wrong", "already knew",
// "politically impossible" and "bad timing" — and a demo that only shows
// approvals hides the point.
//
// Numbers here are derived from what scripts/ops/voac-ceiling.ts actually
// computes on this database, not invented, so the demo and the ceiling report
// tell the same story: recovery is small, prevention is large.
//
//   DATABASE_URL="file:./dev.db" \
//   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/seed-voac-demo.ts
//
// Idempotent: keyed on run objective, safe to re-run. Local dev only.

import { makePrismaClient } from "../_prisma";

const TENANT = "hourani-hotels";

async function main() {
  const prisma = makePrismaClient();

  const dairy = await prisma.company.findFirst({ where: { sector: "DAIRY" } });
  const hotel = await prisma.company.findFirst({ where: { sector: "HOSPITALITY" } });
  if (!dairy) throw new Error("No DAIRY company — seed the base data first.");

  const OBJECTIVE = "Weekly review — recoverable value and overproduction signal";

  const existing = await prisma.agentRun.findFirst({ where: { tenantId: TENANT, objective: OBJECTIVE } });
  if (existing) {
    console.log(`[voac-demo] already seeded (run ${existing.id}) — nothing to do`);
    return;
  }

  // --- A completed dairy run with a full step trace --------------------
  const run = await prisma.agentRun.create({
    data: {
      tenantId: TENANT,
      companyId: dairy.id,
      roleId: "dairy-yield-controller",
      topology: "route",
      objective: OBJECTIVE,
      status: "SUCCEEDED",
      skillVersion: "13de0264",
      llmCalls: 3,
      tokensIn: 4120,
      tokensOut: 890,
      latencyMs: 4300,
      endedAt: new Date(),
    },
  });

  const steps = [
    { seq: 0, kind: "plan", input: OBJECTIVE, output: "Topology route; skill dairy-yield-controller@13de0264." },
    { seq: 1, kind: "tool", input: 'pullFacts({"scope":"dairy","window":"30d"})', output: "24 batches. 16 past expiry (40,322 L). 2 within the 7-day window (2,900 L)." },
    { seq: 2, kind: "tool", input: 'causalSubgraph({"topic":"shrink"})', output: "Shrink concentrates in MILK and YOGURT; both show repeat overproduction against a flat sales line." },
    {
      seq: 3, kind: "narrate", input: OBJECTIVE,
      output:
        "الخسارة ليست في التوزيع بل في الإنتاج الزائد. المستردّ من الدفعات القريبة من انتهاء الصلاحية 3,711 د.أ، بينما المشطوب فعلياً 41,377 د.أ — أي أحد عشر ضعفاً. الأولوية خفض إنتاج الحليب والزبادي، لا إعادة توجيه ما أُنتج.",
      score: 0.78, scoredBy: "rubric",
    },
  ];

  for (const s of steps) {
    await prisma.agentStep.create({
      data: {
        tenantId: TENANT, runId: run.id, roleId: "dairy-yield-controller",
        seq: s.seq, kind: s.kind, input: s.input, output: s.output,
        score: s.score ?? null, scoredBy: s.scoredBy ?? null,
      },
    });
  }

  // --- Pending: the one that actually matters -------------------------
  await prisma.agentProposal.create({
    data: {
      tenantId: TENANT, runId: run.id, companyId: dairy.id,
      title: "خفض إنتاج الحليب والزبادي بنسبة 12٪ لأسبوعين",
      rationale:
        "المشطوب خلال الفترة 41,377 د.أ مقابل 3,711 د.أ فقط قابلة للاسترداد من الدفعات القريبة من انتهاء الصلاحية — نسبة أحد عشر إلى واحد. الخسارة تنشأ قبل التوزيع، في حجم الإنتاج نفسه. خفض مؤقت بنسبة 12٪ على الصنفين الأكثر هدراً يعالج المصدر بدل معالجة الأثر. يُراجَع بعد أسبوعين مقابل خط المبيعات.",
      estimatedValueJod: 9800,
    },
  });

  await prisma.agentProposal.create({
    data: {
      tenantId: TENANT, runId: run.id, companyId: dairy.id,
      title: "مراجعة إعدادات التبريد في خط الزبادي",
      rationale:
        "قراءات سلسلة التبريد وفاقد الإنتاجية يتحركان معاً على خط الزبادي. المؤشر واضح، أما السبب فيحتاج فحصاً هندسياً — لا يُقترح هنا تشخيص للعطل.",
      estimatedValueJod: null,
    },
  });

  // --- Cross-company: the Group Broker, with the constraint stated -----
  if (hotel) {
    const gbRun = await prisma.agentRun.create({
      data: {
        tenantId: TENANT, companyId: null, roleId: "group-broker", topology: "parallel",
        objective: "Value falling between the dairy and the hotels",
        status: "SUCCEEDED", skillVersion: "b113a296",
        llmCalls: 6, tokensIn: 7800, tokensOut: 1400, latencyMs: 9100, endedAt: new Date(),
      },
    });
    await prisma.agentStep.create({
      data: {
        tenantId: TENANT, runId: gbRun.id, roleId: "group-broker", seq: 0, kind: "debate",
        input: "Value falling between the dairy and the hotels",
        output: "التوريد الداخلي ممكن، لكن دورة الشراء الأسبوعية للفنادق أطول من نافذة الصلاحية المتبقية — القيمة الملتقطة جزء صغير من السقف.",
        score: 0.6, scoredBy: "self",
      },
    });
    await prisma.agentProposal.create({
      data: {
        tenantId: TENANT, runId: gbRun.id, companyId: dairy.id,
        counterpartyCompanyId: hotel.code,
        title: "اتفاق تسعير تحويلي بين المها والفنادق قبل أي توريد داخلي",
        rationale:
          "التوريد الداخلي يخصم من هامش المها ويوفّر على الفنادق — أي أن مدير الشركة الأولى محقّ في رفضه ما لم توجد قاعدة تسعير معتمدة. المقترح هنا هو القاعدة نفسها (أساس التسعير ومن يتحمّل الفرق)، لا الصفقة. قرار المدير المالي للمجموعة.",
        estimatedValueJod: 2400,
      },
    });
  }

  // --- Already decided, so the demo shows the full lifecycle -----------
  const decidedRun = await prisma.agentRun.create({
    data: {
      tenantId: TENANT, companyId: dairy.id, roleId: "dairy-yield-controller",
      topology: "route", objective: "Prior period review", status: "SUCCEEDED",
      skillVersion: "13de0264", llmCalls: 2, endedAt: new Date(Date.now() - 40 * 86400000),
      createdAt: new Date(Date.now() - 40 * 86400000),
    },
  });

  await prisma.agentProposal.create({
    data: {
      tenantId: TENANT, runId: decidedRun.id, companyId: dairy.id,
      title: "تحويل دفعة لبنة قاربت الصلاحية إلى التوزيع المخفَّض",
      rationale: "الهامش المستردّ أعلى من قيمة الشطب، والنافذة تكفي دورة التوزيع.",
      estimatedValueJod: 1800,
      status: "ACCEPTED",
      decidedAt: new Date(Date.now() - 38 * 86400000),
      decisionNote: "منطقي، ونُفِّذ عبر التوزيع.",
      realizedValueJod: 1450,
      realizedAt: new Date(Date.now() - 8 * 86400000),
    },
  });

  await prisma.agentProposal.create({
    data: {
      tenantId: TENANT, runId: decidedRun.id, companyId: dairy.id,
      title: "تمديد فترة الصلاحية المعلنة لدفعات الحليب",
      rationale: "يقلّل الشطب المحاسبي على الورق.",
      estimatedValueJod: 5200,
      status: "REJECTED",
      decidedAt: new Date(Date.now() - 37 * 86400000),
      decisionNote:
        "مرفوض قطعياً — سلامة غذائية، وليست بنداً قابلاً للمفاضلة. القيمة المقدّرة هنا بلا معنى.",
    },
  });

  const runs = await prisma.agentRun.count({ where: { tenantId: TENANT } });
  const props = await prisma.agentProposal.count({ where: { tenantId: TENANT } });
  console.log(`[voac-demo] seeded — ${runs} run(s), ${props} proposal(s) under tenant "${TENANT}"`);
  console.log(`[voac-demo] open /voac to see the queue`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("seed-voac-demo failed:", e);
    process.exit(1);
  });
