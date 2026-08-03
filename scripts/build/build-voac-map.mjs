// scripts/build/build-voac-map.mjs
//
// Emits the VOAC architecture as TWO artifacts from ONE source of truth:
//
//   docs/architecture/voac.json  — for the next agent. Machine-readable map of
//                                  layers, nodes, edges, roles, topologies,
//                                  models and invariants.
//   docs/architecture/voac.html  — for a human. Self-contained interactive map,
//                                  no CDN, no build step, opens from disk.
//
// WHY GENERATED RATHER THAN HAND-WRITTEN: a hand-drawn architecture diagram is
// accurate exactly once. This reads the real registry, the real topology table,
// the real Prisma models and the real skill documents, so a role added in
// roles.ts appears on the map on the next run — and a map that silently lies is
// worse than no map, because people stop checking it.
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

/** Pull the role registry out of roles.ts. */
function extractRoles() {
  const src = read("src/lib/voac/roles.ts");
  const body = src.slice(src.indexOf("export const VOAC_ROLES"));
  const roles = [];
  const blockRe = /\{\s*id:\s*(?:"([^"]+)"|(\w+))[\s\S]*?\}\s*,\s*(?=\{|\];)/g;
  let m;
  while ((m = blockRe.exec(body))) {
    const block = m[0];
    const pick = (key) => {
      const r = new RegExp(`${key}:\\s*"([^"]*)"`).exec(block);
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

/** Pull the topology table out of topology.ts. */
function extractTopologies() {
  const src = read("src/lib/voac/topology.ts");
  const body = src.slice(src.indexOf("export const TOPOLOGIES"));
  const out = [];
  const re = /(\w+):\s*\{\s*id:\s*"([^"]+)"[\s\S]*?labelEn:\s*"([^"]*)"[\s\S]*?labelAr:\s*"([^"]*)"[\s\S]*?maxHops:\s*(\d+)[\s\S]*?costMultiplier:\s*(\d+)[\s\S]*?requiresHumanOptIn:\s*(true|false)/g;
  let m;
  while ((m = re.exec(body))) {
    out.push({
      id: m[2],
      labelEn: m[3],
      labelAr: m[4],
      maxHops: Number(m[5]),
      costMultiplier: Number(m[6]),
      requiresHumanOptIn: m[7] === "true",
    });
  }
  return out;
}

/** Pull the models + field counts out of voac.prisma. */
function extractModels() {
  const src = read("prisma/schema/voac.prisma");
  const out = [];
  const re = /\/\/\/([\s\S]*?)\nmodel (\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(src))) {
    const doc = m[1].split("\n").map((l) => l.replace(/^\s*\/\/\/?\s?/, "").trim()).filter(Boolean).join(" ");
    const fields = m[3]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@") && !l.startsWith("///"));
    out.push({ name: m[2], summary: doc, fieldCount: fields.length });
  }
  return out;
}

/** Skill documents with their content hashes (= AgentRun.skillVersion). */
function extractSkills() {
  const dir = join(ROOT, "src/lib/voac/skills");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
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

// ------------------------------------------------------------------ model ---

const roles = extractRoles();
const topologies = extractTopologies();
const models = extractModels();
const skills = extractSkills();

const groupBroker = roles.find((r) => r.sector === "GROUP");
const companyRoles = roles.filter((r) => r.sector !== "GROUP");

const LAYERS = [
  { id: "group", label: "Group", labelAr: "المجموعة", hint: "The only supervisor" },
  { id: "roster", label: "Company rosters", labelAr: "فرق الشركات", hint: "Data, not an org layer" },
  { id: "substrate", label: "Substrate", labelAr: "الأساس", hint: "role → skill → run → step → score" },
  { id: "gate", label: "Human gate", labelAr: "بوابة القرار", hint: "Propose, never commit" },
  { id: "learn", label: "Offline learning", labelAr: "تعلّم خارج الخدمة", hint: "SkillOpt, in CI only" },
];

const nodes = [];
const edges = [];

nodes.push({
  id: "group-broker",
  layer: "group",
  kind: "supervisor",
  label: groupBroker?.labelEn ?? "Group Broker",
  labelAr: groupBroker?.labelAr ?? "وسيط المجموعة",
  file: "src/lib/voac/roles.ts",
  summary:
    "The ONLY supervisor. Holds the cross-company view and the standing to arbitrate between two companies' P&Ls — the one layer that has something its subordinates lack.",
  invariants: [
    "companyId is NULL — it belongs to the group, never to one company",
    `Runs \`${groupBroker?.defaultTopology ?? "parallel"}\`: two P&Ls means competing objectives`,
    "Must state a transfer-pricing basis before proposing an intercompany move",
    "Cannot propose perishables across a border",
  ],
});

for (const r of companyRoles) {
  nodes.push({
    id: r.id,
    layer: "roster",
    kind: "role",
    label: r.labelEn,
    labelAr: r.labelAr,
    sector: r.sector,
    file: `src/lib/voac/skills/${r.skillDocId}.md`,
    summary: `Sector ${r.sector}. Default topology \`${r.defaultTopology}\`. Tools: ${r.tools.join(", ") || "—"}.`,
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
  nodes.push({ id: `substrate:${id}`, layer: "substrate", kind: "substrate", label: id, summary, file });
  if (i > 0) edges.push({ from: `substrate:${SUBSTRATE[i - 1][0]}`, to: `substrate:${id}`, kind: "flows", label: "" });
});
for (const r of companyRoles) edges.push({ from: r.id, to: "substrate:role", kind: "runs-on", label: "" });
edges.push({ from: "group-broker", to: "substrate:role", kind: "runs-on", label: "" });

const GATE = [
  ["budget", "Proposal budget", "Hard cap per human per day. Ranks on expected value; reports everything it held back.", "src/lib/voac/budget.ts"],
  ["commit", "Human commits", "A named approver. Liability sits with whoever clicked.", "src/lib/voac/runStore.ts"],
  ["outcome", "Outcome recorded", "Realized value, 30–60 days later. The only non-circular signal in the system.", "prisma/schema/voac.prisma"],
];
GATE.forEach(([id, label, summary, file], i) => {
  nodes.push({ id: `gate:${id}`, layer: "gate", kind: "gate", label, summary, file });
  if (i > 0) edges.push({ from: `gate:${GATE[i - 1][0]}`.replace("gate:", "gate:"), to: `gate:${id}`, kind: "flows", label: "" });
});
edges.push({ from: "substrate:score", to: "gate:budget", kind: "flows", label: "" });

nodes.push({
  id: "skillopt",
  layer: "learn",
  kind: "offline",
  label: "SkillOpt (offline, CI only)",
  labelAr: "سكيل‑أوبت — خارج الخدمة",
  file: "scripts/build/build-voac-skills.mjs",
  summary:
    "Trains the markdown skill documents against recorded outcomes and ships a static best_skill.md. Python + long-running loop, so it can never run in the Worker — which is why runtime inference cost is unchanged.",
  invariants: [
    "Never runs at request time — zero extra inference calls",
    "At one client there is no held-out distribution: today this is a regression suite, NOT training",
    "Never train on self-assessed scores alone — that reward is circular",
  ],
});
edges.push({ from: "gate:outcome", to: "skillopt", kind: "trains", label: "trains on real outcomes" });
edges.push({ from: "skillopt", to: "substrate:skill.md", kind: "rewrites", label: "rewrites" });

const INVARIANTS = [
  {
    id: "one-supervisor",
    title: "Exactly one supervisor",
    body: "A supervisor over agents that share a company holds neither information nor authority its subordinates lack — a pass-through that costs a hop. Only the Group Broker qualifies.",
    enforcedBy: "src/lib/voac/roles.test.ts",
  },
  {
    id: "capped-proposals",
    title: "The proposal queue is capped",
    body: "An uncapped queue is either ignored or rubber-stamped, and rubber-stamping silently deletes the human gate. Precision is the product; recall is a liability.",
    enforcedBy: "src/lib/voac/budget.ts",
  },
  {
    id: "read-mostly",
    title: "Read-mostly",
    body: "The VOAC writes AgentProposal rows and nothing else. Domain mutations go through the ordinary server actions.",
    enforcedBy: "docs/VOAC-RUNTIME.md §9",
  },
  {
    id: "refusal-is-a-row",
    title: "A refusal is still a row",
    body: 'Refused runs are written with status "REFUSED" and a reason. "The agent declined" must be answerable from the ledger, not invisible.',
    enforcedBy: "src/lib/voac/runStore.ts",
  },
  {
    id: "terminal-is-terminal",
    title: "A finished run never reopens",
    body: "An audit trail that can be rewritten is not an audit trail.",
    enforcedBy: "src/lib/voac/runStore.ts",
  },
  {
    id: "two-keys",
    title: "Two keys: tenantId isolates, companyId organises",
    body: "An AgentStep's output quotes the tenant's own documents, so a scoping bug leaks source data — not merely metadata.",
    enforcedBy: "src/lib/tenancy/workspaceScope.ts",
  },
];

const OPEN = [
  "No LLM execution driver yet — wiring must reuse brain/orchestrator.ts and council.live.ts, not reimplement debate.",
  "No UI surface. The ledger has no screen yet.",
  "SkillOpt has no held-out distribution at one client; treat as regression suite until proposal volume and a second reviewer exist.",
  "The flagship cross-company flow is bounded by the hotels' purchasing cycle, which is not yet recorded anywhere.",
];

const doc = {
  $schema: "hnerve.voac.architecture/1",
  generatedBy: "scripts/build/build-voac-map.mjs",
  system: "H-Nerve ERP",
  component: "VOAC — Virtual Orchestration Agent Company (runtime)",
  notToBeConfusedWith: {
    name: "VAOC (build-time)",
    doc: "docs/VAOC.md",
    difference:
      "VAOC is the Claude Code subagent company that writes this repo. VOAC ships inside the product. Same primitive, different lifetime.",
  },
  docs: ["docs/VOAC-RUNTIME.md"],
  layers: LAYERS,
  nodes,
  edges,
  roles,
  topologies,
  models,
  skills,
  invariants: INVARIANTS,
  openQuestions: OPEN,
};

// ------------------------------------------------------------------- html ---

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function html(d) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>VOAC — Architecture &amp; Flows | H-Nerve</title>
<style>
  :root{
    --bg:#0a1210; --panel:#0f1b18; --panel-2:#132420; --line:#1e3a32;
    --ink:#e8f0ec; --ink-dim:#8fa89f; --ink-faint:#5f7a70;
    --emerald:#2fb98a; --gold:#d9a441; --coral:#e0714a; --violet:#8d7fe0;
    --mono:ui-monospace,'JetBrains Mono',SFMono-Regular,Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:14px/1.55 ui-sans-serif,system-ui,'Segoe UI',sans-serif;}
  header{padding:22px 26px 16px;border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:19px;letter-spacing:.02em;font-weight:600}
  h1 .dim{color:var(--ink-faint);font-weight:400}
  .sub{margin:6px 0 0;color:var(--ink-dim);font-size:13px;max-width:78ch}
  .warn{margin-top:10px;display:inline-block;border:1px solid var(--line);
    border-left:3px solid var(--gold);background:var(--panel);padding:7px 11px;
    font-size:12px;color:var(--ink-dim);border-radius:0 5px 5px 0}
  .warn b{color:var(--gold)}
  main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:0;align-items:start}
  @media(max-width:940px){main{grid-template-columns:1fr}#panel{position:static;border-left:0;border-top:1px solid var(--line)}}
  #map{padding:22px 26px 40px;overflow-x:auto}
  .layer{margin-bottom:26px}
  .layer-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
  .layer-head h2{margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);font-weight:600}
  .layer-head .hint{font-size:11.5px;color:var(--ink-faint);font-family:var(--mono)}
  .row{display:flex;flex-wrap:wrap;gap:10px}
  .node{position:relative;text-align:left;cursor:pointer;background:var(--panel);
    border:1px solid var(--line);border-radius:7px;padding:11px 13px;min-width:168px;
    color:var(--ink);font:inherit;transition:border-color .14s,background .14s,transform .14s}
  .node:hover{background:var(--panel-2);border-color:var(--emerald);transform:translateY(-1px)}
  .node.sel{border-color:var(--gold);background:var(--panel-2);box-shadow:0 0 0 1px var(--gold) inset}
  .node .t{font-weight:600;font-size:13px}
  .node .ar{font-size:12px;color:var(--ink-dim);margin-top:2px}
  .node .k{margin-top:7px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;
    text-transform:uppercase;color:var(--ink-faint)}
  .node[data-kind="supervisor"]{border-color:#3c5f52}
  .node[data-kind="supervisor"] .k{color:var(--emerald)}
  .node[data-kind="gate"] .k{color:var(--coral)}
  .node[data-kind="offline"] .k{color:var(--gold)}
  .node[data-kind="substrate"]{min-width:120px}
  .node[data-kind="substrate"] .t{font-family:var(--mono);font-size:12px}
  .flowline{color:var(--ink-faint);font-family:var(--mono);font-size:12px;margin:0 2px;align-self:center}
  #panel{position:sticky;top:0;height:100vh;overflow-y:auto;border-left:1px solid var(--line);
    background:var(--panel);padding:22px 20px 40px}
  #panel h3{margin:0 0 3px;font-size:15px}
  #panel .ar{color:var(--ink-dim);font-size:13px;margin-bottom:12px}
  #panel .file{font-family:var(--mono);font-size:11.5px;color:var(--emerald);
    word-break:break-all;margin-bottom:12px}
  #panel p{color:var(--ink-dim);font-size:13px}
  #panel ul{padding-left:16px;margin:8px 0 0}
  #panel li{color:var(--ink-dim);font-size:12.5px;margin-bottom:6px}
  #panel .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink-faint);margin:18px 0 6px}
  table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:6px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--ink-faint);font-weight:500;font-family:var(--mono);font-size:10.5px;
    letter-spacing:.1em;text-transform:uppercase}
  td.mono{font-family:var(--mono);color:var(--emerald)}
  section.block{padding:0 26px 34px}
  section.block h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--emerald);margin:0 0 10px}
  .inv{border:1px solid var(--line);border-left:3px solid var(--emerald);background:var(--panel);
    padding:11px 13px;border-radius:0 6px 6px 0;margin-bottom:9px}
  .inv b{font-size:13px}
  .inv p{margin:4px 0 0;color:var(--ink-dim);font-size:12.5px}
  .inv code{font-family:var(--mono);font-size:11px;color:var(--gold)}
  .open{border-left-color:var(--coral)}
  footer{border-top:1px solid var(--line);padding:16px 26px 30px;color:var(--ink-faint);font-size:11.5px}
  footer code{font-family:var(--mono);color:var(--ink-dim)}
