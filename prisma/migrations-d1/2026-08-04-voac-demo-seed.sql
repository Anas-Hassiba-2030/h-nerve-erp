-- VOAC demo seed for the LIVE database.
--
-- Populates /voac so the queue demonstrates a full lifecycle instead of four
-- empty panels: proposals awaiting a decision, one accepted with a realized
-- outcome, and one rejected WITH a reason.
--
-- ⚠️ THE JOD FIGURES HERE ARE ILLUSTRATIVE, NOT COMPUTED FROM THIS DATABASE.
-- Production DairyBatch rows have pricePerLiter = NULL (24 of 24), so the
-- ceiling calculation genuinely cannot run yet. Inventing prices on real
-- business records to make it compute would be worse than leaving it, so the
-- numbers below are demo content — treat them as a shape, not a finding. Once
-- real prices are entered, scripts/ops/voac-ceiling.ts produces the true number.
--
-- Everything else is real: real company ids, real user ids, real tenant slug.
--
-- Idempotent via INSERT OR IGNORE on fixed ids — safe to re-run.
-- Remove with:  DELETE FROM AgentRun WHERE id LIKE 'voacdemo%';
--               (AgentStep/AgentProposal cascade on runId.)
--
--   npx wrangler d1 execute h-nerve-erp-db --remote --file prisma/migrations-d1/2026-08-04-voac-demo-seed.sql

-- Roster for Maha, so the dairy company has a live VOAC configuration.
INSERT OR IGNORE INTO "VoacRoster"
  ("id","tenantId","companyId","roleIds","dailyProposalCap","cadenceHours","enabled","createdAt","updatedAt")
VALUES
  ('voacdemo-roster-maha','hourani-hotels','cmrqqxa86000100uwk9sbqnl7','dairy-yield-controller',5,24,1,
   '2026-08-04T09:00:00.000+00:00','2026-08-04T09:00:00.000+00:00');

-- ── Run 1 — the dairy weekly review (current, has pending proposals) ────────
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacdemo-run-dairy','hourani-hotels','cmrqqxa86000100uwk9sbqnl7','dairy-yield-controller','route',
   'المراجعة الأسبوعية — القيمة القابلة للاسترداد ومؤشر الإنتاج الزائد','SUCCEEDED','13de0264',
   4,0,0,4300,NULL,'2026-08-04T09:05:00.000+00:00','2026-08-04T09:05:04.300+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacdemo-s1','hourani-hotels','voacdemo-run-dairy',NULL,0,'dairy-yield-controller','plan',
   'المراجعة الأسبوعية','Topology route; skill dairy-yield-controller@13de0264.',NULL,NULL,0,0,120,NULL,'2026-08-04T09:05:00.100+00:00'),
  ('voacdemo-s2','hourani-hotels','voacdemo-run-dairy',NULL,1,'dairy-yield-controller','tool',
   'pullFacts({"scope":"dairy","window":"30d"})',
   '24 دفعة ضمن النافذة. تركّز الفاقد في صنفي الحليب والزبادي، مع خط مبيعات ثابت.',NULL,NULL,0,0,900,NULL,'2026-08-04T09:05:01.000+00:00'),
  ('voacdemo-s3','hourani-hotels','voacdemo-run-dairy',NULL,2,'dairy-yield-controller','tool',
   'causalSubgraph({"topic":"shrink"})',
   'الإنتاج الزائد المتكرر يسبق الفاقد — الإشارة في التخطيط لا في التوزيع.',NULL,NULL,0,0,1100,NULL,'2026-08-04T09:05:02.100+00:00'),
  ('voacdemo-s4','hourani-hotels','voacdemo-run-dairy',NULL,3,'dairy-yield-controller','narrate',
   'المراجعة الأسبوعية',
   'الخسارة تنشأ قبل التوزيع، في حجم الإنتاج نفسه. المستردّ من الدفعات القريبة من انتهاء الصلاحية أصغر بكثير من المشطوب فعلياً — الأولوية خفض الإنتاج لا إعادة توجيه ما أُنتج.',
   0.78,'rubric',0,0,2180,NULL,'2026-08-04T09:05:04.280+00:00');

INSERT OR IGNORE INTO "AgentProposal"
  ("id","tenantId","runId","companyId","counterpartyCompanyId","title","rationale",
   "estimatedValueJod","confidence","status","decidedById","decidedAt","decisionNote",
   "realizedValueJod","realizedAt","createdAt")
VALUES
  ('voacdemo-p1','hourani-hotels','voacdemo-run-dairy','cmrqqxa86000100uwk9sbqnl7',NULL,
   'خفض إنتاج الحليب والزبادي بنسبة 12٪ لمدة أسبوعين',
   'الفاقد يتكوّن قبل التوزيع: المشطوب أكبر بأضعاف من القيمة القابلة للاسترداد من الدفعات القريبة من انتهاء الصلاحية. خفض مؤقت على الصنفين الأكثر هدراً يعالج المصدر بدل الأثر، ويُراجَع بعد أسبوعين مقابل خط المبيعات. (رقم توضيحي — يُحتسب فعلياً بعد إدخال أسعار اللتر.)',
   9800,0.82,'PENDING',NULL,NULL,NULL,NULL,NULL,'2026-08-04T09:05:04.500+00:00'),
  ('voacdemo-p2','hourani-hotels','voacdemo-run-dairy','cmrqqxa86000100uwk9sbqnl7',NULL,
   'مراجعة إعدادات التبريد في خط الزبادي',
   'قراءات سلسلة التبريد وفاقد الإنتاجية يتحركان معاً على خط الزبادي. المؤشر واضح، أما السبب فيحتاج فحصاً هندسياً — لا يُقترح هنا تشخيص للعطل، ولا تُقدَّر قيمة لأن الأثر غير معروف قبل الفحص.',
   NULL,0.35,'PENDING',NULL,NULL,NULL,NULL,NULL,'2026-08-04T09:05:04.600+00:00');

