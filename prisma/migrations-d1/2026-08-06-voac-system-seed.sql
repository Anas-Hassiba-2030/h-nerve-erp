-- System-wide demo seed: dairy pricing + agent activity across every covered sector.
--
-- Two gaps this closes:
--
--  1. DairyBatch.pricePerLiter was NULL on all 24 rows, so scripts/ops/voac-ceiling.ts
--     could not compute anything at all. Prices are set by PRODUCT (not per row) at
--     representative Jordanian figures.
--
--     ⚠️ These are DEMO prices on DEMO batches. The batches themselves came from the
--     seed scripts, not from Maha's actual production records — so pricing them
--     completes demo data rather than falsifying a real business record. The ceiling
--     number they produce is a DEMO number. Replace with real prices via /dairy
--     before quoting the figure to anyone.
--
--  2. Only MAHA had any agent runs, so the orchestration map showed one live branch
--     and four dormant ones. This gives each covered sector a run with a DIFFERENT
--     outcome, so the map demonstrates every state it can render:
--       ARENA  → a pending proposal      → "waiting on you"   (gold, breathing)
--       LORAN  → recent successful run    → "active"           (green)
--       AAU    → run from June            → "idle"             (grey)
--       HH     → a genuinely failed run   → "needs attention"  (red)
--     Companies with no run at all stay dormant on purpose — an honest map shows
--     coverage gaps rather than implying every company is served.
--
-- Idempotent: INSERT OR IGNORE on fixed ids; the price UPDATE is guarded on NULL.
-- Remove the agent rows with: DELETE FROM AgentRun WHERE id LIKE 'voacseed%';
--
--   npx wrangler d1 execute h-nerve-erp-db --remote --file prisma/migrations-d1/2026-08-06-voac-system-seed.sql

-- ── 1. Price the dairy batches (only the unpriced ones) ────────────────────
UPDATE "DairyBatch"
SET pricePerLiter = CASE product
      WHEN 'MILK'   THEN 0.85
      WHEN 'LABNEH' THEN 3.20
      WHEN 'YOGURT' THEN 1.40
      WHEN 'CHEESE' THEN 4.50
      WHEN 'BUTTER' THEN 6.00
      WHEN 'CREAM'  THEN 2.80
      ELSE 1.00 END,
    costPerLiter = CASE product
      WHEN 'MILK'   THEN 0.55
      WHEN 'LABNEH' THEN 2.10
      WHEN 'YOGURT' THEN 0.90
      WHEN 'CHEESE' THEN 3.00
      WHEN 'BUTTER' THEN 4.20
      WHEN 'CREAM'  THEN 1.80
      ELSE 0.65 END
WHERE pricePerLiter IS NULL;

-- ── 2. ARENA — hospitality, holds a pending proposal → "waiting on you" ────
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacseed-run-arena','hourani-hotels','cmrqqxa7q000000uwun0nxg4h','hospitality-revenue-controller','route',
   'مراجعة الإشغال والسعر لهذا الأسبوع','SUCCEEDED','1e25cf52',
   3,0,0,3600,NULL,'2026-08-05T08:00:00.000+00:00','2026-08-05T08:00:03.600+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacseed-s-arena-0','hourani-hotels','voacseed-run-arena',NULL,0,'hospitality-revenue-controller','plan',
   'مراجعة الإشغال والسعر','Topology route; skill hospitality-revenue-controller@1e25cf52.',NULL,NULL,0,0,110,NULL,'2026-08-05T08:00:00.110+00:00'),
  ('voacseed-s-arena-1','hourani-hotels','voacseed-run-arena',NULL,1,'hospitality-revenue-controller','tool',
   'pullFacts({"scope":"hotels","window":"14d"})',
   'الإشغال مرتفع بينما إيراد الغرفة المتاحة ثابت — أي أن الأسعار تُخصم على طلب قائم أصلاً.',NULL,NULL,0,0,1400,NULL,'2026-08-05T08:00:01.500+00:00'),
  ('voacseed-s-arena-2','hourani-hotels','voacseed-run-arena',NULL,2,'hospitality-revenue-controller','narrate',
   'مراجعة الإشغال والسعر',
   'ارتفاع الإشغال مع ثبات RevPAR يعني خصماً على طلب موجود. المراجعة تخصّ التسعير لا التسويق.',
   0.74,'rubric',0,0,2090,NULL,'2026-08-05T08:00:03.590+00:00');

INSERT OR IGNORE INTO "AgentProposal"
  ("id","tenantId","runId","companyId","counterpartyCompanyId","title","rationale",
   "estimatedValueJod","confidence","status","decidedById","decidedAt","decisionNote",
   "realizedValueJod","realizedAt","createdAt")
