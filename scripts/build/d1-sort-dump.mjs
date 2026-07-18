// Reorder a sqlite iterdump for Cloudflare D1 import.
//
// D1 (unlike vanilla SQLite) validates FOREIGN KEY target tables at CREATE
// TABLE time, so an alphabetical dump ("AIInsight" before "Company") aborts
// with "no such table". Topologically sort CREATE TABLE statements by their
// REFERENCES, emit INSERTs in the same order (parents before children), and
// push indexes/triggers to the end. Self-references are ignored (the table
// exists by the end of its own CREATE); on a dependency cycle the remaining
// tables are emitted in original order (D1 will then tell us loudly).
//
// Usage: node scripts/build/d1-sort-dump.mjs <in.sql> <out.sql>

import fs from "node:fs";

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: node d1-sort-dump.mjs <in.sql> <out.sql>");
  process.exit(1);
}

const raw = fs.readFileSync(inFile, "utf8");

// iterdump terminates every statement with ";\n" and never splits a statement
// across lines in a way that ends with ";" mid-string (string literals with
// ';\n' inside would be pathological for this data — all JSON/Arabic text is
// single-line escaped by iterdump).
const statements = raw.split(/;\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => s + ";");

const creates = new Map(); // table -> statement
const deps = new Map(); // table -> Set(parent tables)
const inserts = new Map(); // table -> [statements]
const head = []; // pragmas
const tail = []; // indexes, triggers, everything else

for (const st of statements) {
  let m;
  if ((m = st.match(/^CREATE TABLE "([^"]+)"/))) {
    const table = m[1];
    creates.set(table, st);
    const refs = new Set(
      [...st.matchAll(/REFERENCES "([^"]+)"/g)].map((r) => r[1]).filter((t) => t !== table),
    );
    deps.set(table, refs);
  } else if ((m = st.match(/^INSERT INTO "([^"]+)"/))) {
    if (!inserts.has(m[1])) inserts.set(m[1], []);
    inserts.get(m[1]).push(st);
  } else if (/^PRAGMA/i.test(st)) {
    head.push(st);
  } else {
    tail.push(st);
  }
}

// Kahn's algorithm.
const order = [];
const remaining = new Set(creates.keys());
while (remaining.size) {
  const ready = [...remaining].filter((t) => [...deps.get(t)].every((d) => !remaining.has(d)));
  if (!ready.length) {
    console.error(`[d1-sort] dependency cycle among: ${[...remaining].join(", ")} — emitting in original order`);
    order.push(...remaining);
    break;
  }
  ready.sort();
  for (const t of ready) {
    order.push(t);
    remaining.delete(t);
  }
}

const out = [
  ...head,
  ...order.map((t) => creates.get(t)),
  ...order.flatMap((t) => inserts.get(t) ?? []),
  ...tail,
].join("\n");

fs.writeFileSync(outFile, out + "\n");
console.log(
  `[d1-sort] ${creates.size} tables topo-sorted, ${[...inserts.values()].reduce((a, b) => a + b.length, 0)} inserts, ${tail.length} tail statements → ${outFile}`,
);
