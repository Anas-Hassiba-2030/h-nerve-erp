// Roadmap — ported to the daylight "info" reference (docs/design/system/
// sections/info.html + info-ops.js roadmap tab): .sec-head header + a
// 3-column grid of .panel cards (Now / Next / Later), each with a
// .panel-title and priority rows recoloured to the ivory daylight register.

import { DaylightShell } from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n/i18n.server";
import { ROADMAP, type RoadmapStatus } from "@/lib/utils/roadmapData";
import "../daylight.css";
import "./info.css";

const COLUMN_META: Record<
  RoadmapStatus,
  { ar: string; en: string; captionAr: string; captionEn: string }
> = {
  now: {
    ar: "الآن",
    en: "Now",
    captionAr: "قيد التنفيذ — يصل خلال هذا الإصدار",
    captionEn: "Building — landing in the current release",
  },
  next: {
    ar: "التالي",
    en: "Next",
    captionAr: "ربع قادم — مخطط ومحجوز",
    captionEn: "Next quarter — scoped and committed",
  },
  later: {
    ar: "لاحقاً",
    en: "Later",
    captionAr: "أفق بعيد — على رادار المنتج",
    captionEn: "Long horizon — on the product radar",
  },
};

const STATUS_ORDER: RoadmapStatus[] = ["now", "next", "later"];

export default async function RoadmapPage() {
  const ar = (await getLocale()) === "ar";

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · خارطة الطريق" : "System · Roadmap"}
            </div>
            <h1 className="sec-title">
              {ar ? "خارطة الطريق" : "Roadmap"}
            </h1>
            <p className="sec-sub">
              {ar
                ? "ما يصل الآن، ما بعده، وما يلوح في الأفق البعيد لـ H‑Nerve."
                : "What's shipping now, what's queued next, and what's on the long horizon for H‑Nerve."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          {STATUS_ORDER.map((s) => {
            const meta = COLUMN_META[s];
            const items = ROADMAP.filter((r) => r.status === s);
            return (
              <div className="panel" style={{ margin: 0 }} key={s}>
                <div className="panel-head">
                  <span className="panel-title" style={{ fontSize: 18 }}>
                    {ar ? meta.ar : meta.en}
                  </span>
                  <span className="panel-aside">
                    {ar ? meta.captionAr : meta.captionEn}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div
                    style={{
                      padding: "9px 0",
                      fontSize: 13,
                      color: "var(--ink-muted)",
                    }}
                  >
                    {ar ? "لا توجد بنود في هذا العمود." : "Nothing here yet."}
                  </div>
                ) : (
                  items.map((it) => (
                    <div
                      className="ws-pri"
                      key={it.id}
                      style={{
                        display: "flex",
                        gap: 9,
                        padding: "9px 0",
                        borderBottom: "1px solid var(--line)",
                        fontSize: 13,
                        color: "var(--ink)",
                      }}
                    >
                      <span style={{ color: "var(--gold)" }}>◆</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {ar ? it.titleAr : it.titleEn}
                          </span>
                          {it.eta ? (
                            <span className="ops-tag info">{it.eta}</span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--ink-muted)",
                            marginTop: 3,
                          }}
                        >
                          {ar ? it.areaAr : it.areaEn} ·{" "}
                          {ar ? it.descAr : it.descEn}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DaylightShell>
  );
}
