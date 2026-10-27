// scripts/reindex-embeddings.ts — re-embed every stored Memory with the CURRENT
// embedder (the local MiniLM model, 384 dims) after the OpenAI/Gemini/Voyage
// embedders were removed. Old vectors (1536-dim API or 256-dim hash) are skipped
// by memory.live.ts recall() because their length no longer matches the query
// vector, so until this runs those memories simply do not surface.
//
// There is no pgvector column and no SQL migration: vectors live in
// Memory.vectorJson (a JSON text column, SQLite/D1). Nothing in the schema changes.
//
// DRY RUN BY DEFAULT. Nothing is written without --apply.
//
//   npx tsx --tsconfig tsconfig.scripts.json scripts/reindex-embeddings.ts            # report only
//   npx tsx --tsconfig tsconfig.scripts.json scripts/reindex-embeddings.ts --apply    # write
//
// Needs: DATABASE_URL=file:<path to a SQLite db> (see scripts/_prisma.ts) and a
// Node runtime that can run @huggingface/transformers (first run downloads the
// model into the HF cache). It REFUSES to write if the model cannot load, so a
// failed load can never overwrite good vectors with hash vectors.
//
// ⚠️ Production D1 + Cloudflare Worker: a Worker cannot run the model, so it keeps
// writing 256-dim hash vectors. Re-indexing a D1 database with 384-dim vectors
// only makes sense if that database is served by a Node deployment. Run this
// against a copy first; never point --apply at a DB a Worker also writes to.

import { makePrismaClient } from "./_prisma";
import { getEmbedder } from "../src/lib/brain/embeddings";
import { memoryCorpus } from "../src/lib/brain/memory.corpus";

const APPLY = process.argv.includes("--apply");
const BATCH = 32;

function dimOf(json: string): number {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.length : -1; // -1 = legacy sparse (v1)
  } catch {
    return 0;
  }
}

async function main() {
  process.env.EMBED_BACKEND ??= "transformers";
  const prisma = makePrismaClient();
  const rows = await prisma.memory.findMany({
    select: {
      id: true, headlineEn: true, bodyEn: true, lessonEn: true,
      tagsJson: true, module: true, vectorJson: true,
    },
  });
  console.log(`memories: ${rows.length}   mode: ${APPLY ? "APPLY" : "dry run"}`);

  const embedder = getEmbedder();
  // Probe once: refuse to continue unless the real model produced the vector.
  const [probe] = await embedder.embed(["probe"]);
  const dim = probe?.length ?? 0;
  console.log(`embedder: ${embedder.name}   dim: ${dim}`);
  if (embedder.name === "local-hash-v1" || dim !== 384) {
    console.error("Refusing to run: the local model did not load (got the hash fallback). Nothing written.");
    process.exitCode = 1;
    return;
  }

  const stale = rows.filter((r) => dimOf(r.vectorJson) !== dim);
  console.log(`already ${dim}-dim: ${rows.length - stale.length}   to re-embed: ${stale.length}`);
  if (!APPLY || stale.length === 0) {
    if (!APPLY && stale.length > 0) console.log("Dry run — re-run with --apply to write.");
    return;
  }

  let done = 0;
  for (let i = 0; i < stale.length; i += BATCH) {
    const part = stale.slice(i, i + BATCH);
    const corpora = part.map((r) => {
      let tags: string[] = [];
      try { tags = JSON.parse(r.tagsJson); } catch { /* keep [] */ }
      return memoryCorpus({
        headlineEn: r.headlineEn, bodyEn: r.bodyEn, lessonEn: r.lessonEn,
        tags: Array.isArray(tags) ? tags : [], module: r.module,
      });
    });
    const vecs = await embedder.embed(corpora);
    if (vecs.length !== part.length || vecs.some((v) => v.length !== dim)) {
      console.error(`batch at ${i}: unexpected vector shape — stopping. ${done} rows written.`);
      process.exitCode = 1;
      return;
    }
    await prisma.$transaction(
      part.map((r, j) =>
        prisma.memory.update({
          where: { id: r.id },
          data: { vectorJson: JSON.stringify(vecs[j]), vectorVersion: 2 },
        }),
      ),
    );
    done += part.length;
    console.log(`re-embedded ${done}/${stale.length}`);
  }
  console.log("done.");
}

main()
  .catch((e) => {
    console.error("reindex failed:", String((e as Error)?.message ?? e));
    process.exitCode = 1;
  });