</style>
</head>
<body>
<header>
  <h1>VOAC <span class="dim">— Architecture &amp; Flows</span></h1>
  <p class="sub">${esc(d.component)}. One Group Broker over per-company rosters, on a shared trace substrate. Agents propose; a named human commits.</p>
  <div class="warn"><b>VAOC ≠ VOAC.</b> ${esc(d.notToBeConfusedWith.difference)} See <code>${esc(d.notToBeConfusedWith.doc)}</code>.</div>
</header>

<main>
<div id="map">
${d.layers
  .map((L) => {
    const ns = d.nodes.filter((n) => n.layer === L.id);
    if (!ns.length) return "";
    const inline = L.id === "substrate" || L.id === "gate";
    const cards = ns
      .map(
        (n, i) =>
          (inline && i > 0 ? '<span class="flowline">→</span>' : "") +
          `<button class="node" data-id="${esc(n.id)}" data-kind="${esc(n.kind)}">
             <div class="t">${esc(n.label)}</div>
             ${n.labelAr ? `<div class="ar">${esc(n.labelAr)}</div>` : ""}
             <div class="k">${esc(n.sector ?? n.kind)}</div>
           </button>`,
      )
      .join("");
    return `<div class="layer">
      <div class="layer-head"><h2>${esc(L.label)}</h2><span class="hint">${esc(L.hint)}</span></div>
      <div class="row">${cards}</div>
    </div>`;
  })
  .join("")}
