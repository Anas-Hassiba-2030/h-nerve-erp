// lib/voac/flowCanvas.ts — the agent company as a workflow canvas.
//
// The org map answers "who exists". The run trace answers "what happened once".
// Neither answers the question an owner actually asks first: **how does a
// request travel through this system, end to end, including the branches?**
// That is a workflow diagram, and this module computes one.
//
// DERIVED, NEVER DRAWN. Every node and edge here comes from the same sources
// the executor runs on — `flowSpecFor` for the stage graph, `VOAC_ROLES` for
// the roster, `COUNCIL_VOICES` for the debate, and the ordering in
// driver.live.ts for the brakes and the human gate. A hand-drawn diagram is
// accurate exactly once, on the day it is drawn; this one cannot drift without
// the code drifting with it.
//
// WHY THE LAYOUT LIVES IN A PURE MODULE. Coordinates computed in JSX are
// untestable and get nudged by eye until they look right on one screen. Here
// they are data: a test can assert that no edge points at a node that does not
// exist, and that the conditional branches are actually present.
//
// NO GRAPH LIBRARY. The layout is layered left-to-right with a known node set —
// a few dozen lines of arithmetic. Pulling in a canvas framework would add a
// dependency, ship a hydration bundle to a user who is complaining about lag,
// and buy nothing: there is no dragging, no zooming, no live editing here.

import { flowSpecFor, GATHERABLE_TOOLS, type FlowSpec } from "./flowGraph";
import { COUNCIL_VOICES } from "./orgMap";
import { VOAC_ROLES, GROUP_BROKER_ID, type VoacRole } from "./roles";

/** What a node MEANS — drives its colour and shape on the canvas. */
export type CanvasNodeKind =
  /** Where work enters the system. */
  | "trigger"
  /** A refusal gate: cost, scope, or safety. Nothing passes without clearing it. */
  | "brake"
  /** Code choosing a branch. Never the model — see flowGraph's guard note. */
  | "router"
  /** An agent role. */
  | "agent"
  /** A deterministic brain-tool call. */
  | "tool"
  /** One LLM pass. */
  | "model"
  /** A named council voice. */
  | "voice"
  /** A pure, model-free check. */
  | "check"
  /** The human. The only node that is not software. */
  | "human"
  /** A terminal state. */
  | "end";

export type CanvasNode = {
  id: string;
  kind: CanvasNodeKind;
  titleAr: string;
  titleEn: string;
  /** One line of detail, shown small under the title. Optional. */
  noteAr?: string;
  noteEn?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasEdge = {
  id: string;
  from: string;
  to: string;
  /** A conditional branch — drawn dashed, and labelled with its condition. */
  conditional?: boolean;
  labelAr?: string;
  labelEn?: string;
  /** Cubic bezier `d`, precomputed so the view does no geometry. */
  path: string;
};

export type Canvas = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  width: number;
  height: number;
};

// ── Layout constants ──────────────────────────────────────────────────
const NODE_W = 190;
const NODE_H = 62;
const COL_GAP = 92;   // horizontal space BETWEEN columns
const ROW_GAP = 26;   // vertical space between stacked nodes
const PAD = 40;

const colX = (col: number) => PAD + col * (NODE_W + COL_GAP);

/**
 * A cubic bezier from one node's right edge to another's left edge.
 *
 * Control points sit halfway between the two, which is what gives the smooth
 * S-curve of a workflow editor rather than the elbow of an org chart. The two
 * shapes read differently on purpose: an elbow says "reports to", a curve says
 * "flows into".
 */
function bezier(a: CanvasNode, b: CanvasNode): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

/**
 * A self-returning curve, for an edge that goes BACKWARD (the revise loop).
 *
 * Routed under both nodes rather than between them: a backward edge drawn on
 * the same line as the forward flow reads as a second forward edge, which is
 * the one thing a loop must not look like.
 */
function loopBack(a: CanvasNode, b: CanvasNode): string {
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y + b.h;
  const dip = Math.max(y1, y2) + 46;
  return `M ${x1},${y1} C ${x1},${dip} ${x2},${dip} ${x2},${y2}`;
}

