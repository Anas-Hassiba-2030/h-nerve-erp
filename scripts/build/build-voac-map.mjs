// scripts/build/build-voac-map.mjs
//
// Emits the VOAC architecture as TWO artifacts from ONE source of truth:
//
//   docs/architecture/voac.json  — for the next agent. Machine-readable map of
//                                  layers, nodes, edges, roles, topologies,
//                                  models and invariants.
//   docs/architecture/voac.html  — for a human. Self-contained interactive
//                                  diagram, no CDN, opens straight from disk.
//
// WHY GENERATED RATHER THAN HAND-WRITTEN: a hand-drawn architecture diagram is
// accurate exactly once. This reads the real registry, the real topology table,
// the real Prisma models and the real skill documents, so a role added in
// roles.ts appears on the map on the next run — and a map that silently lies is
// worse than no map, because people stop checking it.
//
// The SVG geometry is COMPUTED, never hand-placed, for the same reason: adding
// a sixth role must re-flow the diagram, not overlap something.
//
//   node scripts/build/build-voac-map.mjs

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");
const OUT_DIR = join(ROOT, "docs/architecture");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// ---------------------------------------------------------------- extract ---

function extractRoles() {
  const src = read("src/lib/voac/roles.ts");
  const body = src.slice(src.indexOf("export const VOAC_ROLES"));
  const roles = [];
  const blockRe = /\{\s*id:\s*(?:"([^"]+)"|(\w+))[\s\S]*?\}\s*,\s*(?=\{|\];)/g;
  let m;
  while ((m = blockRe.exec(body))) {
    const block = m[0];
    const pick = (key) => {
      const r = new RegExp(key + ':\\s*"([^"]*)"').exec(block);
      return r ? r[1] : null;
    };
    const toolsRaw = /tools:\s*\[([^\]]*)\]/.exec(block);
    roles.push({
      id: m[1] ?? (block.includes("GROUP_BROKER_ID") ? "group-broker" : "unknown"),
      labelAr: pick("labelAr"),
      labelEn: pick("labelEn"),
      sector: pick("sector"),
      skillDocId: pick("skillDocId"),
      defaultTopology: pick("defaultTopology"),
      tools: toolsRaw ? [...toolsRaw[1].matchAll(/"([^"]+)"/g)].map((t) => t[1]) : [],
    });
  }
  return roles;
}

function extractTopologies() {
  const src = read("src/lib/voac/topology.ts");
  const body = src.slice(src.indexOf("export const TOPOLOGIES"));
  const out = [];
  const re = /(\w+):\s*\{\s*id:\s*"([^"]+)"[\s\S]*?labelEn:\s*"([^"]*)"[\s\S]*?labelAr:\s*"([^"]*)"[\s\S]*?maxHops:\s*(\d+)[\s\S]*?costMultiplier:\s*(\d+)[\s\S]*?requiresHumanOptIn:\s*(true|false)/g;
  let m;
  while ((m = re.exec(body))) {
    out.push({
      id: m[2], labelEn: m[3], labelAr: m[4],
      maxHops: Number(m[5]), costMultiplier: Number(m[6]),
      requiresHumanOptIn: m[7] === "true",
    });
  }
  return out;
}

function extractModels() {
  const src = read("prisma/schema/voac.prisma");
  const out = [];
  const re = /\/\/\/([\s\S]*?)\nmodel (\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(src))) {
    const doc = m[1].split("\n").map((l) => l.replace(/^\s*\/\/\/?\s?/, "").trim()).filter(Boolean).join(" ");
    const fields = m[3].split("\n").map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@") && !l.startsWith("///"));
    out.push({ name: m[2], summary: doc, fieldCount: fields.length });
  }
  return out;
}

function extractSkills() {
  const dir = join(ROOT, "src/lib/voac/skills");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const body = readFileSync(join(dir, f), "utf8");
    const heading = (/^#\s+(.+)$/m.exec(body) || [, f])[1];
    return {
      id: f.replace(/\.md$/, ""),
      title: heading,
      version: createHash("sha256").update(body).digest("hex").slice(0, 8),
      chars: body.length,
      hardLimits: (body.match(/^-\s+Never\b/gim) || []).length,
    };
  });
}

