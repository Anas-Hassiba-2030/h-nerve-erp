/* H-Nerve Decision Theater — fullscreen editorial magazine spread. */
const { useState, useEffect } = React;
function Ic({ name, style }) { return <i data-lucide={name} style={style}></i>; }

const QUESTION = {
  en: "Should we ramp Maha cheese production for Q3 to capture the Arena conference uplift?",
  ar: "هل نضاعف إنتاج جبن المها للربع الثالث لاستغلال الطلب المتوقع من مؤتمرات أرينا؟",
};

const SPREADS = (ar) => [
  {
    sec: ar ? "المشهد" : "The scene", num: "I",
    headline: ar ? "الوضع" : "The situation", latin: !ar,
    dropcap: ar ? "م" : "A",
    prose: ar
      ? "رينا يلوح في الأفق، وإدارة الإنتاج تدرس مضاعفة إنتاج جبن المها في الربع الثالث لاستغلال الطلب المتوقع. الأرقام الأخيرة تدعم الثقة: حقّقت العمليات إيرادات <b>137,465 دولاراً</b> خلال الثلاثين يوماً الماضية بكلفة <b>39,822 دولاراً</b>، ما يعني هامش ربح بلغ <b>71٪</b>. لكن التوسّع يصطدم بواقع تشغيلي حرج: خمس وحدات من الألبان تنتهي صلاحيتها خلال ثلاثة أيام، ومزرعة واحدة ترسل إشعارات تحذيرية."
      : "rena is booming, and operations is studying doubling Maha cheese production in Q3 to capture the expected uplift. The recent figures support confidence: operations posted <b>JOD 137,465</b> in revenue over the last 30 days at a cost of <b>JOD 39,822</b> — a margin of <b>71%</b>. But the expansion meets a hard operational reality: five dairy units expire within three days, and one farm is sending warning signals.",
    rail: [
      { label: ar ? "إيراد ٣٠ يوم" : "Revenue 30d", value: "JOD 137,465" },
      { label: ar ? "هامش ٣٠ يوم" : "Margin 30d", value: "71.0%" },
      { label: ar ? "مزارع تنبّه" : "Alerting farms", value: "1" },
      { label: ar ? "ألبان قرب الانتهاء" : "Dairy near expiry", value: "5" },
    ],
  },
  {
    sec: ar ? "النقاش" : "The debate", num: "II",
    headline: ar ? "المجلس" : "The council", latin: !ar,
    advisors: [
      { pos: "support", posLabel: ar ? "يؤيّد" : "Support", name: ar ? "خبير الضيافة" : "Hospitality Expert",
        thesis: ar ? "مؤتمرات أرينا في الربع الثالث تاريخياً ترفع الطلب على الأجبان الفاخرة بنسبة تتجاوز الثلث." : "Arena's Q3 conferences historically lift demand for premium cheese by over a third.",
        ev: ar ? "إشغال ٧١٪ → طلب ضيافة" : "71% occupancy → catering demand" },
      { pos: "qualify", posLabel: ar ? "بتحفّظ" : "Qualify", name: ar ? "خبير الزراعة" : "Agriculture Expert",
        thesis: ar ? "العائد يتحسّن، لكن أوصي بتوسّع تدريجي مرتبط بقدرة التبريد قبل أي التزام كامل." : "Yield improves, but I recommend phased expansion tied to cold-chain capacity before any full commitment.",
        ev: ar ? "ري بالتنقيط → +18٪ عائد" : "Drip irrigation → +18% yield" },
      { pos: "oppose", posLabel: ar ? "يعارض" : "Oppose", name: ar ? "ضابط المخاطر" : "Risk Officer",
        thesis: ar ? "خمس وحدات على وشك انتهاء الصلاحية. مضاعفة الإنتاج الآن تضخّم خطر الهدر قبل معالجة المخزون الحالي." : "Five units are near expiry. Doubling output now amplifies waste risk before the current inventory is cleared.",
        ev: ar ? "14,508 لتر معرّضة" : "14,508 L at risk" },
      { pos: "support", posLabel: ar ? "يؤيّد" : "Support", name: ar ? "دماغ المالية" : "Finance Brain",
        thesis: ar ? "بهامش ٧١٪، حتى التوسّع المتحفّظ يحقّق عائداً صافياً إيجابياً ضمن الربع نفسه." : "At a 71% margin, even a conservative expansion turns net-positive within the same quarter.",
        ev: ar ? "هامش ٧١٪ → عائد موجب" : "71% margin → positive return" },
    ],
  },
  {
    sec: ar ? "المحاكاة" : "The simulation", num: "III",
    headline: ar ? "ماذا لو" : "What-if", latin: !ar,
    dropcap: ar ? "ل" : "I",
    prose: ar
      ? "و ضاعفنا الإنتاج، تتدفّق الصدمة عبر الرسم السببي: ترتفع تكلفة العلف بنسبة <b>+12٪</b>، ويزداد الضغط على التبريد، بينما يرتفع إيراد الضيافة المتوقّع بنسبة <b>+34٪</b>. صافي الأثر على هامش المجموعة: <b>+6.2 نقطة</b> — بشرط تصريف المخزون الحالي أولاً. كل دلتا محسوبة عبر معادلة واحدة: الأثر = الدلتا × الوزن × الثقة × التوهين^القفزة."
      : "f we double output, the shock propagates through the causal graph: feed cost rises <b>+12%</b>, cold-chain pressure increases, while expected hospitality revenue climbs <b>+34%</b>. Net effect on group margin: <b>+6.2 points</b> — conditional on clearing current inventory first. Every delta is computed by one formula: impact = Δ × weight × confidence × attenuation^hop.",
    rail: [
      { label: ar ? "تكلفة العلف" : "Feed cost", value: "+12%" },
      { label: ar ? "إيراد الضيافة" : "Hospitality rev", value: "+34%" },
      { label: ar ? "أثر الهامش" : "Margin impact", value: "+6.2 pt" },
      { label: ar ? "ثقة النموذج" : "Model confidence", value: "84%" },
    ],
  },
  {
    sec: ar ? "الخلاصة" : "The synthesis", num: "IV",
    headline: ar ? "التوصية" : "The recommendation", latin: !ar,
    dropcap: ar ? "أ" : "R",
    prose: ar
      ? "وصي المجلس بتوسّع <b>تدريجي ومشروط</b>: صرّف الدفعات الخمس القريبة من الانتهاء خلال 72 ساعة، ثم ارفع طاقة جبن المها بنسبة 60٪ — لا 100٪ — قبل مؤتمرات الربع الثالث. هذا يلتقط معظم الطلب المتوقّع مع احتواء خطر الهدر. القرار لك؛ الدماغ يقترح ولا يغيّر الأرقام."
      : "ecommend a <b>phased, conditional</b> expansion: clear the five near-expiry batches within 72 hours, then raise Maha cheese capacity by 60% — not 100% — ahead of the Q3 conferences. This captures most of the expected demand while containing waste risk. The decision is yours; the Brain proposes, it does not move the numbers.",
    confidence: "84%",
    confLabel: ar ? "ثقة المجلس" : "Council confidence",
    actions: [
      { kind: "secondary", icon: "calendar", label: ar ? "جدوِل لاحقاً" : "Schedule later" },
      { kind: "primary", icon: "check", label: ar ? "أقرّ الخطة" : "Approve plan" },
    ],
  },
];