type Draft = Omit<CanvasNode, "x" | "y" | "w" | "h"> & { col: number; row: number };

/**
 * Build the canvas for ONE role — the full journey of a request through it.
 *
 * The shape differs by role because the system's shape differs by role, which
 * is the whole point of showing it: a broker fans into a council, a graphed
 * role marches through its stages, and a loop role is honestly drawn as a loop
 * because nobody can know its steps in advance.
 */
export function buildCanvas(roleId: string, roles: VoacRole[] = VOAC_ROLES): Canvas {
  const role = roles.find((r) => r.id === roleId) ?? roles[0];
  const spec = flowSpecFor(role.defaultTopology, role.tools);
  const drafts: Draft[] = [];
  const edges: Omit<CanvasEdge, "path">[] = [];

  const add = (d: Draft) => { drafts.push(d); return d.id; };
  const link = (
    from: string, to: string,
    opts: { conditional?: boolean; labelAr?: string; labelEn?: string } = {},
  ) => { edges.push({ id: `${from}->${to}`, from, to, ...opts }); };

  // ── Column 0: how work enters ───────────────────────────────────────
  add({
    id: "trigger", kind: "trigger", col: 0, row: 0,
    titleAr: "طلب", titleEn: "A request",
    noteAr: "جدولة يومية أو تشغيل يدوي", noteEn: "Daily schedule, or run by hand",
  });

  // ── Column 1: the brakes, in the order driver.live.ts applies them ──
  // Drawn as a column of gates because that is what they are: three separate
  // refusals, any one of which ends the run before a token is spent.
  add({
    id: "brake-scope", kind: "brake", col: 1, row: 0,
    titleAr: "فحص النطاق", titleEn: "Scope check",
    noteAr: "الدور والشركة والصلاحية", noteEn: "Role, company, standing",
  });
  add({
    id: "brake-shape", kind: "brake", col: 1, row: 1,
    titleAr: "سقف الشكل", titleEn: "Shape ceiling",
    noteAr: "أقصى عدد نداءات لهذا النمط", noteEn: "Most model passes this shape may make",
  });
  add({
    id: "brake-budget", kind: "brake", col: 1, row: 2,
    titleAr: "ميزانية المستأجر", titleEn: "Tenant budget",
    noteAr: "يرفض مسبقاً إن تجاوز الحد", noteEn: "Refuses up front if it would overspend",
  });
  link("trigger", "brake-scope");
  link("brake-scope", "brake-shape");
  link("brake-shape", "brake-budget");

  add({
    id: "refused", kind: "end", col: 2, row: 3,
    titleAr: "رُفض", titleEn: "Refused",
    noteAr: "لم يُنفَق شيء — وسُجِّل السبب", noteEn: "Nothing spent, and the reason recorded",
  });
  link("brake-budget", "refused", {
    conditional: true, labelAr: "لا يُسمح", labelEn: "not allowed",
  });

  // ── Columns 2+: the engine this role actually runs ──────────────────
  let tail: string;
  let col = 2;

  if (role.defaultTopology === "parallel") {
    // The council. Five named voices at once, then a moderator — the one
    // shape in the system that is genuinely a fan, so it is drawn as one.
    const router = add({
      id: "convene", kind: "router", col, row: 0,
      titleAr: "يعقد المجلس", titleEn: "Convene the council",
      noteAr: "أهداف متنازعة", noteEn: "Competing objectives",
    });
    link("brake-budget", router, { labelAr: "مسموح", labelEn: "allowed" });
    col += 1;

    const voices = COUNCIL_VOICES.filter((v) => !v.moderator);
    voices.forEach((v, i) => {
      add({ id: `voice-${v.id}`, kind: "voice", col, row: i, titleAr: v.ar, titleEn: v.en });
      link(router, `voice-${v.id}`);
    });
    col += 1;

    const mod = COUNCIL_VOICES.find((v) => v.moderator)!;
    add({
      id: "moderator", kind: "model", col, row: Math.floor((voices.length - 1) / 2),
      titleAr: mod.ar, titleEn: mod.en,
      noteAr: "يرجّح الأصوات بعد أن تتحدّث", noteEn: "Reconciles the voices after they speak",
    });
    voices.forEach((v) => link(`voice-${v.id}`, "moderator"));
    tail = "moderator";
    col += 1;
  } else if (spec) {
    tail = "brake-budget";
    let allowedLabelled = false;
    for (const stage of spec.stages) {
      const stageNodes: string[] = [];
      stage.nodes.forEach((n, i) => {
        const kind: CanvasNodeKind =
          n.kind === "tool" ? "tool" : n.kind === "grade" ? "check" : "model";
        add({
          id: `${stage.id}-${n.id}`, kind, col, row: i,
          titleAr: n.labelAr, titleEn: n.labelEn,
          ...(stage.nodes.length > 1
            ? { noteAr: "يعمل مع إخوته دفعة واحدة", noteEn: "Runs with its siblings, all at once" }
            : {}),
        });
        stageNodes.push(`${stage.id}-${n.id}`);
      });
      if (stageNodes.length === 0) continue;

      for (const id of stageNodes) {
        link(tail, id, {
          ...(allowedLabelled ? {} : { labelAr: "مسموح", labelEn: "allowed" }),
          // A guarded stage is entered only when its condition holds — that is
          // literally a conditional edge, so it is drawn as one.
          ...(stage.runIf
            ? {
                conditional: true,
                labelAr: stage.runIf === "revisionNeeded" ? "الأرقام لم تثبت" : "يوجد ما يُقال",
                labelEn: stage.runIf === "revisionNeeded" ? "figures did not ground" : "something to say",
              }
            : {}),
        });
        allowedLabelled = true;
      }

      // A fan reconverges on the next stage's single node; a 1-node stage is
      // just the next link. Either way the tail is the LAST node of the stage.
      tail = stageNodes[stageNodes.length - 1];
      col += 1;
    }

    // The revise loop, drawn as a real backward edge. topology.ts has always
    // promised "revise until it passes"; this is where an owner can see it.
    const grade = drafts.find((d) => d.id === "grade-grade");
    const draft = drafts.find((d) => d.id === "draft-draft");
    if (grade && draft) {
      link("grade-grade", "draft-draft", {
        conditional: true, labelAr: "أعد المحاولة مرّة", labelEn: "one revision",
      });
    }
  } else {
    // A loop topology. Its steps are discovered at runtime, so drawing stages
    // would be a diagram of something that does not exist.
    add({
      id: "loop", kind: "router", col, row: 0,
      titleAr: "حلقة أدوات", titleEn: "Tool loop",
      noteAr: "الخطوات لا تُعرف إلا أثناء التشغيل", noteEn: "The steps are only knowable as it runs",
    });
    link("brake-budget", "loop", { labelAr: "مسموح", labelEn: "allowed" });
    tail = "loop";
    col += 1;
  }

  // ── The quiet edge: skip the write-up when there is nothing to report ─
  const quietSource = drafts.find((d) => d.id === "reason-reason") ?? drafts.find((d) => d.id === "draft-draft");
  const hasQuiet = Boolean(spec?.stages.find((s) => s.id === "narrate")?.runIf);

  // ── The human gate ──────────────────────────────────────────────────
  add({
    id: "extract", kind: "check", col, row: 0,
    titleAr: "استخراج المقترحات", titleEn: "Extract proposals",
    noteAr: "من كتلة مُعلَّمة فقط — بلا تخمين", noteEn: "From a fenced block only — no guessing",
  });
  link(tail, "extract");
  col += 1;

  add({
    id: "cap", kind: "brake", col, row: 0,
    titleAr: "الحد اليومي", titleEn: "Daily cap",
    noteAr: "يحمي انتباهك، لا الخوادم", noteEn: "Protects your attention, not the servers",
  });
  link("extract", "cap");
  col += 1;

  add({
    id: "human", kind: "human", col, row: 0,
    titleAr: "أنت تقرّر", titleEn: "You decide",
    noteAr: "قبول أو رفض — والرفض يتطلّب سبباً", noteEn: "Accept or reject — a reject needs a reason",
  });
  link("cap", "human");
  col += 1;

  add({
    id: "done", kind: "end", col, row: 0,
    titleAr: "قرار مُسجَّل", titleEn: "Decision recorded",
    noteAr: "باسم صاحبه، وقابل للمراجعة", noteEn: "Against a name, and reviewable",
  });
  link("human", "done");

  add({
    id: "quiet", kind: "end", col: col - 3, row: 2,
    titleAr: "لا شيء يستحق انتباهك", titleEn: "Nothing worth your attention",
    noteAr: "نتيجة صحيحة — ووفّرت نداءً", noteEn: "A correct outcome — and it saved a call",
  });
  if (hasQuiet && quietSource) {
    link(quietSource.id, "quiet", {
      conditional: true, labelAr: "لا جديد", labelEn: "nothing material",
    });
  } else {
    link("cap", "quiet", { conditional: true, labelAr: "لا مقترحات", labelEn: "no proposals" });
  }

  return place(drafts, edges);
}

