import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { buildCanvas, canvasRoles, kindLabel, ungraphedTools, type CanvasNodeKind } from "@/lib/voac/flowCanvas";
import { getRole, GROUP_BROKER_ID } from "@/lib/voac/roles";
import { topologyWhy } from "@/lib/voac/present";
import "../../daylight.css";
import "../voac.css";
import "./flow.css";

export const dynamic = "force-dynamic";

const LEGEND: CanvasNodeKind[] = ["trigger", "brake", "router", "voice", "tool", "model", "check", "human", "end"];

/**
 * The orchestration as a workflow canvas.
 *
 * Rendered entirely on the server: an SVG layer for the edges, absolutely
 * positioned divs for the nodes, and the browser's own scrolling to pan. There
 * is no canvas library and no client component — nothing here needs to react to
 * anything, and the person asking for this page opened it complaining that the
 * system felt laggy.
 *
 * THE CANVAS STAYS LEFT-TO-RIGHT IN ARABIC. SVG has no logical properties, and
 * flow diagrams read left-to-right by convention in every tool that draws them.
 * The chrome around it mirrors normally; the diagram does not, and each node's
 * text carries dir="auto" so Arabic labels still render correctly inside it.
 */
export default async function VoacFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const roleId = roleParam && getRole(roleParam) ? roleParam : GROUP_BROKER_ID;
  const role = getRole(roleId)!;
  const canvas = buildCanvas(roleId);
  const gaps = ungraphedTools(role);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={
          <Link href="/voac" className="vo-link vo-back">
            <ArrowLeft size={13} /> {L("عودة إلى الطابور", "Back to the queue")}
          </Link>
        }
        title={L("مسار التشغيل", "The workflow")}
        subtitle={L(
          "الرحلة الكاملة لطلب واحد: من أين يدخل، وأين يُرفض، وأين يتفرّع، وأين يصل إليك.",
          "One request's whole journey: where it enters, where it is refused, where it branches, and where it reaches you.",
        )}
        actions={
          <span className="vo-header-links">
            <Link href="/voac/map" className="vo-ghost-btn">{L("الخريطة", "The map")}</Link>
            <Link href="/voac/how" className="vo-ghost-btn">{L("كيف يعمل", "How it works")}</Link>
          </span>
        }
      />

      {/* Role picker — plain links, so switching costs one server render and
          no client bundle. */}
      <nav className="fc-picker" aria-label={L("اختر وكيلاً", "Pick an agent")}>
        {canvasRoles().map((r) => (
          <Link
            key={r.id}
            href={`/voac/flow?role=${r.id}`}
            className={`fc-pick${r.id === roleId ? " fc-pick-on" : ""}`}
          >
            {ar ? r.ar : r.en}
          </Link>
        ))}
      </nav>

      <div className="fc-caption">
        <h2>{ar ? role.labelAr : role.labelEn}</h2>
        <p>{ar ? role.jobAr : role.jobEn}</p>
        <p className="fc-caption-why">{topologyWhy(role.defaultTopology, ar ? "ar" : "en")}</p>
      </div>

      {/* The canvas. `dir="ltr"` is deliberate — see the note above. */}
      <div className="fc-wrap" dir="ltr">
        <div className="fc-canvas" style={{ width: canvas.width, height: canvas.height }}>
          <svg
            className="fc-edges"
            width={canvas.width}
            height={canvas.height}
            viewBox={`0 0 ${canvas.width} ${canvas.height}`}
            aria-hidden
          >
            <defs>
              <marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fc-arrow-head" />
              </marker>
              <marker id="fc-arrow-cond" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fc-arrow-head fc-arrow-cond" />
              </marker>
            </defs>
            {canvas.edges.map((e) => (
              <path
                key={e.id}
                d={e.path}
                className={`fc-edge${e.conditional ? " fc-edge-cond" : ""}`}
                markerEnd={`url(#${e.conditional ? "fc-arrow-cond" : "fc-arrow"})`}
              />
            ))}
          </svg>

          {canvas.nodes.map((n) => {
            const k = kindLabel(n.kind);
            return (
              <div
                key={n.id}
                className={`fc-node fc-node-${n.kind}`}
                style={{ left: n.x, top: n.y, width: n.w, minHeight: n.h }}
              >
                <span className="fc-node-kind">{ar ? k.ar : k.en}</span>
                <span className="fc-node-title" dir="auto">{ar ? n.titleAr : n.titleEn}</span>
                {n.noteAr ? (
                  <span className="fc-node-note" dir="auto">{ar ? n.noteAr : n.noteEn}</span>
                ) : null}
              </div>
            );
          })}

          {/* Branch labels ride above the SVG so they inherit page typography
              rather than SVG text metrics, which do not wrap. */}
          {canvas.edges
            .filter((e) => e.conditional && e.labelEn)
            .map((e) => {
              const from = canvas.nodes.find((n) => n.id === e.from)!;
              const to = canvas.nodes.find((n) => n.id === e.to)!;
              const backward = to.x < from.x;
              return (
                <span
                  key={`lbl-${e.id}`}
                  className="fc-edge-label"
                  style={{
                    left: (from.x + from.w + to.x) / 2 - 46,
                    top: backward
                      ? Math.max(from.y + from.h, to.y + to.h) + 30
                      : (from.y + to.y) / 2 + from.h / 2 - 11,
                  }}
                  dir="auto"
                >
                  {ar ? e.labelAr : e.labelEn}
                </span>
              );
            })}
        </div>
      </div>

      <p className="fc-hint">
        {L(
          "اسحب أفقياً لرؤية بقية المسار. الخطوط المتقطّعة تفرّعات مشروطة — تُقرأ من نصّها.",
          "Scroll sideways to follow the rest of the path. Dashed lines are conditional branches — the label says the condition.",
        )}
      </p>

      <div className="fc-legend">
        {LEGEND.map((k) => {
          const l = kindLabel(k);
          return (
            <span key={k} className="fc-legend-item">
              <span className={`fc-swatch fc-node-${k}`} aria-hidden />
              {ar ? l.ar : l.en}
            </span>
          );
        })}
      </div>

      {gaps.length > 0 ? (
        <p className="fc-gap">
          {L(
            `يملك هذا الدور أدوات لا يربطها الرسم: ${gaps.join("، ")} — مدخلاتها لا تُشتق من السؤال وحده، وتخمينها يعطي جواباً واثقاً عن الشيء الخطأ.`,
            `This role holds tools the graph never binds: ${gaps.join(", ")} — their inputs cannot be derived from the objective alone, and guessing produces a confident answer about the wrong thing.`,
          )}
        </p>
      ) : null}
    </DaylightShell>
  );
}
