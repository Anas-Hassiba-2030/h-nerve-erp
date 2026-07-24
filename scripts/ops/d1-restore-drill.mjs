// scripts/ops/d1-restore-drill.mjs — prove a D1 dump is actually restorable.
//
// The point of gap #4 is NOT "we have dump files". A backup nobody has ever
// restored is a guess. This script performs the restore for real — into a
// throwaway local SQLite database, never against production — and then
// verifies the restored row counts match what the dump claims.
//
// It deliberately runs the dump through scripts/build/d1-sort-dump.mjs first,
// because that is the exact path a real recovery takes: D1 validates FOREIGN
// KEY targets at CREATE TABLE time, so an unsorted dump aborts partway with
// "no such table". Drilling the sorted dump is what makes the drill honest —
// if the topo-sort can't order this schema, we find out now and not during an
// outage.
//
// Usage:
//   node scripts/ops/d1-restore-drill.mjs backups/d1-<db>-<stamp>.sql
//   node scripts/ops/d1-restore-drill.mjs <dump.sql> --keep   # keep the restored db
//
// Exit code 0 means: every statement applied, and every table's row count
// matches the dump. Anything else is a failed drill.
//
// SAFETY: this script only ever writes to a temp file it creates itself. It
// opens no remote connection and takes no database credentials.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const [dumpPath, ...rest] = process.argv.slice(2);
const KEEP = rest.includes("--keep");

if (!dumpPath) {
  console.error("usage: node scripts/ops/d1-restore-drill.mjs <dump.sql> [--keep]");
  process.exit(1);
}
if (!fs.existsSync(dumpPath)) {
  console.error(`✖ no such dump: ${dumpPath}`);
  process.exit(1);
}

/** Count INSERT statements per table — the dump's own claim about its contents. */
function claimedRows(sql) {
  const counts = new Map();
  for (const m of sql.matchAll(/INSERT INTO\s+["'`[]?([A-Za-z0-9_]+)/gi)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return counts;
}

/**
 * Split a sqlite iterdump into statements.
 *
 * Mirrors the assumption d1-sort-dump.mjs already relies on: iterdump
 * terminates every statement with ";\n" and never emits a multi-line string
 * literal (Arabic text and JSON are escaped onto one line).
 */
function statements(sql) {
  return sql
    .split(/;\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(BEGIN|COMMIT|PRAGMA)\b/i.test(s));
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hnerve-restore-"));
  const sortedPath = path.join(tmpDir, "sorted.sql");
  const dbPath = path.join(tmpDir, "restored.db");

  console.log(`→ drill workspace: ${tmpDir}`);

  // 1. Topo-sort exactly as a real D1 import would require.
  console.log("→ topo-sorting dump (D1 validates FK targets at CREATE TABLE time)");
  const sort = spawnSync(process.execPath, ["scripts/build/d1-sort-dump.mjs", dumpPath, sortedPath], {
    stdio: "inherit",
  });
  if (sort.status !== 0) {
    console.error("✖ topo-sort failed — this dump would NOT import into D1");
    process.exit(1);
  }

  // 2. Apply it to a fresh database.
  const sql = fs.readFileSync(sortedPath, "utf8");
  const stmts = statements(sql);
  console.log(`→ applying ${stmts.length} statements to a throwaway SQLite db`);

  const db = new DatabaseSync(dbPath);
  let applied = 0;
  for (const stmt of stmts) {
    try {
      db.exec(stmt + ";");
      applied += 1;
    } catch (e) {
      console.error(`✖ statement ${applied + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`  ${stmt.slice(0, 200)}`);
      process.exit(1);
    }
  }
  console.log(`✔ all ${applied} statements applied cleanly`);

  // 3. Verify: what the dump claimed vs what the restored database holds.
  const claimed = claimedRows(fs.readFileSync(dumpPath, "utf8"));
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => String(r.name));

  let mismatches = 0;
  let totalRows = 0;
  const rows = [];
  for (const table of tables) {
    const n = Number(db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n);
    totalRows += n;
    const want = claimed.get(table) ?? 0;
    // An iterdump writes one INSERT per row, so the counts must agree exactly.
    const ok = n === want;
    if (!ok) mismatches += 1;
    if (n > 0 || want > 0) rows.push({ table, restored: n, claimed: want, ok });
  }

  db.close();

  console.log(`\n  ${"table".padEnd(30)} ${"restored".padStart(9)} ${"in dump".padStart(9)}`);
  for (const r of rows.sort((a, b) => b.restored - a.restored)) {
    console.log(
      `  ${r.ok ? "✔" : "✖"} ${r.table.padEnd(28)} ${String(r.restored).padStart(9)} ${String(r.claimed).padStart(9)}`,
    );
  }

  if (!KEEP) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    console.log(`\n(kept: ${dbPath})`);
  }

  console.log(`\n${tables.length} tables · ${totalRows} rows restored`);
  if (mismatches > 0) {
    console.error(`✖ DRILL FAILED — ${mismatches} table(s) restored a different row count than the dump claims`);
    process.exit(1);
  }
  if (totalRows === 0) {
    console.error("✖ DRILL FAILED — restored database is empty");
    process.exit(1);
  }
  console.log("✔ DRILL PASSED — this dump restores cleanly and completely");
}

main();