/**
 * Turn column/row indices into pixels, then compute every edge path.
 *
 * Rows are centred within their column so a fan reads as a fan: five voices in
 * one column line up symmetrically around the single node feeding them, rather
 * than hanging off the top like a list.
 */
function place(drafts: Draft[], rawEdges: Omit<CanvasEdge, "path">[]): Canvas {
  const rowsPerCol = new Map<number, number>();
  for (const d of drafts) rowsPerCol.set(d.col, Math.max(rowsPerCol.get(d.col) ?? 0, d.row + 1));
  const tallest = Math.max(...rowsPerCol.values());
  const colHeight = (n: number) => n * NODE_H + (n - 1) * ROW_GAP;
  const canvasH = colHeight(tallest) + PAD * 2;

  const nodes: CanvasNode[] = drafts.map((d) => {
    const rows = rowsPerCol.get(d.col) ?? 1;
    const top = PAD + (colHeight(tallest) - colHeight(rows)) / 2;
    return {
      id: d.id, kind: d.kind,
      titleAr: d.titleAr, titleEn: d.titleEn,
      noteAr: d.noteAr, noteEn: d.noteEn,
      x: colX(d.col),
      y: top + d.row * (NODE_H + ROW_GAP),
      w: NODE_W, h: NODE_H,
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: CanvasEdge[] = [];
  for (const e of rawEdges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    // An edge to a node that was never added is a bug in the builder, not
    // something to render half of. Dropped here, caught by the test below.
    if (!a || !b) continue;
    edges.push({ ...e, path: b.x >= a.x + a.w ? bezier(a, b) : loopBack(a, b) });
  }

  const maxCol = Math.max(...drafts.map((d) => d.col));
  return { nodes, edges, width: colX(maxCol) + NODE_W + PAD, height: canvasH };
}

/** Every role that can be drawn — the picker on the canvas page. */
export function canvasRoles(roles: VoacRole[] = VOAC_ROLES): { id: string; ar: string; en: string }[] {
  return roles.map((r) => ({ id: r.id, ar: r.labelAr, en: r.labelEn }));
}

/** Bilingual gloss per node kind — the canvas legend. */
export function kindLabel(kind: CanvasNodeKind): { ar: string; en: string } {
  switch (kind) {
    case "trigger": return { ar: "بداية", en: "Start" };
    case "brake": return { ar: "مكبح", en: "Brake" };
    case "router": return { ar: "تفريع", en: "Branch" };
    case "agent": return { ar: "وكيل", en: "Agent" };
    case "tool": return { ar: "أداة", en: "Tool" };
    case "model": return { ar: "نموذج", en: "Model" };
    case "voice": return { ar: "صوت", en: "Voice" };
    case "check": return { ar: "تحقّق", en: "Check" };
    case "human": return { ar: "إنسان", en: "Human" };
    case "end": return { ar: "نهاية", en: "End" };
  }
}

/** Tools a graphed role may hold but never binds into its canvas. Honest gap. */
export function ungraphedTools(role: VoacRole): string[] {
  if (!flowSpecFor(role.defaultTopology, role.tools)) return [];
  return role.tools.filter((t) => t !== "narrate" && !GATHERABLE_TOOLS.has(t));
}

export { GROUP_BROKER_ID };