/** Test counts, read from the suite rather than asserted from memory. */
function countTests() {
  const dir = join(ROOT, "src/lib/voac");
  let n = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".test.ts"))) {
    n += (readFileSync(join(dir, f), "utf8").match(/^\s*it\(/gm) || []).length;
  }
  return n;
}

// ------------------------------------------------------------------ model ---

const roles = extractRoles();
const topologies = extractTopologies();
const models = extractModels();
const skills = extractSkills();
const testCount = countTests();

const groupBroker = roles.find((r) => r.sector === "GROUP");
const companyRoles = roles.filter((r) => r.sector !== "GROUP");

const LAYERS = [
  { id: "group", label: "Group", labelAr: "المجموعة", hint: "The only supervisor" },
  { id: "roster", label: "Company rosters", labelAr: "فرق الشركات", hint: "Data, not an org layer" },
  { id: "substrate", label: "Substrate", labelAr: "الأساس", hint: "One ledger, every run" },
  { id: "gate", label: "Human gate", labelAr: "بوابة القرار", hint: "Propose, never commit" },
  { id: "learn", label: "Offline", labelAr: "خارج الخدمة", hint: "CI only, zero runtime cost" },
];

const nodes = [];
const edges = [];

nodes.push({
  id: "group-broker", layer: "group", kind: "supervisor",
  label: groupBroker?.labelEn ?? "Group Broker",
  labelAr: groupBroker?.labelAr ?? "وسيط المجموعة",
  file: "src/lib/voac/roles.ts",
  summary:
    "The ONLY supervisor. Holds the cross-company view and the standing to arbitrate between two companies' P&Ls — the one layer that has something its subordinates lack.",
  invariants: [
    "companyId is NULL — it belongs to the group, never to one company",
    "Runs " + (groupBroker?.defaultTopology ?? "parallel") + ": two P&Ls means competing objectives",
    "Must state a transfer-pricing basis before proposing an intercompany move",
    "Cannot propose perishables across a border",
  ],
});

for (const r of companyRoles) {
  nodes.push({
    id: r.id, layer: "roster", kind: "role",
    label: r.labelEn, labelAr: r.labelAr, sector: r.sector,
    file: "src/lib/voac/skills/" + r.skillDocId + ".md",
    summary: "Sector " + r.sector + ". Default topology " + r.defaultTopology + ". Tools: " + (r.tools.join(", ") || "none") + ".",
    invariants: ["Company-scoped — a run without a companyId is refused"],
  });
  edges.push({ from: "group-broker", to: r.id, kind: "brokers", label: "brokers between" });
}

const SUBSTRATE = [
  ["role", "The identity and its tools", "src/lib/voac/roles.ts"],
  ["skill.md", "Instructions as a trainable markdown document", "src/lib/voac/skills/"],
  ["AgentRun", "One invocation under one topology", "prisma/schema/voac.prisma"],
  ["AgentStep", "One step; parentStepId keeps fan-out distinguishable from hand-off", "prisma/schema/voac.prisma"],
  ["score", "Nullable — unscored must stay visibly unscored", "src/lib/voac/runStore.ts"],
];
SUBSTRATE.forEach(([id, summary, file], i) => {
  nodes.push({ id: "substrate:" + id, layer: "substrate", kind: "substrate", label: id, summary, file });
  if (i > 0) edges.push({ from: "substrate:" + SUBSTRATE[i - 1][0], to: "substrate:" + id, kind: "flows", label: "" });
});
for (const r of companyRoles) edges.push({ from: r.id, to: "substrate:role", kind: "runs-on", label: "" });
edges.push({ from: "group-broker", to: "substrate:role", kind: "runs-on", label: "" });

