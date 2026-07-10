# H-Nerve "Brain" — Single Source for NotebookLM (code + claims + audit)

owner: Anas Hasiba
last-updated: 2026-06-11

> ⚠️ **HISTORICAL SNAPSHOT — for NotebookLM only.** This file freezes the
> brain's code as it stood in early June 2026. The sections describing
> `lib/brain/Brain.ts` (A1, and the "no loop / no tool-calling" notes) are
> **historical**: `Brain.ts` was retired in **PR #240 (merged 2026-06-11)**.
> The brain today is tool-fronted — `src/lib/brain/tools/` (7 typed tools) +
> `src/lib/brain/orchestrator.ts` (LLM tool-loop, LIVE mode) + a stdio MCP
> server (`src/lib/brain/mcp/server.ts`); `converse.ts` routes LIVE questions
> through the tool-loop and answers single-shot only in STUB mode, and
> `/api/converse` now has per-user rate limiting + an LLM call cap. Current
> architecture: `src/lib/brain/README.md`.

**For Anas:** upload THIS one file to NotebookLM as a source. It contains (A) the
real source code of the brain's core, (B) the builder's plain-language claims, and
(C) the questions to ask NotebookLM. You do not need to upload any `.ts` files —
their real contents are pasted inside Section A below.

**Instruction to NotebookLM (read first):**
> You are a skeptical Principal AI Systems Auditor. **Section A is real source code
> — treat it as ground truth.** **Section B is the builder's claims — challenge
> them against Section A.** Answer the questions in **Section C** using only
> evidence from Section A. If code and claim disagree, the code wins. No flattery;
> plain language (Arabic or English).

---

# SECTION A — Ground truth (the actual code)

## A1. `lib/brain/Brain.ts` — the claimed "conductor" (HISTORICAL — file retired in PR #240, 2026-06-11)
> Audit focus: Does `makeBrain()` return a real object or a stub? Does `ask()`
> compose all subsystems, or route each question-type to just one or two?

```ts
// Brain.ts — the master orchestrator of the H-Nerve intelligence layer.
// "This is a SKELETON. Implementations land in their own files."

export type BrainQuestion =
  | { kind: "explain";  target: { entity: string; id: string } }
  | { kind: "simulate"; perturbation: { entity: string; id: string; field: string; to: any } }
  | { kind: "plan";     goal: string }
  | { kind: "council";  topic: string; subgraph?: string[] }
  | { kind: "recall";   situation: string }
  | { kind: "reflect";  window: "day" | "week" | "month" };

export class Brain {
  constructor(/* graph, simulator, council, narrator, planner, memory, feedback, meta */) {}

  async ask(ctx: BrainContext, q: BrainQuestion): Promise<BrainAnswer> {
    const t0 = Date.now();

    if (q.kind === "council") {
      const { council } = await import("./council.live");
      const { narrator } = await import("./narrator.claude");
      const session = await council().convene(q.topic, q.subgraph ?? []);
      const nar = await narrator().write({ register: "editorial", /* ... */ });
      return { /* summary, narrative, confidence: session.synthesis.confidence, ... */ };
    }

    if (q.kind === "explain") {
      const { narrator } = await import("./narrator.claude");           // <-- narrator ONLY
      const nar = await narrator().write({ register: "executive", /* ... */ });
      return { /* ..., confidence: 0.82  <-- HARD-CODED */ };
    }

    if (q.kind === "simulate") {
      const { causalGraph } = await import("./graph.prisma");
      const { simulateOnSnapshot } = await import("./simulator.bfs");
      const { narrator } = await import("./narrator.claude");
      // loads graph snapshot, propagates a perturbation, narrates. confidence: 0.75 (hard-coded)
    }

    if (q.kind === "recall") {
      const { memoryLake } = await import("./memory.live");
      // recall top-5 analogous memories, narrate.
    }

    if (q.kind === "plan") {
      const { narrator } = await import("./narrator.claude");           // <-- narrator ONLY
      // NOTE: does NOT call any planner. Just narrates the goal. confidence: 0.78 (hard-coded)
    }

    if (q.kind === "reflect") {
      const { computeIQ } = await import("./meta.reflector");
      // compute Brain IQ, narrate.
    }
  }
}

// Factory — the rest of the app calls this to "get a Brain":
export function makeBrain(): Brain {
  // Constructor args are no longer used — ask() routes via dynamic imports.
  // We pass typed STUBS here only to satisfy the constructor signature.
  const stub: any = new Proxy({}, { get: () => () => { throw new Error("unreachable stub"); } });
  return new Brain(stub, stub, stub, stub, stub, stub, stub, stub);   // <-- ALL STUBS
}
```
**Ground-truth notes:** `makeBrain()` returns a `Brain` whose 8 subsystems are
`Proxy` stubs. `ask()` works only because it `import()`s the `.live` modules
directly per question-kind. `explain` and `plan` call **only the narrator**;
`plan` never calls a planner. Several confidence values are hard-coded constants.

