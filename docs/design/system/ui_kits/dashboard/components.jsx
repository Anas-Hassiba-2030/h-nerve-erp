/* H-Nerve dashboard kit — shared chrome components.
   Exports Icon, Sidebar, PageHeader to window. */

function Icon({ name, style, cls }) {
  // lucide.createIcons() (called from App effect) swaps these <i> for <svg>.
  return <i data-lucide={name} className={cls} style={style}></i>;
}

const SB_GROUPS = (ar) => [
  { label: ar ? "المساحة" : "Workspace", items: [
    { href: "dashboard", icon: "layout-dashboard", label: ar ? "اللوحة التنفيذية" : "Executive dashboard" },
    { href: "companies", icon: "building-2", label: ar ? "شركات المجموعة" : "Companies" },
    { href: "analytics", icon: "chart-line", label: ar ? "التحليلات" : "Analytics" },
    { href: "compare", icon: "arrow-left-right", label: ar ? "مقارنة شركتين" : "Compare" },
  ]},
  { label: ar ? "العمليات" : "Operations", items: [
    { href: "hotels", icon: "hotel", label: ar ? "أرينا للضيافة" : "Arena" },
    { href: "dairy", icon: "milk", label: ar ? "المها للألبان" : "Maha" },
    { href: "farms", icon: "sprout", label: ar ? "لوران الزراعية" : "Loran" },
    { href: "education", icon: "graduation-cap", label: "The Tank" },
  ]},
  { label: ar ? "الذكاء التشغيلي" : "Intelligence", items: [
    { href: "brain", icon: "brain", label: ar ? "مركز الدماغ" : "Brain hub", hint: "HOME" },
    { href: "insights", icon: "sparkles", label: ar ? "الإشارات" : "Insights", hint: "AI" },
    { href: "council", icon: "users", label: ar ? "المجلس" : "Council", hint: "BRAIN" },
    { href: "theater", icon: "presentation", label: ar ? "مسرح القرار" : "Decision Theater" },
  ]},
  { label: ar ? "النمو والاستثمار" : "Growth & Capital", items: [
    { href: "finance", icon: "wallet", label: ar ? "المالية" : "Finance" },
    { href: "markets", icon: "trending-up", label: ar ? "الأسواق" : "Markets" },
    { href: "sustainability", icon: "leaf", label: "ESG" },
  ]},
];

function Sidebar({ ar, collapsed, active, onNav, onToggle }) {
  const groups = SB_GROUPS(ar);
  return (
    <aside className={"sb" + (collapsed ? " collapsed" : "")}>
      <div className="sb-brand">
        <img src="../../assets/logo-hnerve.svg" width="36" height="36" alt="H-Nerve" />
        {!collapsed && (
          <div className="sb-brand-txt">
            <div className="sb-brand-name">H‑Nerve <span className="erp">ERP</span></div>
            <div className="sb-brand-sub"><span className="nerve-dot"></span>{ar ? "مجموعة الحوراني" : "Hourani Group"}</div>
          </div>
        )}
      </div>

      <nav className="sb-nav">
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="sb-group-label"><span className="ln"></span>{g.label}<span className="ln"></span></div>
            {collapsed && gi > 0 && <div className="sb-divider"></div>}
            {g.items.map((it) => (
              <a key={it.href} className={"sb-link" + (active === it.href ? " active" : "")}
                 onClick={() => onNav(it.href)} title={collapsed ? it.label : undefined}>
                {active === it.href && <span className="rail"></span>}
                <Icon name={it.icon} />
                <span className="lbl">{it.label}</span>
                {it.hint && <span className="hint">{it.hint}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-status">
        <Icon name="activity" />
        <span className="txt">{ar ? "النظام العصبي نشط" : "Nerve system live"}</span>
        <span className="ver">v1.1</span>
      </div>

      <div className="sb-user">
        <div className="sb-user-card">
          <div className="rank-piece">♞</div>
          {!collapsed && (
            <div className="sb-user-info">
              <div className="sb-user-name">{ar ? "أنس حسيبة" : "Anas Hasiba"}</div>
              <div className="sb-user-meta"><span>{ar ? "فارس" : "Knight"}</span><span>·</span><span className="mono">920 XP</span><span>·</span><span className="gold">+12%</span></div>
            </div>
          )}
        </div>
      </div>

      <button className="sb-toggle" onClick={onToggle}>
        <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
        {!collapsed && (<><span>{ar ? "تصغير القائمة" : "Collapse"}</span><kbd>⌘B</kbd></>)}
      </button>
    </aside>
  );
}

function PageHeader({ ar, locale, onLocale }) {
  return (
    <header className="ph">
      <div className="ph-stripe"></div>
      <div className="ph-row">
        <div>
          <div className="ph-eyebrow"><span className="tick"></span>{ar ? "نبض المجموعة" : "Group pulse"}</div>
          <div className="ph-title">{ar ? "اللوحة التنفيذية" : "Executive dashboard"}</div>
          <div className="ph-sub">{ar ? "النبض الكامل لمجموعة الحوراني عبر كل الوحدات." : "Full pulse of Hourani Group across every business unit."}</div>
        </div>
        <div className="ph-tools">
          <a className="ph-orbit" href="../../orrery.html" title={ar ? "العودة إلى المدار" : "Back to orbit"}><Icon name="orbit" />{ar ? "المدار" : "Orbit"}</a>
          <span className="ph-sep"></span>
          <button className="ph-icon" title={ar ? "بحث" : "Search"}><Icon name="search" /></button>
          <button className="ph-icon" title={ar ? "تنبيهات" : "Notifications"}><Icon name="bell" /><span className="badge-dot">5</span></button>
          <span className="ph-sep"></span>
          <button className="locale-btn" onClick={onLocale} title="Language"><Icon name="globe" />{locale === "ar" ? "EN" : "ع"}</button>
          <button className="theme-btn" title="Theme"><Icon name="sun" /></button>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Icon, Sidebar, PageHeader });