const GATE = [
  ["budget", "Proposal budget", "Hard cap per human per day. Ranks on expected value; reports everything it held back.", "src/lib/voac/budget.ts"],
  ["commit", "Human commits", "A named approver. Liability sits with whoever clicked.", "src/lib/voac/runStore.ts"],
  ["outcome", "Outcome recorded", "Realized value, 30-60 days later. The only non-circular signal in the system.", "prisma/schema/voac.prisma"],
];
GATE.forEach(([id, label, summary, file], i) => {
  nodes.push({ id: "gate:" + id, layer: "gate", kind: "gate", label, summary, file });
  if (i > 0) edges.push({ from: "gate:" + GATE[i - 1][0], to: "gate:" + id, kind: "flows", label: "" });
});
edges.push({ from: "substrate:score", to: "gate:budget", kind: "flows", label: "" });

nodes.push({
  id: "skillopt", layer: "learn", kind: "offline",
  label: "SkillOpt", labelAr: "تدريب خارج الخدمة",
  file: "scripts/build/build-voac-skills.mjs",
  summary:
    "Trains the markdown skill documents against recorded outcomes and ships a static best_skill.md. Python plus a long-running loop, so it can never run in the Worker — which is why runtime inference cost is unchanged.",
  invariants: [
    "Never runs at request time — zero extra inference calls",
    "At one client there is no held-out distribution: today this is a regression suite, NOT training",
    "Never train on self-assessed scores alone — that reward is circular",
  ],
});
edges.push({ from: "gate:outcome", to: "skillopt", kind: "trains", label: "trains on real outcomes" });
edges.push({ from: "skillopt", to: "substrate:skill.md", kind: "rewrites", label: "rewrites" });

const INVARIANTS = [
  { id: "one-supervisor", title: "Exactly one supervisor",
    body: "A supervisor over agents that share a company holds neither information nor authority its subordinates lack — a pass-through that costs a hop. Only the Group Broker qualifies.",
    enforcedBy: "src/lib/voac/roles.test.ts" },
  { id: "capped-proposals", title: "The proposal queue is capped",
    body: "An uncapped queue is either ignored or rubber-stamped, and rubber-stamping silently deletes the human gate. Precision is the product; recall is a liability.",
    enforcedBy: "src/lib/voac/budget.ts" },
  { id: "read-mostly", title: "Read-mostly",
    body: "The VOAC writes AgentProposal rows and nothing else. Domain mutations go through the ordinary server actions.",
    enforcedBy: "scripts/verify/voac-smoke.ts" },
  { id: "refusal-is-a-row", title: "A refusal is still a row",
    body: "Refused runs are written with status REFUSED and a reason. The agent declining must be answerable from the ledger, not invisible.",
    enforcedBy: "src/lib/voac/runStore.ts" },
  { id: "stub-is-not-failure", title: "Stub is not failure",
    body: "A run with no API key configured did not fail — the bookkeeping worked and there was no model behind it. Folding that into FAILED sends someone hunting a defect that does not exist.",
    enforcedBy: "src/lib/voac/runStore.ts" },
  { id: "terminal-is-terminal", title: "A finished run never reopens",
    body: "An audit trail that can be rewritten is not an audit trail.",
    enforcedBy: "src/lib/voac/runStore.ts" },
  { id: "no-invented-proposals", title: "Never salvage a proposal from prose",
    body: "If the output contract is not honoured, zero proposals are extracted. A parser-invented proposal would carry a confidence nobody assigned and reach a manager looking exactly like one the agent stood behind.",
    enforcedBy: "src/lib/voac/proposals.ts" },
  { id: "two-keys", title: "Two keys: tenantId isolates, companyId organises",
    body: "An AgentStep's output quotes the tenant's own documents, so a scoping bug leaks source data — not merely metadata.",
    enforcedBy: "src/lib/tenancy/workspaceScope.ts" },
];

const OPEN = [
  "No UI surface. The ledger has no screen yet — runs are visible only in the database.",
  "The driver is request-scoped. Every step is persisted as it happens, so a cron or queue driver is a change of caller, not a rewrite — but that caller does not exist yet.",
  "SkillOpt has no held-out distribution at one client; treat it as a regression suite until proposal volume and a second reviewer exist.",
  "The flagship cross-company flow is bounded by the hotels' purchasing cycle, which is not recorded anywhere yet.",
];

