-- Council save + provenance. `pinned` lets an operator bookmark a session so it
-- surfaces first in the archive. `sourcesJson` persists the evidence base the
-- council reasoned over (live metrics, documents consulted, in-scope entities)
-- so the saved transcript can show the proofs behind the decision. Both are
-- additive with defaults, so existing rows are unaffected.
ALTER TABLE "CouncilSession" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CouncilSession" ADD COLUMN "sourcesJson" TEXT NOT NULL DEFAULT '[]';