VALUES
  ('voacseed-p-arena','hourani-hotels','voacseed-run-arena','cmrqqxa7q000000uwun0nxg4h',NULL,
   'إيقاف الخصم على الليالي عالية الإشغال لمدة أسبوعين',
   'الإشغال يرتفع بينما إيراد الغرفة المتاحة ثابت — الخصم يُطبَّق على طلب قائم أصلاً بدل أن يخلق طلباً جديداً. الاقتراح مراجعة السعر لا زيادة التسويق. القرار للمدير العام، والرقم يُراجَع بعد أسبوعين.',
   6300,0.68,'PENDING',NULL,NULL,NULL,NULL,NULL,'2026-08-05T08:00:03.800+00:00');

-- ── 3. LORAN — agriculture, clean recent run, nothing pending → "active" ───
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacseed-run-loran','hourani-hotels','cmrqqxa8h000200uwi9doze9b','feed-supply-planner','chain',
   'تغطية المواد الخام ومواعيد إعادة الطلب','SUCCEEDED','f47d0a65',
   4,0,0,5200,NULL,'2026-08-05T14:00:00.000+00:00','2026-08-05T14:00:05.200+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacseed-s-loran-0','hourani-hotels','voacseed-run-loran',NULL,0,'feed-supply-planner','plan',
   'تغطية المواد الخام','Topology chain; skill feed-supply-planner@f47d0a65.',NULL,NULL,0,0,120,NULL,'2026-08-05T14:00:00.120+00:00'),
  ('voacseed-s-loran-1','hourani-hotels','voacseed-run-loran',NULL,1,'feed-supply-planner','tool',
   'pullFacts({"scope":"feed","metric":"days_of_cover"})',
   'التغطية ضمن الحدود المقبولة على جميع المواد الرئيسية؛ لا مادة تحت حد إعادة الطلب.',NULL,NULL,0,0,1600,NULL,'2026-08-05T14:00:01.720+00:00'),
  ('voacseed-s-loran-2','hourani-hotels','voacseed-run-loran',NULL,2,'feed-supply-planner','narrate',
   'تغطية المواد الخام',
   'لا شيء يستدعي قراراً هذا الأسبوع. التغطية كافية ولا مادة قاربت حد إعادة الطلب — طابور فارغ إجابة صحيحة.',
   0.81,'rubric',0,0,3480,NULL,'2026-08-05T14:00:05.200+00:00');

-- ── 4. AAU — education, ran in June, nothing since → "idle" ───────────────
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacseed-run-aau','hourani-hotels','cmrqqxa8t000300uwrzj2w48l','education-enrolment-analyst','route',
   'قمع الالتحاق للفصل القادم','SUCCEEDED','d9474d13',
   2,0,0,2600,NULL,'2026-06-10T09:00:00.000+00:00','2026-06-10T09:00:02.600+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacseed-s-aau-0','hourani-hotels','voacseed-run-aau',NULL,0,'education-enrolment-analyst','narrate',
   'قمع الالتحاق',
   'الطلبات مستقرة والتسجيل ضمن المتوقع. لا مؤشر يسبق دورة الالتحاق القادمة بما يكفي لاتخاذ قرار الآن.',
   0.66,'rubric',0,0,2600,NULL,'2026-06-10T09:00:02.600+00:00');

-- ── 5. HH — finance, a genuinely failed run → "needs attention" ───────────
-- Deliberately a real FAILED (not REFUSED/STUB): the map must distinguish
-- "the system declined correctly" from "something actually broke".
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacseed-run-hh','hourani-hotels','cmrqqxa94000400uwts8tfbdo','finance-controller','chain',
   'مراجعة الهامش المُوحَّد للمجموعة','FAILED','2f3fddc5',
   4,0,0,7400,'انتهت حلقة الأدوات دون إجابة نهائية بعد 4 جولات.',
   '2026-08-05T16:00:00.000+00:00','2026-08-05T16:00:07.400+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacseed-s-hh-0','hourani-hotels','voacseed-run-hh',NULL,0,'finance-controller','plan',
   'مراجعة الهامش المُوحَّد','Topology chain; skill finance-controller@2f3fddc5.',NULL,NULL,0,0,130,NULL,'2026-08-05T16:00:00.130+00:00'),
  ('voacseed-s-hh-1','hourani-hotels','voacseed-run-hh',NULL,1,'finance-controller','tool',
   'pullFacts({"scope":"consolidated","period":"Q3"})',
   'الفترة غير مقفلة، وبعض قيود الاستبعاد بين الشركات غير مرحّلة.',NULL,NULL,0,0,2100,NULL,'2026-08-05T16:00:02.230+00:00'),
  ('voacseed-s-hh-2','hourani-hotels','voacseed-run-hh',NULL,2,'finance-controller','narrate',
   'مراجعة الهامش المُوحَّد','(لم تُنتَج إجابة)',NULL,NULL,0,0,5170,
   'انتهت حلقة الأدوات دون إجابة نهائية بعد 4 جولات.','2026-08-05T16:00:07.400+00:00');
