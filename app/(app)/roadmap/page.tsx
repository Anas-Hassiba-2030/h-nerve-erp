import {
  Map,
  Target,
  Compass,
  Telescope,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { PageContainer } from "@/components/PageContainer";
import { getLocale } from "@/lib/i18n.server";
import { ROADMAP, type RoadmapStatus } from "@/lib/roadmapData";

const COLUMN_META: Record<
  RoadmapStatus,
  {
    ar: string;
    en: string;
    captionAr: string;
    captionEn: string;
    icon: typeof Target;
    tint: string;
  }
> = {
  now: {
    ar: "الآن",
    en: "Now",
    captionAr: "قيد التنفيذ — يصل خلال هذا الإصدار",
    captionEn: "Building — landing in the current release",
    icon: Target,
    tint: "#10b981",
  },
  next: {
    ar: "التالي",
    en: "Next",
    captionAr: "ربع قادم — مخطط ومحجوز",
    captionEn: "Next quarter — scoped and committed",
    icon: Compass,
    tint: "#f59e0b",
  },
  later: {
    ar: "لاحقاً",
    en: "Later",
    captionAr: "أفق بعيد — على رادار المنتج",
    captionEn: "Long horizon — on the product radar",
    icon: Telescope,
    tint: "#8b5cf6",
  },
};

const STATUS_ORDER: RoadmapStatus[] = ["now", "next", "later"];

export default function RoadmapPage() {
  const ar = getLocale() === "ar";

  return (
    <>
      <Topbar
        eyebrow={ar ? "النظام" : "System"}
        title={ar ? "خارطة الطريق المستقبلية" : "Roadmap"}
        subtitle={
          ar
            ? "ما يصل الآن، ما بعده، وما يلوح في الأفق البعيد لـ H‑Nerve."
            : "What's shipping now, what's queued next, and what's on the long horizon for H‑Nerve."
        }
      />
      <PageContainer width="wide">
        {/* Header strip with totals — kept en-US digits per spec */}
        <section className="grid gap-3 sm:grid-cols-3">
          {STATUS_ORDER.map((s) => {
            const meta = COLUMN_META[s];
            const items = ROADMAP.filter((r) => r.status === s);
            const Icon = meta.icon;
            return (
              <div
                key={s}
                className="card card-pad relative overflow-hidden anim-fade-up"
              >
                {/* Subtle tinted ribbon on the start side */}
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0"
                  style={{
                    insetInlineStart: 0,
                    width: 4,
                    background: `linear-gradient(180deg, ${meta.tint} 0%, color-mix(in srgb, ${meta.tint} 40%, transparent) 100%)`,
                  }}
                />
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{
                      background: `linear-gradient(135deg, ${meta.tint} 0%, color-mix(in srgb, ${meta.tint} 65%, #000) 100%)`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-base font-semibold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {ar ? meta.ar : meta.en}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {ar ? meta.captionAr : meta.captionEn}
                    </div>
                  </div>
                  <div
                    className="font-mono text-2xl font-bold"
                    style={{ color: meta.tint }}
                  >
                    {items.length}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Kanban board */}
        <section
          className="grid gap-4 lg:grid-cols-3"
          aria-label={ar ? "خارطة الطريق" : "Roadmap"}
        >
          {STATUS_ORDER.map((s, colIdx) => {
            const meta = COLUMN_META[s];
            const items = ROADMAP.filter((r) => r.status === s);
            const Icon = meta.icon;
            return (
              <section
                key={s}
                className="card overflow-hidden anim-fade-up"
                style={{ animationDelay: `${colIdx * 60}ms` }}
              >
                {/* Column header */}
                <header
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${meta.tint} 18%, var(--heri-cream)) 0%, var(--heri-cream) 100%)`,
                    borderBottom: "1px solid var(--heri-rule)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: meta.tint }}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      className="text-sm font-semibold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {ar ? meta.ar : meta.en}
                    </h2>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {ar ? meta.captionAr : meta.captionEn}
                    </p>
                  </div>
                  <span
                    className="font-mono text-[12px] font-bold"
                    style={{
                      background: "color-mix(in srgb, var(--heri-ink-3) 12%, transparent)",
                      color: "var(--heri-ink)",
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {items.length}
                  </span>
                </header>

                {/* Column body */}
                <div className="space-y-3 p-3">
                  {items.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-center text-xs"
                      style={{
                        color: "var(--heri-ink-3)",
                        background:
                          "color-mix(in srgb, var(--heri-ink-3) 6%, transparent)",
                        border: "1px dashed var(--heri-rule)",
                      }}
                    >
                      {ar ? "لا توجد بنود في هذا العمود." : "Nothing here yet."}
                    </div>
                  ) : (
                    items.map((item, i) => (
                      <article
                        key={item.id}
                        className="anim-fade-up rounded-xl p-3 transition-all"
                        style={{
                          animationDelay: `${(colIdx * 60) + i * 50}ms`,
                          background:
                            "color-mix(in srgb, var(--heri-cream) 50%, var(--heri-cream))",
                          border: "1px solid var(--heri-rule)",
                        }}
                      >
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`badge-${item.tone}`}>
                            {ar ? item.areaAr : item.areaEn}
                          </span>
                          {item.eta ? (
                            <span className="badge-slate font-mono">
                              {item.eta}
                            </span>
                          ) : null}
                        </div>

                        {/* Title */}
                        <h3
                          className="mt-2 text-sm font-semibold leading-snug"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {ar ? item.titleAr : item.titleEn}
                        </h3>

                        {/* Description */}
                        <p
                          className="mt-1 text-xs leading-relaxed"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {ar ? item.descAr : item.descEn}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </section>

        {/* Footer note linking back to changelog */}
        <div
          className="card card-pad flex flex-wrap items-center gap-3 anim-fade-up"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--heri-ochre) 6%, var(--heri-cream)) 0%, var(--heri-cream) 100%)",
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-deep) 0%, var(--heri-ochre) 100%)",
            }}
            aria-hidden
          >
            <Map className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              {ar
                ? "كل ما هنا قابل للتعديل"
                : "Everything here is up for debate"}
            </div>
            <div
              className="text-[12px]"
              style={{ color: "var(--heri-ink-3)" }}
            >
              {ar
                ? "الأولويات تتغير مع نبض المجموعة. شارك ملاحظاتك مع الإدارة لإعادة الترتيب."
                : "Priorities flex with the group's pulse. Share feedback with leadership to reshuffle."}
            </div>
          </div>
          <a href="/changelog" className="btn-secondary btn-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{ar ? "ما تم إنجازه" : "What shipped"}</span>
            <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </a>
        </div>
      </PageContainer>
    </>
  );
}
