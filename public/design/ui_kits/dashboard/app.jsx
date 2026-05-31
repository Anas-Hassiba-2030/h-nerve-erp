/* H-Nerve dashboard kit — content + App shell. */
const { useState, useEffect, useRef } = React;

// Count-up: animates the numeric part of a value string ("JOD 137,465", "71.0%")
// from 0 → target when shown. Honors reduced-motion. Re-runs on value change.
function CountUp({ value }) {
  const ref = useRef(null);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = String(value).match(/([^\d]*)([\d,]+(?:\.\d+)?)(.*)/);
    if (!m) { el.textContent = value; return; }
    const prefix = m[1], suffix = m[3];
    const raw = m[2].replace(/,/g, "");
    const dec = (raw.split(".")[1] || "").length;
    const target = parseFloat(raw);
    const fmt = (v) => prefix + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    if (reduce) { el.textContent = fmt(target); return; }
    let t0 = null; const dur = 1100;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    let raf;
    const step = (now) => {
      if (!t0) t0 = now;
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = fmt(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

const PERIODS = {
  "30d": { label: { en: "30d", ar: "٣٠ يوم" },
    kpis: { rev: "JOD 137,465", revPrev: "Prev 96,210", revDelta: "+12.4", expN: "JOD 39,822", expPrev: "Prev 44,180", expDelta: "-9.9", net: "JOD 97,643", margin: "71% margin", netDelta: "+18.2", occ: "71.0%", occHint: "497 / 700 rooms" } },
  "qtd": { label: { en: "QTD", ar: "الربع" },
    kpis: { rev: "JOD 412,900", revPrev: "Prev 380,400", revDelta: "+8.5", expN: "JOD 121,640", expPrev: "Prev 118,900", expDelta: "+2.3", net: "JOD 291,260", margin: "70% margin", netDelta: "+11.0", occ: "68.4%", occHint: "479 / 700 rooms" } },
  "ytd": { label: { en: "YTD", ar: "السنة" },
    kpis: { rev: "JOD 1.62M", revPrev: "Prev 1.41M", revDelta: "+14.9", expN: "JOD 0.49M", expPrev: "Prev 0.46M", expDelta: "+6.5", net: "JOD 1.13M", margin: "70% margin", netDelta: "+18.6", occ: "72.1%", occHint: "505 / 700 rooms" } },
};

const COMPANIES = (ar) => [
  { code: "ARENA", logo: "arena", name: ar ? "أرينا سبيس للضيافة" : "Arena Space Hospitality", rev: "JOD 88,210", spark: [30,34,32,40,44,52], opsK: ar ? "إشغال" : "Occupancy", opsV: "71%", health: "ok" },
  { code: "MAHA", logo: "maha", name: ar ? "المها للألبان" : "Maha Dairy", rev: "JOD 31,540", spark: [40,38,42,36,30,34], opsK: ar ? "إنتاج ٣٠ي" : "30d output", opsV: "14,508 L", health: "warn" },
  { code: "LORAN", logo: "loran", name: ar ? "لوران للاستثمار الزراعي" : "Loran Agricultural", rev: "JOD 17,369", spark: [10,14,18,22,26,30], opsK: ar ? "مزارع" : "Farms", opsV: "3", health: "crit" },
  { code: "AAU", logo: "aau", name: ar ? "جامعة عمّان الأهلية" : "Al-Ahliyya Amman University", rev: "JOD 55,216", spark: [44,46,42,48,52,55], opsK: ar ? "مشاريع" : "Programs", opsV: "5", health: "ok" },
  { code: "HH", logo: "hh", name: ar ? "الحوراني القابضة" : "Hourani Holding", rev: "JOD 0", spark: [20,20,20,20,20,20], opsK: ar ? "إيراد" : "Revenue", opsV: "JOD 0", health: "ok" },
];

function Sparkline({ data, up }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / rng) * 24 - 2}`).join(" ");
  const color = up ? "var(--heri-teal)" : "var(--heri-terracotta)";
  return (
    <div className="company-spark">
      <svg viewBox="0 0 100 28" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Hero({ ar, period }) {
  const k = PERIODS[period].kpis;
  const plabel = PERIODS[period].label[ar ? "ar" : "en"];
  const date = ar ? "الجمعة · ١٥ أيار ٢٠٢٦" : "FRI · 15 MAY 2026";
  const kpis = [
    { label: ar ? `إيراد ${plabel}` : `Revenue ${plabel}`, value: k.rev, hint: k.revPrev, delta: k.revDelta, up: true },
    { label: ar ? "مصاريف" : "Expenses", value: k.expN, hint: k.expPrev, delta: k.expDelta, up: k.expDelta.startsWith("-") },
    { label: ar ? "صافي" : "Net", value: k.net, hint: k.margin, delta: k.netDelta, up: true },
    { label: ar ? "إشغال أرينا" : "Arena occupancy", value: k.occ, hint: k.occHint, delta: null },
  ];
  return (
    <section className="hero section-block">
      <div className="hero-meta">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="hero-live"><span className="hero-live-dot"></span><span className="heri-eyebrow terra">{ar ? "بثّ مباشر" : "LIVE"}</span></span>
          <span className="heri-eyebrow ink">{ar ? "نبض المجموعة" : "GROUP PULSE"}</span>
        </div>
        <span className="heri-eyebrow ink">{date}</span>
      </div>
      <div className="hero-body">
        <div>
          <h1 className="hero-greeting">{ar ? "صباحُ الخير" : "Good morning"}</h1>
          <div className="hero-personal">{ar ? "يومٌ مُبارَك، أنس." : "Welcome back, Anas."}</div>
          <p className="hero-sub">{ar
            ? "٥ شركات · ٣ مزارع · ١٢ إشارة ذكاء · ٧١٪ إشغال · ذكاء الدماغ ٨٤."
            : "5 companies · 3 farms · 12 AI signals · 71% occupancy · Brain IQ 84."}</p>
        </div>
        <div className="hero-cta">
          <button className="heri-btn heri-btn-secondary"><Icon name="download" />{ar ? "تقرير المجموعة" : "Group report"}</button>
          <button className="heri-btn heri-btn-primary"><Icon name="sparkles" />{ar ? "مركز الدماغ" : "Brain hub"}</button>
        </div>
      </div>
      <div className="hero-kpis">
        {kpis.map((kp, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{kp.label}</div>
            <div className="kpi-value"><CountUp value={kp.value} /></div>
            <div className="kpi-foot">
              <span className="kpi-hint">{kp.hint}</span>
              {kp.delta && (
                <span className={"delta " + (kp.up ? "up" : "down")}><Icon name={kp.delta.startsWith("-") ? "arrow-down-right" : "arrow-up-right"} />{kp.delta}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Ticker({ ar }) {
  const items = [
    { icon: "trending-up", lbl: ar ? "إشغال أرينا" : "Arena occupancy", val: "71%", hl: true },
    { icon: "activity", lbl: ar ? "إيراد المجموعة" : "Group revenue", val: "JOD 39,590,000" },
    { icon: "git-branch", lbl: ar ? "تنبؤات نشطة" : "Live forecasts", val: "6" },
    { icon: "trending-up", lbl: ar ? "أسهم المجموعة" : "Equities", val: "+1.44%" },
    { icon: "sparkles", lbl: "ESG", val: "75.0" },
    { icon: "sparkles", lbl: ar ? "خط الأنابيب" : "Pipeline", val: "JOD 39.6M" },
  ];
  return (
    <div className="ticker section-block">
      {items.map((it, i) => (
        <span key={i} className={"ticker-item" + (it.hl ? " hl" : "")}><Icon name={it.icon} /><span className="lbl">{it.lbl}</span><span className="val">{it.val}</span></span>
      ))}
    </div>
  );
}

function CompanyStrip({ ar }) {
  const cos = COMPANIES(ar);
  return (
    <div className="company-strip stagger">
      {cos.map((c) => {
        const up = c.spark[c.spark.length - 1] >= c.spark[0];
        return (
          <div className={"company-card h-" + c.health} key={c.code}>
            <div className="company-top">
              <span className="company-code">{c.code}</span>
              <img src={`../../assets/company-${c.logo}.svg`} width="26" height="26" alt="" />
            </div>
            <div className="company-name">{c.name}</div>
            <Sparkline data={c.spark} up={up} />
            <div className="company-rev-label">{ar ? "إيراد" : "Revenue"}</div>
            <div className="company-rev">{c.rev}</div>
            <div className="company-ops"><span className="k">{c.opsK}</span><span className="v">{c.opsV}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function SectionHead({ ar, eyebrow, title, link, aside }) {
  return (
    <div className="heri-section-head">
      <div className="heri-eyebrow">{eyebrow}</div>
      <div className="heri-section-top">
        <span className="heri-section-title">{title}</span>
        {link && <span className="heri-section-link">{link}</span>}
      </div>
      {aside && <div className="heri-section-aside">{aside}</div>}
    </div>
  );
}

function FinancialPulse({ ar }) {
  const rev = [42,46,40,52,48,58,54,62,60,68,72,80];
  const exp = [18,20,16,22,19,24,21,26,23,28,26,30];
  const max = Math.max(...rev);
  return (
    <div className="section-block">
      <SectionHead ar={ar} eyebrow={ar ? "مالية" : "FINANCE"} title={ar ? "النبض المالي" : "Financial pulse"} link={ar ? "المالية" : "FINANCE →"} aside={ar ? "آخر ١٢ شهر — شهرياً" : "Last 12 months — monthly"} />
      <div className="bars">
        {rev.map((r, i) => (
          <div className="bar-col" key={i}>
            <div className="bar rev" style={{ height: (r / max * 100) + "%" }}></div>
            <div className="bar exp" style={{ height: (exp[i] / max * 100) + "%" }}></div>
          </div>
        ))}
      </div>
      <div className="bars-legend">
        <span><span className="dot" style={{ background: "var(--heri-teal)" }}></span>{ar ? "إيراد" : "Revenue"}</span>
        <span><span className="dot" style={{ background: "color-mix(in srgb, var(--heri-terracotta) 60%, transparent)" }}></span>{ar ? "مصاريف" : "Expenses"}</span>
      </div>
    </div>
  );
}

function ActivityStream({ ar }) {
  const items = [
    { icon: "sparkles", crit: false, title: ar ? "جامعة عمّان الأهلية تتصدّر المجموعة" : "Al-Ahliyya leads group margin", sub: "AAU · 100% margin", time: ar ? "١٣ يومًا" : "13d" },
    { icon: "git-branch", crit: false, title: ar ? "توقع: طماطم + خيار للمطبخ" : "Forecast: tomato + cucumber", sub: "Arena → Loran · 620 kg", time: ar ? "١٦ ساعة" : "16h" },
    { icon: "trending-up", crit: false, title: ar ? "ارتفاع إيراد المها +44.4٪" : "Maha Dairy revenue surge +44.4%", sub: "Maha · 14d", time: ar ? "١٣ يومًا" : "13d" },
    { icon: "milk", crit: false, title: ar ? "أجبان مشكَّلة لمنتجع البحر الميت" : "Cheese order — Dead Sea resort", sub: "Maha → Arena · 220 kg", time: ar ? "١٦ ساعة" : "16h" },
  ];
  return (
    <div className="section-block">
      <SectionHead ar={ar} eyebrow={ar ? "نشاط" : "ACTIVITY"} title={ar ? "تيار النشاط" : "Activity stream"} link={ar ? "الكل" : "VIEW ALL →"} aside={ar ? "إشارات · توقعات · حجوزات" : "Insights · forecasts · bookings"} />
      {items.map((it, i) => (
        <a className="feed-item" key={i}>
          <div className="ft">
            <span className={"fic" + (it.crit ? " crit" : "")}><Icon name={it.icon} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-title">{it.title}</div>
              <div className="feed-sub">{it.sub}</div>
            </div>
            <span className="feed-time">{it.time}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

function Alerts({ ar }) {
  const items = [
    { crit: true, title: ar ? "هبوط إيراد جامعة عمّان -64.4٪" : "Revenue drop at Al-Ahliyya −64.4%", sub: ar ? "إشارة حرجة" : "Critical insight" },
    { crit: true, title: ar ? "هبوط إيراد أرينا -100٪" : "Revenue drop at Arena Space −100%", sub: ar ? "إشارة حرجة" : "Critical insight" },
    { crit: false, title: ar ? "٤ دفعات ألبان قرب الانتهاء (14,508 L)" : "4 dairy batches near expiry (14,508 L)", sub: ar ? "خلال ٧٢ ساعة" : "Within 72h" },
    { crit: false, title: ar ? "الدفيئة الذكية — الجامعة" : "Smart greenhouse — University", sub: ar ? "رطوبة ٢٩٪ · حرارة ٢٦.١°" : "Moisture 29% · Temp 26.1°" },
  ];
  return (
    <div className="section-block">
      <SectionHead ar={ar} eyebrow={ar ? "تنبيه" : "ALERTS"} title={ar ? "تنبيهات الآن" : "Now"} aside={ar ? "٤ عناصر تتطلب انتباه" : "4 items need attention"} />
      {items.map((it, i) => (
        <a className="feed-item" key={i}>
          <div className="ft">
            <span className={"fic" + (it.crit ? " crit" : "")}><Icon name={it.crit ? "triangle-alert" : "clock"} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-title">{it.title}</div>
              <div className="feed-sub">{it.sub}</div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function Modules({ ar }) {
  const mods = [
    { icon: "hotel", tone: "ochre", name: ar ? "أرينا" : "Arena", sub: "700 rooms" },
    { icon: "milk", tone: "copper", name: ar ? "المها" : "Maha", sub: "14,508 L" },
    { icon: "sprout", tone: "teal", name: ar ? "لوران" : "Loran", sub: ar ? "٣ مزارع" : "3 farms" },
    { icon: "graduation-cap", tone: "ink", name: "The Tank", sub: ar ? "٥ مشاريع" : "5 programs" },
    { icon: "trending-up", tone: "terra", name: ar ? "الأسواق" : "Markets", sub: "+1.44%" },
    { icon: "leaf", tone: "teal", name: "ESG", sub: "75.0/100" },
    { icon: "flask-conical", tone: "rose", name: ar ? "الأنابيب" : "Pipeline", sub: "JOD 39.6M" },
    { icon: "trophy", tone: "ochre", name: ar ? "الإنجازات" : "Achievements", sub: "♞ Knight" },
  ];
  return (
    <div className="section-block">
      <SectionHead ar={ar} eyebrow={ar ? "وحدات" : "MODULES"} title={ar ? "الوصول السريع" : "Quick navigation"} aside={ar ? "تنقل بين وحدات المجموعة" : "Jump between business units"} />
      <div className="modules stagger">
        {mods.map((m, i) => (
          <div className={"module-tile " + m.tone} key={i}>
            <div className="module-ic"><Icon name={m.icon} style={{ strokeWidth: 1.5 }} /></div>
            <div className="module-name">{m.name}</div>
            <div className="module-sub">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [locale, setLocale] = useState("en");
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [period, setPeriod] = useState("30d");
  const ar = locale === "ar";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ar ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  // Phase 3 — button ripple on press (honors reduced-motion).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e) => {
      const btn = e.target.closest(".heri-btn, .btn");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 1.1;
      const rip = document.createElement("span");
      rip.className = "ix-ripple";
      rip.style.width = rip.style.height = size + "px";
      rip.style.left = (e.clientX - r.left) + "px";
      rip.style.top = (e.clientY - r.top) + "px";
      btn.appendChild(rip);
      setTimeout(() => rip.remove(), 560);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div className="app">
      <Sidebar ar={ar} collapsed={collapsed} active={active} onNav={setActive} onToggle={() => setCollapsed(!collapsed)} />
      <div className="main">
        <PageHeader ar={ar} locale={locale} onLocale={() => setLocale(ar ? "en" : "ar")} />
        <div className="content">
          <Hero ar={ar} period={period} />
          <div className="period-rail section-block">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="heri-eyebrow ink">{ar ? "الفترة" : "PERIOD"}</span>
              <div className="pill-group">
                {Object.keys(PERIODS).map((p) => (
                  <button key={p} className={"pill" + (period === p ? " active" : "")} onClick={() => setPeriod(p)}>{PERIODS[p].label[ar ? "ar" : "en"]}</button>
                ))}
              </div>
            </div>
            <span className="heri-eyebrow ink" style={{ fontVariantNumeric: "tabular-nums" }}>ESG · 75.0 / 100</span>
          </div>
          <Ticker ar={ar} />
          <CompanyStrip ar={ar} />
          <div className="sections">
            <FinancialPulse ar={ar} />
            <ActivityStream ar={ar} />
            <Alerts ar={ar} />
          </div>
          <Modules ar={ar} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