## A2. `lib/brain/converse.ts` — the path a user's chat question ACTUALLY takes
> Audit focus: Does this import `Brain.ts`? How many reasoning steps? Is it a loop
> or single-shot? Where is conversation state stored?

```ts
import { prisma } from "@/lib/db/db";
import { callLlm } from "./llm";
import { retrieveDocuments } from "./documents.retrieve";
import { retrieveGraphContext } from "./graphrag.live";
import { evaluateRetrieval } from "./crag";
import { sanitizeForPrompt } from "./ragGuard";
// NOTE: it does NOT import Brain.ts, council, simulator, planner, memory, or meta.

// Conversation memory = a plain in-process Map. Not a database. Not per-user.
const SESSIONS = new Map<string, ConverseSession>();
const MAX_TURNS_PER_SESSION = 24;

// Hand-assembled fact pack — fixed Prisma queries, NOT semantic search:
async function pullFacts(): Promise<FactPack> {
  const [insights, plans, integrations, hotelsAgg, bookings, dairyWeek, dairyExp, crops, farms]
    = await Promise.all([
      prisma.aIInsight.findMany({ where: { deletedAt: null, status: "OPEN" }, take: 6, /* ... */ }),
      prisma.plan.findMany({ where: { status: { in: ["DRAFT","ACTIVE"] } }, take: 4, /* ... */ }),
      prisma.integration.findMany({ take: 6, /* ... */ }),
      prisma.hotel.aggregate({ _sum: { totalRooms: true } }),
      prisma.booking.count({ /* active */ }),
      prisma.dairyBatch.count({ /* this week */ }),
      prisma.dairyBatch.count({ /* near expiry */ }),
      prisma.crop.count({ where: { status: "GROWING" } }),
      prisma.farm.count(),
    ]);
  return { insights, plans, integrations, hotels: {...}, dairy: {...}, farms: {...} };
}

// The stub generator: keyword-detect a topic, fill a bilingual template.
// (~220 lines of templated ar/en answers omitted — they run when there is NO LLM key.)
function stubAnswer(question, facts, locale) { /* detectTopic() -> templated 3 sentences */ }

// THE WHOLE PIPELINE for one question (single pass, no loop):
export async function ask(input: AskInput): Promise<AskResult> {
  const session = getOrCreate(input.sessionId, input.scope ?? "default");
  session.turns.push({ role: "user", text: input.question, ts: now });

  // 1) RETRIEVE — three sources in parallel:
  const [facts, docHits, graphCtx] = await Promise.all([
    pullFacts(),                                                  // structured (hand-picked)
    retrieveDocuments(input.question, { k: 3, minScore: 0.08 }),  // semantic doc search
    retrieveGraphContext(input.question, { k: 6, topSeeds: 3 }),  // Graph RAG (causal subgraph)
  ]);

  const stubResult = stubAnswer(input.question, facts, locale);

  // 2) GRADE retrieval (Corrective RAG): keep / hedge / drop:
  const crag = evaluateRetrieval(docHits);
  const usedDocs = crag.keep;

  // 3) GENERATE — call Claude with the facts + sanitized doc snippets + causal links;
  //    falls back to the stub text when there is no ANTHROPIC_API_KEY:
  const llm = await callLlm({
    system: "You are H-Nerve... answer in exactly 3 sentences... cite [c1] [c2]... never invent numbers.",
    user: input.question,
    context: {
      priorTurns: session.turns.slice(-MAX_TURNS_PER_SESSION),
      facts,
      documents: usedDocs.map(d => ({ snippet: sanitizeForPrompt(d.snippet.text, 240).text })), // 4) GUARD
      graph: graphCtx.links.length ? { links: graphCtx.links.slice(0,8) } : undefined,
    },
    maxTokens: 320, temperature: 0.5,
  }, () => stubResult.text);

  // 5) (stub mode only) append one real doc clause + one causal link so retrieval is visible.
  // 6) adjust confidence down if retrieval was "ambiguous".
  session.turns.push({ role: "brain", text: answerText, citations: allCitations, confidence, stub: llm.isStub });
  return { session, brainTurn };
}
```
**Ground-truth notes:** one retrieve → one grade → one generate. **No second
hop, no tool-calling, no self-correction loop.** It never writes a memory/episode
back. It never calls `Brain.ts`. State lives in an in-memory `Map`.
_(Historical: since PR #240, LIVE mode routes `ask()` → `askWithTools` →
`runToolLoop` in `orchestrator.ts`; the single-shot path above is now the
STUB-mode fallback only.)_