function Spread({ s, active }) {
  return (
    <section className={"spread" + (active ? " active" : "")}>
      <div className="spread-inner">
        <div className="sp-eyebrow"><span className="num">{s.num}.</span> {s.sec}</div>
        <h1 className={"sp-headline" + (s.latin ? " latin" : "")}>{s.headline}</h1>
        <div className="sp-headline-rule"></div>

        {s.prose && (
          <p className={"sp-prose" + (s.latin ? " latin" : "")}>
            <span className="sp-dropcap">{s.dropcap}</span>
            <span dangerouslySetInnerHTML={{ __html: s.prose }} />
          </p>
        )}

        {s.advisors && (
          <div className="council-grid">
            {s.advisors.map((a, i) => (
              <div className={"advisor " + a.pos} key={i}>
                <div className="advisor-top">
                  <span className="advisor-name">{a.name}</span>
                  <span className="advisor-pos">{a.posLabel}</span>
                </div>
                <div className="advisor-thesis">{a.thesis}</div>
                <div className="advisor-ev"><Ic name="git-branch" style={{ width: 13, height: 13 }} />{a.ev}</div>
              </div>
            ))}
          </div>
        )}

        {s.confidence && (
          <div className="rec-confidence">
            <span className="rec-conf-val">{s.confidence}</span>
            <span className="rec-conf-label">{s.confLabel}</span>
          </div>
        )}

        {s.rail && (
          <div className="sp-rail">
            {s.rail.map((r, i) => (
              <div className="sp-rail-cell" key={i}>
                <div className="sp-rail-label">{r.label}</div>
                <div className="sp-rail-value">{r.value}</div>
              </div>
            ))}
          </div>
        )}

        {s.actions && (
          <div className="rec-actions">
            {s.actions.map((a, i) => (
              <button key={i} className={"heri-btn heri-btn-" + a.kind}><Ic name={a.icon} />{a.label}</button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function App() {
  const [locale, setLocale] = useState("en");
  const [i, setI] = useState(0);
  const ar = locale === "ar";
  const spreads = SPREADS(ar);
  const n = spreads.length;

  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = ar ? "rtl" : "ltr"; });
  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setI((p) => Math.min(p + (ar ? -1 : 1), n - 1) < 0 ? 0 : Math.min(Math.max(p + (ar ? -1 : 1), 0), n - 1));
      else if (e.key === "ArrowLeft") setI((p) => Math.min(Math.max(p + (ar ? 1 : -1), 0), n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ar, n]);

  const prev = () => setI((p) => Math.max(p - 1, 0));
  const next = () => setI((p) => Math.min(p + 1, n - 1));

  return (
    <div className="theater">
      <div className="t-bar">
        <button className="t-exit"><Ic name="x" style={{ width: 13, height: 13 }} />{ar ? "خروج · ESC" : "ESC · Exit"}</button>
        <div className="t-question">{QUESTION[ar ? "ar" : "en"]}</div>
        <div className="t-tools">
          <button className="t-locale" onClick={() => setLocale(ar ? "en" : "ar")}><Ic name="globe" />{ar ? "EN" : "ع"}</button>
          <div className="t-counter">
            <span className="sec">{spreads[i].headline}</span>
            <span>{i + 1} / {n}</span>
            <div className="t-rail"><div className="t-rail-fill" style={{ width: ((i + 1) / n * 100) + "%" }}></div></div>
          </div>
        </div>
      </div>

      <div className="t-stage">
        {spreads.map((s, idx) => <Spread key={idx} s={s} active={idx === i} />)}
        <button className="t-nav prev" onClick={ar ? next : prev} disabled={ar ? i === n - 1 : i === 0}><Ic name="chevron-left" /></button>
        <button className="t-nav next" onClick={ar ? prev : next} disabled={ar ? i === 0 : i === n - 1}><Ic name="chevron-right" /></button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