const doc = {
  $schema: "hnerve.voac.architecture/1",
  generatedBy: "scripts/build/build-voac-map.mjs",
  system: "H-Nerve ERP",
  component: "VOAC — Virtual Orchestration Agent Company (runtime)",
  notToBeConfusedWith: {
    name: "VAOC (build-time)", doc: "docs/VAOC.md",
    difference: "VAOC is the Claude Code subagent company that writes this repo. VOAC ships inside the product. Same primitive, different lifetime.",
  },
  docs: ["docs/VOAC-RUNTIME.md"],
  entryPoints: {
    driver: "src/lib/voac/driver.live.ts — runVoac() / runGroupBroker()",
    reuses: ["src/lib/brain/orchestrator.ts (runToolLoop)", "src/lib/brain/council.live.ts (convene)"],
    verify: "scripts/verify/voac-smoke.ts",
    ceiling: "scripts/ops/voac-ceiling.ts",
  },
  stats: { roles: roles.length, topologies: topologies.length, models: models.length, skillDocs: skills.length, unitTests: testCount },
  layers: LAYERS, nodes, edges, roles, topologies, models, skills,
  invariants: INVARIANTS, openQuestions: OPEN,
};

// ------------------------------------------------------------------ layout ---
// Computed, not hand-placed: adding a role re-flows the diagram.

const COL_X = { group: 40, roster: 322, substrate: 648, gate: 900, learn: 1164 };
const NODE_W = { group: 230, roster: 262, substrate: 190, gate: 214, learn: 150 };
const NODE_H = { group: 64, roster: 60, substrate: 42, gate: 60, learn: 64 };
const ROW_GAP = 16;
const TOP = 40;

const LAYER_COLOR = {
  group:     { fill: "#0f2f27", stroke: "#2fb98a", text: "#a7ecd1", tag: "#2fb98a" },
  roster:    { fill: "#13241f", stroke: "#3d7a64", text: "#d3e9e0", tag: "#77c7a9" },
  substrate: { fill: "#161e2c", stroke: "#53659a", text: "#ccd7f2", tag: "#93a5dc" },
  gate:      { fill: "#2b1a14", stroke: "#b45c3f", text: "#f4cbba", tag: "#e0714a" },
  learn:     { fill: "#2b2314", stroke: "#a9832f", text: "#f3ddad", tag: "#d9a441" },
};

function layout(ns) {
  const byLayer = {};
  for (const n of ns) (byLayer[n.layer] ||= []).push(n);
  const maxRows = Math.max(...Object.values(byLayer).map((a) => a.length));
  const fullH = maxRows * NODE_H.roster + (maxRows - 1) * ROW_GAP;
  const placed = {};
  for (const [layer, list] of Object.entries(byLayer)) {
    const h = NODE_H[layer];
    const blockH = list.length * h + (list.length - 1) * ROW_GAP;
    const startY = TOP + (fullH - blockH) / 2;
    list.forEach((n, i) => {
      placed[n.id] = { ...n, x: COL_X[layer], y: startY + i * (h + ROW_GAP), w: NODE_W[layer], h };
    });
  }
  return { placed, bottom: TOP + fullH };
}