## A3. `app/api/converse/route.ts` — the HTTP door to the brain
> Audit focus: Is there input validation (zod)? Is there ANY rate limit or cost
> cap on this LLM endpoint? What happens on error?

```ts
import { ask } from "@/lib/brain/converse";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });   // auth: yes

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }

  const sessionId = String(body?.sessionId ?? "").trim();   // manual coercion — NO zod schema
  const question  = String(body?.question  ?? "").trim();
  if (!sessionId || !question) return NextResponse.json({ error: "..." }, { status: 400 });
  if (question.length > 800)   return NextResponse.json({ error: "question too long" }, { status: 413 });

  // NOTE: there is NO rate limiting and NO per-user/per-tenant cost cap here.
  // (The app's only rate limiter, lib/import/rateLimit.ts, is wired ONLY to the /login POST
  //  in middleware.ts, and middleware explicitly EXCLUDES /api/* via its matcher.)

  try {
    const result = await ask({ sessionId, question, scope, locale });
    return NextResponse.json({ brainTurn: result.brainTurn, sessionTurns: result.session.turns });
  } catch (e) {
    console.error("[converse] ask failed:", e);
    return NextResponse.json({ error: "brain_unavailable" }, { status: 500 });
  }
}
```

## A4. The other pieces (real files, described — not pasted; ask if you want them)
- `lib/brain/graphrag.ts` / `graphrag.live.ts` — Graph RAG: Personalized PageRank
  over a causal graph → relevant entities + signed cause→effect links. **Real, unit-tested.**
- `lib/brain/crag.ts` — grades retrieval Correct/Ambiguous/Incorrect. **Real, unit-tested.**
- `lib/brain/ragGuard.ts` — strips prompt-injection text from documents. **Real, unit-tested.**
- `lib/brain/embeddings.ts` — real embeddings when an API key is set (Gemini → OpenAI
  → Voyage); otherwise a **local hash fallback** (works, but rough). **Real, unit-tested.**
- `lib/brain/memory.live.ts`, `planner.live.ts`, `council.live.ts`, `meta.reflector.ts`
  — exist and produce deterministic output, but are **not composed** into the
  conversational path (A2).
- `app/api/brain/cron/route.ts` — the weekly "self-tuning" job. Per
  `docs/status/AUDIT-2026-06.md`, it is **NOT firing in production** (Railway has no cron).

---

# SECTION B — The builder's claims (CHALLENGE these against Section A)

1. **What it is:** "A reliable, well-guarded single-shot RAG answerer wearing the
   architecture of a brain. The *retrieval* is genuinely strong; the *brain*
   (composition, multi-step agency, learning loop) is mostly scaffolding."
2. **How it was built / what was used:** Next.js + Prisma + PostgreSQL; Claude API
   for generation; embeddings via Gemini `gemini-embedding-001`; retrieval stack =
   dense cosine + **Graph RAG (Personalized PageRank)** + **Corrective RAG (CRAG)**
   + **prompt-injection guard** + a RAG-quality eval; iron-session auth;
   multi-tenant isolation via Prisma middleware.
3. **Three-capability scoring (the builder's estimate):**
   - **Retrieval ≈ strong** — finds, grades, and grounds on real data with citations.
   - **Reasoning / agency ≈ weak** — single-shot; no loop, no tool-use.
   - **Learning ≈ off** — the self-tuning cron is not running in production.
4. **The builder's headline number was "~60% of a brain."** The builder also said a
   stricter judge that weights reasoning + learning more heavily would land much
   lower (closer to ~15–25%). **Decide your own number from Section A.**
5. **Known drift the builder admitted:** `docs/phases/READINESS.md` and
   `docs/phases/PITCH-WALKTHROUGH.md` used to say *"Brain.ask not yet wired / throws"* —
   proof that docs drift from code. _(Both docs were truth-synced in 2026-07,
   and `Brain.ts` itself was retired in PR #240; A1 above documents the retired
   file as a historical snapshot.)_

---

# SECTION C — Questions to answer (use Section A as evidence)

1. Trace the real path of one user question (from A3 → A2). List each step and tag
   it **REAL / STUB / ASPIRATIONAL**.
2. From A1: is the "conductor" `Brain.ts` actually conducting? Quote the lines that
   prove your answer.
3. Score each capability 0–100 with evidence: **Retrieval**, **Reasoning/agency**,
   **Learning**. 
4. Give a single **readiness %**, show the weighting math, and compare to the
   builder's "~60%". Explain any gap.
5. List the **3 things to fix first** to turn this from a search-answerer into an
   actual brain.

**Output:** Verdict (1 sentence) → the trace → the 3 scores (table) →
your readiness % vs ~60% → the 3 fixes. Plain language. No flattery.
