// scripts/ops/d1-backup.mjs — export the production D1 database to a dump file.
//
// Gap #4 of the 100/100 readiness list. Production data (real Hourani
// bookings, the live ledger) had no seatbelt: schema ships via `prisma db push`
// + a fresh D1 import, so one bad import or one wrong delete had no rehearsed
// way back.
//
// This script only READS production. It never writes to, migrates, or mutates
// the remote database — `wrangler d1 export` issues a dump and nothing else.
//
// Usage:
//   node scripts/ops/d1-backup.mjs                        # → backups/d1-<db>-<stamp>.sql
//   node scripts/ops/d1-backup.mjs --out-dir tmp          # custom directory
//   node scripts/ops/d1-backup.mjs --local                # dump wrangler's LOCAL D1 state
//   node scripts/ops/d1-backup.mjs --from-sqlite prisma/dev.db   # dump any SQLite file
//
// Requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID for --remote (the
// default). The daily run lives in .github/workflows/d1-backup.yml, which
// already has both as repository secrets.
//
// A dump that exists is not a backup. `d1-restore-drill.mjs` is what proves it
// is restorable — run it on the artifact, not just on faith.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT_DIR = value("out-dir", "backups");
const LOCAL = flag("local");
const FROM_SQLITE = value("from-sqlite", null);

/**
 * Render a SQLite file as an iterdump-compatible .sql text.
 *
 * Why this exists: `wrangler d1 export` can only reach a D1 database (remote,
 * or wrangler's own local state). The seeded development database is a plain
 * SQLite file (prisma/dev.db), and being able to snapshot it matters twice —
 * it is the sane thing to do before a risky local migration, and it is what
 * makes the restore drill meaningful on a machine with no production
 * credentials.
 *
 * Output format matches what d1-sort-dump.mjs and the drill expect: one
 * statement per line, terminated by ";\n", one INSERT per row.
 */
function dumpSqliteFile(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const out = [];

  const objects = db
    .prepare(
      "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name",
    )
    .all();

  const quote = (v) => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
    if (typeof v === "bigint") return String(v);
    if (v instanceof Uint8Array) {
      return "X'" + Buffer.from(v).toString("hex") + "'";
    }
    // Escape single quotes, and keep the statement on ONE line — the dump
    // format every downstream consumer here assumes.
    return "'" + String(v).replace(/'/g, "''").replace(/\r?\n/g, "\\n") + "'";
  };

  for (const obj of objects) {
    if (obj.type === "table") {
      out.push(obj.sql + ";");
    }
  }
  for (const obj of objects) {
    if (obj.type !== "table") continue;
    const rows = db.prepare(`SELECT * FROM "${obj.name}"`).all();
    for (const row of rows) {
      const cols = Object.keys(row).map((c) => `"${c}"`).join(",");
      const vals = Object.values(row).map(quote).join(",");
      out.push(`INSERT INTO "${obj.name}" (${cols}) VALUES (${vals});`);
    }
  }
  // Indexes and triggers last — they may reference tables created above.
  for (const obj of objects) {
    if (obj.type !== "table") out.push(obj.sql + ";");
  }

  db.close();
  return out.join("\n") + "\n";
}

/** Read the D1 database name straight from wrangler.jsonc — one source of truth. */
function databaseName() {
  const raw = fs.readFileSync("wrangler.jsonc", "utf8");
  // wrangler.jsonc is JSON-with-comments; strip line comments before parsing.
  const stripped = raw.replace(/^\s*\/\/.*$/gm, "");
  const config = JSON.parse(stripped);
  const db = config.d1_databases?.[0]?.database_name;
  if (!db) throw new Error("no d1_databases[0].database_name in wrangler.jsonc");
  return db;
}

/** A filesystem-safe UTC stamp: 2026-07-24T21-15-03Z */
function stamp() {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "Z");
}

/**
 * Summarize a dump so a human (and the workflow log) can tell at a glance
 * whether it looks like a real database or an empty shell.
 */
function summarize(sql) {
  const tables = [...sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["'`[]?([A-Za-z0-9_]+)/gi)].map(
    (m) => m[1],
  );
  const insertsByTable = new Map();
  for (const m of sql.matchAll(/INSERT INTO\s+["'`[]?([A-Za-z0-9_]+)/gi)) {
    insertsByTable.set(m[1], (insertsByTable.get(m[1]) ?? 0) + 1);
  }
  const totalInserts = [...insertsByTable.values()].reduce((a, b) => a + b, 0);
  return { tables, insertsByTable, totalInserts };
}

function main() {
  const db = FROM_SQLITE ? path.basename(FROM_SQLITE, path.extname(FROM_SQLITE)) : databaseName();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const kind = FROM_SQLITE ? "file-" : LOCAL ? "local-" : "";
  const outFile = path.join(OUT_DIR, `d1-${db}-${kind}${stamp()}.sql`);

  if (FROM_SQLITE) {
    if (!fs.existsSync(FROM_SQLITE)) {
      console.error(`✖ no such SQLite file: ${FROM_SQLITE}`);
      process.exit(1);
    }
    console.log(`→ dumping SQLite file ${FROM_SQLITE} → ${outFile}`);
    fs.writeFileSync(outFile, dumpSqliteFile(FROM_SQLITE));
  } else {
    console.log(`→ exporting ${LOCAL ? "LOCAL" : "REMOTE"} D1 "${db}" → ${outFile}`);
    // Resolve the launcher explicitly rather than going through a shell:
    // shell:true concatenates arguments unescaped (Node DEP0190).
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const res = spawnSync(
      npx,
      ["wrangler", "d1", "export", db, LOCAL ? "--local" : "--remote", "--output", outFile],
      { stdio: "inherit" },
    );
    if (res.status !== 0) {
      console.error(`✖ wrangler d1 export failed (exit ${res.status})`);
      process.exit(res.status ?? 1);
    }
  }

  // An export that "succeeds" but writes nothing is the failure mode that
  // silently turns a backup schedule into theatre. Fail loudly instead.
  if (!fs.existsSync(outFile)) {
    console.error("✖ export reported success but produced no file");
    process.exit(1);
  }
  const sql = fs.readFileSync(outFile, "utf8");
  const bytes = Buffer.byteLength(sql);
  if (bytes === 0) {
    console.error("✖ dump is empty");
    process.exit(1);
  }

  const { tables, insertsByTable, totalInserts } = summarize(sql);
  if (tables.length === 0) {
    console.error("✖ dump contains no CREATE TABLE statements — not a usable backup");
    process.exit(1);
  }

  const meta = {
    database: db,
    source: FROM_SQLITE ? `file:${FROM_SQLITE}` : LOCAL ? "d1:local" : "d1:remote",
    remote: !LOCAL && !FROM_SQLITE,
    takenAt: new Date().toISOString(),
    bytes,
    tableCount: tables.length,
    insertStatements: totalInserts,
    rowsByTable: Object.fromEntries([...insertsByTable].sort((a, b) => b[1] - a[1])),
  };
  fs.writeFileSync(outFile + ".meta.json", JSON.stringify(meta, null, 2));

  console.log(`✔ ${(bytes / 1024).toFixed(1)} KiB · ${tables.length} tables · ${totalInserts} INSERT statements`);
  const top = [...insertsByTable].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [table, n] of top) console.log(`    ${table.padEnd(28)} ${n}`);
  console.log(`\nNext: node scripts/ops/d1-restore-drill.mjs ${outFile}`);
}

main();