</div>

<aside id="panel">
  <div id="panel-body">
    <h3>Pick a node</h3>
    <p>Every box is generated from the real source — the role registry, the topology table, the Prisma models and the skill documents. If the code changes and this page does not, the generator was not re-run.</p>
    <div class="lab">Topologies</div>
    <table><tr><th>id</th><th>max hops</th><th>cost</th></tr>
    ${d.topologies.map((t) => `<tr><td class="mono">${esc(t.id)}</td><td>${t.maxHops}</td><td>${t.costMultiplier}×</td></tr>`).join("")}
    </table>
    <div class="lab">Models</div>
    <table><tr><th>model</th><th>fields</th></tr>
    ${d.models.map((m) => `<tr><td class="mono">${esc(m.name)}</td><td>${m.fieldCount}</td></tr>`).join("")}
    </table>
  </div>
</aside>
</main>

<section class="block">
  <h2>Invariants</h2>
  ${d.invariants.map((i) => `<div class="inv"><b>${esc(i.title)}</b><p>${esc(i.body)}</p><p><code>${esc(i.enforcedBy)}</code></p></div>`).join("")}
</section>

<section class="block">
  <h2>Not built yet — read before you promise anything</h2>
  ${d.openQuestions.map((o) => `<div class="inv open"><p>${esc(o)}</p></div>`).join("")}
