/* H-Nerve mobile daily-brief — calm "today" screen inside an iOS frame. */
const { useState, useEffect } = React;

function Ic({ name, style }) { return <i data-lucide={name} style={style}></i>; }

const DATA = (ar) => ({
  date: ar ? "الجمعة · ١٥ أيار" : "FRI · 15 MAY",
  greeting: ar ? "أغلِق اليوم يا أنس" : "Close out today, Anas",
  narrator: ar ? "٤ بنود اليوم، ٤ منها عاجلة." : "4 things today, 4 of them urgent.",
  sections: [
    { title: ar ? "ثلاثة لتعرف" : "Three to know", hint: ar ? "ما تغيّر من تلقاء نفسه." : "What changed on its own.",
      cards: [
        { tone: "blush", eyebrow: ar ? "المالية" : "FINANCE", title: ar ? "هبوط إيراد جامعة عمّان -64.4٪" : "Revenue drop at Al-Ahliyya by 64.4%", text: ar ? "إيراد آخر ١٤ يوم: ٥٥٬٢١٦ مقابل ١٥٥٬٢٦٤." : "Revenue last 14d: JOD 55,216 vs JOD 155,264 prior.", action: ar ? "افتح" : "Open" },
        { tone: "blush", eyebrow: ar ? "المالية" : "FINANCE", title: ar ? "هبوط إيراد أرينا -100٪" : "Revenue drop at Arena Space by 100%", text: ar ? "إيراد آخر ١٤ يوم: ٠ مقابل ١٢٧٬٣٣٥." : "Revenue last 14d: JOD 0 vs JOD 127,335 prior.", action: ar ? "افتح" : "Open" },
        { tone: "blush", eyebrow: ar ? "الألبان" : "DAIRY", title: ar ? "٤ دفعات ألبان قرب الانتهاء (14,508 L)" : "4 dairy batches near expiry (14,508 L)", text: ar ? "وجد المحرك ٤ دفعات تنتهي خلال ٧٢ ساعة." : "Engine found 4 batches expiring within 72h.", action: ar ? "افتح" : "Open" },
      ]},
    { title: ar ? "ثلاثة لتقرّر" : "Three to decide", hint: ar ? "ينتظرون قرارك." : "Waiting on your call.",
      cards: [
        { tone: "ochre", eyebrow: ar ? "توصية" : "RECOMMEND", title: ar ? "ثبّت مخزون الألبان قبل نهاية الربع" : "Stabilize dairy inventory before quarter-end", text: ar ? "دفعتان على بعد ٣ أيام من الانتهاء وتمثّلان ضغطاً مباشراً على الهامش." : "Two batches are 3 days from expiry and represent direct margin pressure.", action: ar ? "راجِع وأقرّ" : "Review & approve" },
      ]},
    { title: ar ? "ثلاثة لتقرّ" : "Three to approve", hint: ar ? "بضغطة واحدة." : "One tap each.",
      cards: [] },
  ],
  empty: { title: ar ? "كل شيء هادئ هنا." : "All clear here.", text: ar ? "لا شيء يستدعي تدخّلك الآن. سنُنبّهك." : "Nothing needs you right now. We'll page you." },
  foot: ar ? "هذا كل شيء. ارجع إذا احتجت." : "That's all. Come back when you need to.",
  nav: [
    { icon: "sun", label: ar ? "اليوم" : "Today" },
    { icon: "activity", label: ar ? "النشاط" : "Activity" },
    { icon: "shield-check", label: ar ? "إقرارات" : "Approvals" },
    { icon: "user", label: ar ? "حسابي" : "Me" },
  ],
});

function Card({ c }) {
  return (
    <div className="m-card" data-tone={c.tone}>
      <span className="m-card-band"></span>
      <div className="m-card-body">
        <div className="m-card-eyebrow-row"><span className="m-card-eyebrow">{c.eyebrow}</span><span className="m-card-dot"></span></div>
        <div className="m-card-title">{c.title}</div>
        <div className="m-card-text">{c.text}</div>
        <div className="m-card-action">{c.action}<Ic name="arrow-left" /></div>
      </div>
    </div>
  );
}

function MobileScreen({ ar, tab, setTab, onToggleLocale }) {
  const d = DATA(ar);
  return (
    <div className="m-screen">
      <div className="m-pull"></div>
      <div className="m-topbar">
        <div className="m-topbar-row">
          <span className="m-date">{d.date}</span>
          <button className="m-topbar-icon" onClick={onToggleLocale} title="Language"><Ic name="sliders-horizontal" /></button>
        </div>
        <h1 className="m-greeting">{d.greeting}</h1>
      </div>
      <div className="m-narrator"><span className="m-narrator-stroke"></span>{d.narrator}</div>

      <div className="m-main">
        {d.sections.map((s, i) => (
          <section className="m-section" key={i} style={{ animationDelay: (i * 0.09) + "s" }}>
            <div className="m-section-head">
              <div className="m-section-title-row"><h2 className="m-section-title">{s.title}</h2><span className="m-section-count">{s.cards.length}</span></div>
              <p className="m-section-hint">{s.hint}</p>
            </div>
            {s.cards.length === 0 ? (
              <div className="m-card m-card-empty" data-tone="ink">
                <span className="m-card-band"></span>
                <div className="m-card-body">
                  <div className="m-card-title m-card-title-empty">{d.empty.title}</div>
                  <div className="m-card-text">{d.empty.text}</div>
                </div>
              </div>
            ) : (
              <div className="m-cards">{s.cards.map((c, j) => <Card c={c} key={j} />)}</div>
            )}
          </section>
        ))}
        <p className="m-foot">{d.foot}</p>
      </div>

      <nav className="m-nav">
        {d.nav.map((n, i) => (
          <button key={i} className={"m-nav-item" + (tab === i ? " active" : "")} onClick={() => setTab(i)}>
            <Ic name={n.icon} /><span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function App() {
  const [locale, setLocale] = useState("en");
  const [tab, setTab] = useState(0);
  const ar = locale === "ar";
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = ar ? "rtl" : "ltr"; });
  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", background: "var(--surface)" }}>
      <IOSDevice>
        <div dir={ar ? "rtl" : "ltr"} style={{ height: "100%" }}>
          <MobileScreen ar={ar} tab={tab} setTab={setTab} onToggleLocale={() => setLocale(ar ? "en" : "ar")} />
        </div>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