function link(a, b) {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  const x2 = b.x, y2 = b.y + b.h / 2;
  const dx = Math.max(30, (x2 - x1) * 0.5);
  return "M " + x1 + " " + y1 + " C " + (x1 + dx) + " " + y1 + ", " + (x2 - dx) + " " + y2 + ", " + x2 + " " + y2;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (s, n) => { const t = String(s ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

function diagram(d) {
  const { placed, bottom } = layout(d.nodes);
  const P = (id) => placed[id];
  const roleIds = d.nodes.filter((n) => n.layer === "roster").map((n) => n.id);
  const subIds = d.nodes.filter((n) => n.layer === "substrate").map((n) => n.id);
  const gateIds = d.nodes.filter((n) => n.layer === "gate").map((n) => n.id);

  const paths = [];
  for (const r of roleIds) paths.push({ d: link(P("group-broker"), P(r)), cls: "e-brok" });

  // A bus, not every pairwise line: five role-to-substrate arrows converging on
  // one pill turns the middle of the diagram into a knot and says nothing more.
  const busX = COL_X.roster + NODE_W.roster + 30;
  const rTop = P(roleIds[0]), rBot = P(roleIds[roleIds.length - 1]);
  const y1 = rTop.y + rTop.h / 2, y2 = rBot.y + rBot.h / 2;
  paths.push({ d: "M " + (rTop.x + rTop.w) + " " + y1 + " L " + busX + " " + y1 + " L " + busX + " " + y2 + " L " + (rBot.x + rBot.w) + " " + y2, cls: "e-bus", noArrow: true });
  const s0 = P(subIds[0]), midY = (y1 + y2) / 2;
  paths.push({ d: "M " + busX + " " + midY + " C " + (busX + 60) + " " + midY + ", " + (s0.x - 60) + " " + (s0.y + s0.h / 2) + ", " + s0.x + " " + (s0.y + s0.h / 2), cls: "e-run" });

  for (let i = 1; i < subIds.length; i++) {
    const a = P(subIds[i - 1]), b = P(subIds[i]);
    paths.push({ d: "M " + (a.x + a.w / 2) + " " + (a.y + a.h) + " L " + (b.x + b.w / 2) + " " + b.y, cls: "e-chain" });
  }
  paths.push({ d: link(P(subIds[subIds.length - 1]), P(gateIds[0])), cls: "e-gate" });
  for (let i = 1; i < gateIds.length; i++) {
    const a = P(gateIds[i - 1]), b = P(gateIds[i]);
    paths.push({ d: "M " + (a.x + a.w / 2) + " " + (a.y + a.h) + " L " + (b.x + b.w / 2) + " " + b.y, cls: "e-gate" });
  }
  paths.push({ d: link(P(gateIds[gateIds.length - 1]), P("skillopt")), cls: "e-gate" });

  // The feedback loop routes UNDER everything so it reads as a cycle rather
  // than one more forward step.
  const sk = P("skillopt"), skill = P("substrate:skill.md");
  const loopY = bottom + 52;
  paths.push({ d: "M " + (sk.x + sk.w / 2) + " " + (sk.y + sk.h) + " L " + (sk.x + sk.w / 2) + " " + loopY + " L " + (skill.x + skill.w / 2) + " " + loopY + " L " + (skill.x + skill.w / 2) + " " + (skill.y + skill.h), cls: "e-loop" });

  const H = loopY + 46, W = COL_X.learn + NODE_W.learn + 40;

  const headers = LAYERS.map((L) => {
    const c = LAYER_COLOR[L.id];
    return '<text x="' + COL_X[L.id] + '" y="18" class="colhead" fill="' + c.tag + '">' + esc(L.label.toUpperCase()) + "</text>" +
           '<text x="' + COL_X[L.id] + '" y="31" class="colhint">' + esc(L.hint) + "</text>";
  }).join("");

  const boxes = d.nodes.map((n) => {
    const p = P(n.id), c = LAYER_COLOR[n.layer];
    const isSub = n.layer === "substrate";
    const two = !isSub && (n.labelAr || n.sector);
    const sub = n.sector && n.layer === "roster" ? n.sector : n.labelAr || "";
    return '<g class="n" data-id="' + esc(n.id) + '" tabindex="0" role="button" aria-label="' + esc(n.label) + '">' +
      '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="9" fill="' + c.fill + '" stroke="' + c.stroke + '"/>' +
      '<text x="' + (p.x + 15) + '" y="' + (p.y + (two ? 25 : p.h / 2 + 5)) + '" class="' + (isSub ? "nlabel mono" : "nlabel") + '" fill="' + c.text + '">' + esc(cut(n.label, isSub ? 20 : 31)) + "</text>" +
      (two ? '<text x="' + (p.x + 15) + '" y="' + (p.y + 44) + '" class="nsub" fill="' + c.tag + '">' + esc(cut(sub, 26)) + "</text>" : "") +
      "</g>";
  }).join("");

  return '<svg id="diagram" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="VOAC architecture: one Group Broker brokers between five company rosters; all runs land on a shared substrate; output passes a capped human gate; SkillOpt rewrites the skill documents offline.">' +
    '<defs>' +
    '<marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#6c8c81"/></marker>' +
    '<marker id="ahg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#d9a441"/></marker>' +
    "</defs>" + headers +
    '<g class="edges">' + paths.map((p) => '<path d="' + p.d + '" class="' + p.cls + '" fill="none"' + (p.noArrow ? "" : ' marker-end="url(#' + (p.cls === "e-loop" ? "ahg" : "ah") + ')"') + "/>").join("") + "</g>" +
    '<text x="' + ((sk.x + skill.x) / 2 + 40) + '" y="' + (loopY - 9) + '" class="edgelabel" text-anchor="middle" fill="#d9a441">SkillOpt rewrites the skill document — offline, in CI, zero runtime cost</text>' +
    boxes + "</svg>";
}

// -------------------------------------------------------------------- html ---

function html(d) {
  const S = d.stats;
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1"/>\n<title>VOAC — Architecture &amp; Flows | H-Nerve</title>\n<style>\n' + CSS + '\n</style>\n</head>\n<body>\n' +
`<header>
  <div class="eyebrow">H-Nerve · runtime intelligence</div>
  <h1>VOAC <span class="dim">— Virtual Orchestration Agent Company</span></h1>
  <p class="sub">One Group Broker over per-company rosters, on a shared trace substrate. Agents propose; a named human commits. Every box below is read from the real source — registry, topology table, Prisma models, skill documents.</p>
  <div class="stats">
    <div class="stat"><b>${S.roles}</b><span>roles</span></div>
    <div class="stat"><b>1</b><span>supervisor</span></div>
    <div class="stat"><b>${S.topologies}</b><span>topologies</span></div>
    <div class="stat"><b>${S.models}</b><span>models</span></div>
    <div class="stat"><b>${S.skillDocs}</b><span>skill docs</span></div>
    <div class="stat"><b>${S.unitTests}</b><span>unit tests</span></div>
  </div>
  <div class="warn"><b>VAOC ≠ VOAC.</b> ${esc(d.notToBeConfusedWith.difference)} See <code>${esc(d.notToBeConfusedWith.doc)}</code>.</div>
</header>

<section class="diagram-wrap">
  <div class="legend">
    <span><i style="background:#2fb98a"></i>Group</span>
    <span><i style="background:#77c7a9"></i>Company roles</span>
    <span><i style="background:#93a5dc"></i>Substrate</span>
    <span><i style="background:#e0714a"></i>Human gate</span>
    <span><i style="background:#d9a441"></i>Offline learning</span>
    <span class="tip">click any box → detail below</span>
  </div>
  <div class="scroller">${diagram(d)}</div>
</section>

<section class="detail-wrap">
  <div id="panel">
    <div class="ph">
      <h3>Pick a box in the diagram</h3>
      <p>You will get its file path, its skill-document version hash, and the invariants that box is responsible for.</p>
    </div>
  </div>
  <div class="entry">
    <div class="lab">Entry points</div>
    <table>
      <tr><th>driver</th><td class="mono">${esc(d.entryPoints.driver)}</td></tr>
      <tr><th>reuses</th><td class="mono">${d.entryPoints.reuses.map(esc).join("<br>")}</td></tr>
      <tr><th>verify</th><td class="mono">${esc(d.entryPoints.verify)}</td></tr>
      <tr><th>ceiling</th><td class="mono">${esc(d.entryPoints.ceiling)}</td></tr>
    </table>
  </div>
</section>

<section class="block">
  <h2>Topologies — which shape fires for which work</h2>
  <table class="wide">
    <tr><th>id</th><th>english</th><th>arabic</th><th>max hops</th><th>cost</th><th>human opt-in</th></tr>
    ${d.topologies.map((t) => `<tr><td class="mono">${esc(t.id)}</td><td>${esc(t.labelEn)}</td><td dir="rtl">${esc(t.labelAr)}</td><td>${t.maxHops}</td><td>${t.costMultiplier}×</td><td>${t.requiresHumanOptIn ? '<b class="danger">required</b>' : "—"}</td></tr>`).join("")}
  </table>
</section>

<section class="block">
  <h2>Invariants — enforced in code, not in prose</h2>
  <div class="grid">
  ${d.invariants.map((i) => `<div class="inv"><b>${esc(i.title)}</b><p>${esc(i.body)}</p><code>${esc(i.enforcedBy)}</code></div>`).join("")}
  </div>
</section>

<section class="block">
  <h2>Not built yet — read before promising anything</h2>
  <div class="grid">
  ${d.openQuestions.map((o) => `<div class="inv open"><p>${esc(o)}</p></div>`).join("")}
  </div>
</section>

<footer>
  Generated by <code>${esc(d.generatedBy)}</code> · machine-readable twin <code>docs/architecture/voac.json</code> · narrative <code>docs/VOAC-RUNTIME.md</code><br>
  Re-run the generator after any change under <code>src/lib/voac/</code> — a map that silently lies is worse than no map.
</footer>

<script>
const DATA = ${JSON.stringify({ nodes: d.nodes, roles: d.roles, skills: d.skills })};
const panel = document.getElementById('panel');
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function render(n){
  const role = DATA.roles.find(r => r.id === n.id);
  const skill = role ? DATA.skills.find(s => s.id === role.skillDocId) : null;
  let h = '<div class="ph"><h3>' + esc(n.label) + '</h3>';
  if (n.labelAr) h += '<div class="ar" dir="rtl">' + esc(n.labelAr) + '</div>';
  h += '</div>';
  if (n.file) h += '<div class="file">' + esc(n.file) + '</div>';
  h += '<p>' + esc(n.summary) + '</p>';
  if (role) {
    h += '<div class="lab">Role</div><table>'
      + '<tr><th>sector</th><td class="mono">' + esc(role.sector) + '</td></tr>'
      + '<tr><th>topology</th><td class="mono">' + esc(role.defaultTopology) + '</td></tr>'
      + '<tr><th>tools</th><td>' + esc(role.tools.join(', ') || 'none') + '</td></tr>'
      + '</table>';
  }
  if (skill) {
    h += '<div class="lab">Skill document</div><table>'
      + '<tr><th>version</th><td class="mono">' + esc(skill.version) + '</td></tr>'
      + '<tr><th>size</th><td>' + skill.chars + ' chars</td></tr>'
      + '<tr><th>hard limits</th><td>' + skill.hardLimits + '</td></tr>'
      + '</table>';
  }
  if (n.invariants && n.invariants.length) {
    h += '<div class="lab">Invariants</div><ul>' + n.invariants.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>';
  }
  panel.innerHTML = h;
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function select(g){
  document.querySelectorAll('#diagram .n').forEach(x => x.classList.remove('sel'));
  g.classList.add('sel');
  const n = DATA.nodes.find(x => x.id === g.dataset.id);
  if (n) render(n);
}
document.querySelectorAll('#diagram .n').forEach(g => {
  g.addEventListener('click', () => select(g));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g); } });
});
</script>
</body>
</html>
`;
}

const CSS = `
:root{
  --bg:#080f0d; --panel:#0e1a17; --panel2:#132420; --line:#1d332c;
  --ink:#e9f1ed; --dim:#93aaa1; --faint:#5f7a70;
  --emerald:#2fb98a; --gold:#d9a441; --coral:#e0714a;
  --mono:ui-monospace,'JetBrains Mono',SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.6 ui-sans-serif,system-ui,'Segoe UI',sans-serif;
  -webkit-font-smoothing:antialiased}
header{padding:34px 34px 24px;border-bottom:1px solid var(--line);max-width:1400px}
.eyebrow{font:600 11px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--emerald);margin-bottom:12px}
h1{margin:0;font-size:27px;font-weight:600;letter-spacing:-.01em}
h1 .dim{color:var(--faint);font-weight:400;font-size:20px}
.sub{margin:10px 0 0;color:var(--dim);max-width:82ch;font-size:14.5px}
.stats{display:flex;flex-wrap:wrap;gap:26px;margin:22px 0 4px}
.stat b{display:block;font-size:23px;font-weight:600;color:var(--emerald);line-height:1.1}
.stat span{font:11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.warn{margin-top:20px;display:block;max-width:82ch;border:1px solid var(--line);
  border-left:3px solid var(--gold);background:var(--panel);padding:10px 14px;
  font-size:13px;color:var(--dim);border-radius:0 6px 6px 0}
.warn b{color:var(--gold)}
code{font-family:var(--mono);font-size:.88em;color:var(--emerald)}
.diagram-wrap{padding:26px 34px 10px}
.legend{display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-bottom:16px;
  font:11.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;vertical-align:-1px}
.legend .tip{margin-left:auto;color:var(--faint);text-transform:none;letter-spacing:.04em}
.scroller{overflow-x:auto;padding-bottom:8px;border:1px solid var(--line);border-radius:10px;background:#0a1512}
#diagram{display:block;min-width:1354px;max-width:none}
.colhead{font:600 11px var(--mono);letter-spacing:.16em}
.colhint{font:11px var(--mono);fill:#4e6a60}
.nlabel{font:600 13.5px ui-sans-serif,system-ui,sans-serif}
.nlabel.mono{font:600 12.5px var(--mono)}
.nsub{font:11px var(--mono);letter-spacing:.05em}
#diagram .n{cursor:pointer}
#diagram .n rect{transition:filter .15s,stroke-width .15s}
#diagram .n:hover rect{filter:brightness(1.35)}
#diagram .n:focus{outline:none}
#diagram .n:focus rect,#diagram .n.sel rect{stroke:var(--gold);stroke-width:2.4}
.edges path{stroke-width:1.5}
.e-brok{stroke:#2f6b58}
.e-bus{stroke:#3d7a64;stroke-width:1.2}
.e-run{stroke:#53659a}
.e-chain{stroke:#53659a;stroke-dasharray:3 3}
.e-gate{stroke:#8a4a34}
.e-loop{stroke:#a9832f;stroke-dasharray:6 4}
.edgelabel{font:11.5px var(--mono);letter-spacing:.04em}
.detail-wrap{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;padding:20px 34px 8px;align-items:start}
@media(max-width:900px){.detail-wrap{grid-template-columns:1fr}#diagram{min-width:1326px}}
#panel,.entry{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 20px;min-height:150px}
#panel h3{margin:0;font-size:17px}
#panel .ar{color:var(--dim);font-size:14px;margin-top:3px}
#panel .file{font-family:var(--mono);font-size:12px;color:var(--emerald);word-break:break-all;margin:10px 0}
#panel p{color:var(--dim);font-size:13.5px}
#panel ul{padding-left:18px;margin:8px 0 0}
#panel li{color:var(--dim);font-size:13px;margin-bottom:6px}
.lab{font:600 10.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:18px 0 7px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--faint);font:500 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;width:1%}
td.mono{font-family:var(--mono);font-size:12px;color:#a8d8c6}
table.wide th{width:auto}
.danger{color:var(--coral)}
section.block{padding:22px 34px 6px;max-width:1400px}
section.block h2{font:600 11px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}
.inv{border:1px solid var(--line);border-left:3px solid var(--emerald);background:var(--panel);
  padding:13px 15px;border-radius:0 7px 7px 0}
.inv b{font-size:14px}
.inv p{margin:5px 0 8px;color:var(--dim);font-size:13px}
.inv code{font-size:11.5px;color:var(--gold)}
.inv.open{border-left-color:var(--coral)}
.inv.open p{margin-bottom:0}
footer{border-top:1px solid var(--line);margin-top:28px;padding:20px 34px 34px;color:var(--faint);font-size:12.5px;line-height:1.8}
`;

// ------------------------------------------------------------------ write ---

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "voac.json"), JSON.stringify(doc, null, 2), "utf8");
writeFileSync(join(OUT_DIR, "voac.html"), html(doc), "utf8");

console.log("[voac-map] docs/architecture/voac.json  (" + roles.length + " roles, " + nodes.length + " nodes, " + edges.length + " edges)");
console.log("[voac-map] docs/architecture/voac.html");
console.log("[voac-map] " + topologies.length + " topologies, " + models.length + " models, " + skills.length + " skill docs, " + testCount + " unit tests");