</section>

<footer>
  Generated by <code>${esc(d.generatedBy)}</code> · machine-readable twin: <code>docs/architecture/voac.json</code> · narrative: <code>docs/VOAC-RUNTIME.md</code><br>
  ${d.roles.length} roles · ${d.topologies.length} topologies · ${d.models.length} models · ${d.skills.length} skill documents
</footer>

<script>
const DATA = ${JSON.stringify({ nodes: d.nodes, roles: d.roles, skills: d.skills })};
const body = document.getElementById('panel-body');
function render(n){
  const role = DATA.roles.find(r => r.id === n.id);
  const skill = role ? DATA.skills.find(s => s.id === role.skillDocId) : null;
  let h = '<h3>' + n.label + '</h3>';
  if (n.labelAr) h += '<div class="ar">' + n.labelAr + '</div>';
  if (n.file) h += '<div class="file">' + n.file + '</div>';
  h += '<p>' + n.summary + '</p>';
  if (role) {
    h += '<div class="lab">Role</div><table>'
      + '<tr><th>sector</th><td class="mono">' + role.sector + '</td></tr>'
      + '<tr><th>topology</th><td class="mono">' + role.defaultTopology + '</td></tr>'
      + '<tr><th>tools</th><td>' + (role.tools.join(', ') || '—') + '</td></tr>'
      + '</table>';
  }
  if (skill) {
    h += '<div class="lab">Skill document</div><table>'
      + '<tr><th>version</th><td class="mono">' + skill.version + '</td></tr>'
      + '<tr><th>size</th><td>' + skill.chars + ' chars</td></tr>'
      + '<tr><th>hard limits</th><td>' + skill.hardLimits + '</td></tr>'
      + '</table>';
  }
  if (n.invariants && n.invariants.length) {
    h += '<div class="lab">Invariants</div><ul>' + n.invariants.map(i => '<li>' + i + '</li>').join('') + '</ul>';
  }
  body.innerHTML = h;
}
document.querySelectorAll('.node').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.node').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    const n = DATA.nodes.find(x => x.id === btn.dataset.id);
    if (n) render(n);
  });
});
</script>
</body>
</html>
`;
}

// ------------------------------------------------------------------ write ---

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "voac.json"), JSON.stringify(doc, null, 2), "utf8");
writeFileSync(join(OUT_DIR, "voac.html"), html(doc), "utf8");

console.log(`[voac-map] docs/architecture/voac.json  (${roles.length} roles, ${nodes.length} nodes, ${edges.length} edges)`);
console.log(`[voac-map] docs/architecture/voac.html`);
console.log(`[voac-map] ${topologies.length} topologies, ${models.length} models, ${skills.length} skill docs`);