-- ── Run 2 — the Group Broker, cross-company (companyId NULL) ────────────────
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacdemo-run-broker','hourani-hotels',NULL,'group-broker','parallel',
   'القيمة الواقعة بين شركة الألبان والفنادق','SUCCEEDED','b113a296',
   6,0,0,9100,NULL,'2026-08-04T10:15:00.000+00:00','2026-08-04T10:15:09.100+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacdemo-s5','hourani-hotels','voacdemo-run-broker',NULL,0,'group-broker','debate',
   'القيمة الواقعة بين شركة الألبان والفنادق',
   'التوريد الداخلي ممكن، لكن دورة الشراء الأسبوعية للفنادق أطول من نافذة الصلاحية المتبقية — القيمة الملتقطة جزء صغير من السقف النظري.',
   NULL,'self',0,0,4200,NULL,'2026-08-04T10:15:04.200+00:00'),
  ('voacdemo-s6','hourani-hotels','voacdemo-run-broker',NULL,1,'group-broker','verify',
   'التحقق من القيود',
   'فنادق أرينا في بلغاريا خارج النطاق: منتج طازج أردني لا يصلها ضمن مدة الصلاحية. النطاق القابل للمعالجة أصغر مما يوحي به الهيكل.',
   NULL,'self',0,0,2600,NULL,'2026-08-04T10:15:06.800+00:00');

INSERT OR IGNORE INTO "AgentProposal"
  ("id","tenantId","runId","companyId","counterpartyCompanyId","title","rationale",
   "estimatedValueJod","confidence","status","decidedById","decidedAt","decisionNote",
   "realizedValueJod","realizedAt","createdAt")
VALUES
  ('voacdemo-p3','hourani-hotels','voacdemo-run-broker','cmrqqxa86000100uwk9sbqnl7','ARENA',
   'اعتماد قاعدة تسعير تحويلي بين المها والفنادق قبل أي توريد داخلي',
   'التوريد الداخلي يخصم من هامش المها ويوفّر على الفنادق — أي أن مدير الشركة الأولى محقّ في رفضه ما لم توجد قاعدة تسعير معتمدة تحدد الأساس ومن يتحمّل الفرق. المقترح هنا هو القاعدة نفسها، لا الصفقة. قرار المدير المالي للمجموعة.',
   2400,0.55,'PENDING',NULL,NULL,NULL,NULL,NULL,'2026-08-04T10:15:09.200+00:00');

-- ── Run 3 — an earlier review, already decided (shows the full lifecycle) ───
INSERT OR IGNORE INTO "AgentRun"
  ("id","tenantId","companyId","roleId","topology","objective","status","skillVersion",
   "llmCalls","tokensIn","tokensOut","latencyMs","error","createdAt","endedAt")
VALUES
  ('voacdemo-run-prior','hourani-hotels','cmrqqxa86000100uwk9sbqnl7','dairy-yield-controller','route',
   'مراجعة الفترة السابقة','SUCCEEDED','13de0264',
   2,0,0,2400,NULL,'2026-06-25T09:00:00.000+00:00','2026-06-25T09:00:02.400+00:00');

INSERT OR IGNORE INTO "AgentStep"
  ("id","tenantId","runId","parentStepId","seq","roleId","kind","input","output","score","scoredBy",
   "tokensIn","tokensOut","latencyMs","error","createdAt")
VALUES
  ('voacdemo-s7','hourani-hotels','voacdemo-run-prior',NULL,0,'dairy-yield-controller','narrate',
   'مراجعة الفترة السابقة',
   'دفعة لبنة قاربت الصلاحية والنافذة تكفي دورة التوزيع؛ ومقترح ثانٍ يمسّ سلامة الغذاء ولا يجوز.',
   0.64,'rubric',0,0,2400,NULL,'2026-06-25T09:00:02.300+00:00');

INSERT OR IGNORE INTO "AgentProposal"
  ("id","tenantId","runId","companyId","counterpartyCompanyId","title","rationale",
   "estimatedValueJod","confidence","status","decidedById","decidedAt","decisionNote",
   "realizedValueJod","realizedAt","createdAt")
VALUES
  ('voacdemo-p4','hourani-hotels','voacdemo-run-prior','cmrqqxa86000100uwk9sbqnl7',NULL,
   'تحويل دفعة لبنة قاربت الصلاحية إلى التوزيع المخفَّض',
   'الهامش المستردّ أعلى من قيمة الشطب، والنافذة المتبقية تكفي دورة التوزيع.',
   1800,0.71,'ACCEPTED','cmrqqxafy000900uw4eyfew8y','2026-06-26T08:30:00.000+00:00',
   'منطقي، ونُفِّذ عبر التوزيع.',1450,'2026-07-26T08:30:00.000+00:00','2026-06-25T09:00:02.500+00:00'),
  ('voacdemo-p5','hourani-hotels','voacdemo-run-prior','cmrqqxa86000100uwk9sbqnl7',NULL,
   'تمديد فترة الصلاحية المعلنة لدفعات الحليب',
   'يقلّل الشطب المحاسبي على الورق.',
   5200,0.44,'REJECTED','cmrqqxafy000900uw4eyfew8y','2026-06-26T08:35:00.000+00:00',
   'مرفوض قطعياً — سلامة غذائية، وليست بنداً قابلاً للمفاضلة. القيمة المقدّرة هنا بلا معنى.',
   NULL,NULL,'2026-06-25T09:00:02.600+00:00');
