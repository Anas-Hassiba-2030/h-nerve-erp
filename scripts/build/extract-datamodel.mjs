// scripts/build/extract-datamodel.mjs
//
// Prisma 6's Rust-free client (engineType="client") no longer exposes
// `Prisma.dmmf` at runtime, which the /admin/db data browser
// (src/lib/db/db.introspect.ts) relied on to list every model + its fields.
//
// The generated client DOES embed a trimmed runtime data model
// (name / kind / type per field) as a `config.runtimeDataModel = JSON.parse("…")`
// literal inside client.ts. This build step lifts that literal out into a
// static JSON so db.introspect can import it purely (no DB, no client
// instantiation) — keeping its unit test DB-free and /admin/db working.
//
// Runs right after `prisma generate` (postinstall + build). Regenerating the
// client refreshes the source, so this JSON auto-updates on every schema change.
//
// NOTE: the embedded model is trimmed — it carries name/kind/type but NOT
// isId/isRequired/isList. db.introspect degrades those gracefully (idField is
// inferred from a field literally named "id"). Full-fidelity DMMF would need a
// build-time @prisma/internals getDMMF pass; tracked as a follow-up.

import fs from "node:fs";
import path from "node:path";

const clientPath = path.join("src", "generated", "prisma", "internal", "class.ts");
const outPath = path.join("src", "generated", "prisma", "datamodel.json");

const src = fs.readFileSync(clientPath, "utf8");

// Match `config.runtimeDataModel = JSON.parse("…escaped json…")`, honouring
// escaped quotes inside the string literal.
const m = src.match(/runtimeDataModel\s*=\s*(JSON\.parse\("(?:[^"\\]|\\.)*"\))/s);
if (!m) {
  console.error("[extract-datamodel] runtimeDataModel literal not found in", clientPath);
  process.exit(1);
}

// The captured group is `JSON.parse("…")` over our own generated file — safe to
// evaluate to recover the data-model object, then re-serialise as clean JSON.
// eslint-disable-next-line no-eval
const model = eval(m[1]);
fs.writeFileSync(outPath, JSON.stringify(model), "utf8");

const count = Object.keys(model.models ?? {}).length;
console.log(`[extract-datamodel] wrote ${outPath} (${count} models)`);
