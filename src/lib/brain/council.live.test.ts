// lib/brain/council.live.test.ts — Phase 3 multi-agent debate flow.
//
// LiveCouncil.convene() orchestrates: build context → persist a RUNNING
// session → run every specialist in parallel → run the Moderator → persist
// voices + synthesis in one transaction. replay() rehydrates a stored session
// and pulls the Moderator back out of the voices into `synthesis`.
//
// We mock every external collaborator — @/lib/db (Prisma), ./graph.prisma,
// ./agents (the roster + runAgent/runModerator), ./llm — so the test asserts
// the ORCHESTRATION, not the agents or the DB. No DB, no network.

import { vi, describe, it, expect, beforeEach } from "vitest";

const { prisma, runAgent, runModerator, llmEnabled, ROSTER } = vi.hoisted(() => ({
  // A two-member roster keeps the assertions readable.
  ROSTER: [{ id: "hospitality-expert" }, { id: "risk-officer" }],
  prisma: {
    company: { findMany: vi.fn() },
    hotel: { findMany: vi.fn() },
    dairyBatch: { findMany: vi.fn() },
    farm: { findMany: vi.fn() },
    aIInsight: { findMany: vi.fn() },
    supplyForecast: { findMany: vi.fn() },
    transaction: { findMany: vi.fn(), groupBy: vi.fn() },
    councilSession: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    councilVoice: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  runAgent: vi.fn(),
  runModerator: vi.fn(),
  llmEnabled: { value: false },
}));

vi.mock("@/lib/db/db", () => ({ prisma }));
vi.mock("./graph.prisma", () => ({ causalGraph: {} }));
vi.mock("./llm", () => ({
  llmConfig: () => ({ enabled: llmEnabled.value, model: llmEnabled.value ? "claude-sonnet-4-6" : null }),
}));

vi.mock("./agents", () => ({
  SPECIALIST_AGENTS: ROSTER,
  runAgent,
  runModerator,
}));

import { council } from "./council.live";

/** A specialist voice as runAgent would return it. */
function voice(agentId: string, position = "support"): any {
  return {
    agentId,
    speakerLabel: { ar: `صوت-${agentId}`, en: agentId },
    position,
    thesis: `${agentId} thesis.`,
    evidence: [{ ref: "n1", weight: 0.5, label: "node 1" }],
  };
}

const MODERATION = {
  recommendation: "Proceed with conditions.",
  confidence: 0.78,
  dissentNote: "Risk Officer dissents.",
  speakerLabel: { ar: "المُيَسّر", en: "Moderator" },
};

/** Wire the happy-path collaborators. */
function wireHappy() {
  for (const m of [
    prisma.company, prisma.hotel, prisma.dairyBatch, prisma.farm,
    prisma.aIInsight, prisma.supplyForecast, prisma.transaction,
  ]) {
    m.findMany.mockResolvedValue([]);
  }
  // Revenue/expense are now summed via groupBy (no row load) — empty = 0/0.
  prisma.transaction.groupBy.mockResolvedValue([]);
  prisma.councilSession.create.mockResolvedValue({
    id: "sess-1",
    ranAt: new Date(Date.UTC(2026, 4, 29)),
  });
  prisma.councilSession.update.mockResolvedValue({});
  prisma.councilVoice.create.mockImplementation((arg: unknown) => arg);
  // $transaction takes an array of (already-issued) ops; just resolve it.
  prisma.$transaction.mockImplementation((ops: unknown[]) => Promise.resolve(ops));
  runAgent.mockImplementation((agent: { id: string }) =>
    Promise.resolve(voice(agent.id)),
  );
  runModerator.mockResolvedValue(MODERATION);
}

beforeEach(() => {
  vi.clearAllMocks();
  llmEnabled.value = false;
});

describe("LiveCouncil.convene — orchestration", () => {
  it("persists a RUNNING session up front, then runs every specialist", async () => {
    wireHappy();
    await council().convene("Should we expand Arena?", ["n1", "n2"]);

    expect(prisma.councilSession.create).toHaveBeenCalledTimes(1);
    const created = prisma.councilSession.create.mock.calls[0][0].data;
    expect(created.topic).toBe("Should we expand Arena?");
    expect(created.status).toBe("RUNNING");
    expect(JSON.parse(created.contextRefs)).toEqual(["n1", "n2"]);
    expect(created.usedLiveLlm).toBe(false);

    // Every roster member ran exactly once.
    expect(runAgent).toHaveBeenCalledTimes(ROSTER.length);
    const ranIds = runAgent.mock.calls.map((c) => c[0].id).sort();
    expect(ranIds).toEqual(["hospitality-expert", "risk-officer"]);
  });

  it("feeds the specialists' voices to the Moderator", async () => {
    wireHappy();
    await council().convene("Expand?", []);
    expect(runModerator).toHaveBeenCalledTimes(1);
    const arg = runModerator.mock.calls[0][0];
    expect(arg.voices).toHaveLength(ROSTER.length);
    expect(arg.voices.map((v: any) => v.agentId).sort()).toEqual([
      "hospitality-expert",
      "risk-officer",
    ]);
  });

  it("returns synthesis from the Moderator and only the specialist voices", async () => {
    wireHappy();
    const session = await council().convene("Expand?", []);
    expect(session.id).toBe("sess-1");
    expect(session.synthesis).toEqual({
      recommendation: "Proceed with conditions.",
      confidence: 0.78,
      dissentNote: "Risk Officer dissents.",
    });
    // The Moderator is NOT one of the returned voices.
    expect(session.voices).toHaveLength(ROSTER.length);
    expect(session.voices.some((v) => v.agentId === "moderator")).toBe(false);
  });

  it("persists every specialist voice PLUS a moderator voice, then marks DONE", async () => {
    wireHappy();
    await council().convene("Expand?", []);

    // One councilVoice.create per specialist + 1 for the moderator.
    expect(prisma.councilVoice.create).toHaveBeenCalledTimes(ROSTER.length + 1);
    const persistedIds = prisma.councilVoice.create.mock.calls.map(
      (c) => c[0].data.agentId,
    );
    expect(persistedIds).toContain("moderator");

    // The session is closed out as DONE with the synthesis fields.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const doneUpdate = prisma.councilSession.update.mock.calls.find(
      (c) => c[0].data.status === "DONE",
    );
    expect(doneUpdate).toBeDefined();
    expect(doneUpdate![0].data.recommendation).toBe("Proceed with conditions.");
    expect(doneUpdate![0].data.confidence).toBe(0.78);
    expect(typeof doneUpdate![0].data.durationMs).toBe("number");
  });

  it("detects Arabic topics and runs the debate in Arabic", async () => {
    wireHappy();
    await council().convene("هل نوسّع أرينا؟", []);
    expect(runAgent.mock.calls[0][0 + 1].locale).toBe("ar");
    expect(runModerator.mock.calls[0][0].locale).toBe("ar");
  });

  it("detects Latin topics and runs the debate in English", async () => {
    wireHappy();
    await council().convene("Should we expand Arena?", []);
    expect(runAgent.mock.calls[0][1].locale).toBe("en");
    expect(runModerator.mock.calls[0][0].locale).toBe("en");
  });

  it("flags usedLiveLlm + stamps the model when the LLM is enabled", async () => {
    wireHappy();
    llmEnabled.value = true;
    await council().convene("Expand?", []);
    expect(prisma.councilSession.create.mock.calls[0][0].data.usedLiveLlm).toBe(true);
    const voiceData = prisma.councilVoice.create.mock.calls[0][0].data;
    expect(voiceData.isStub).toBe(false);
    expect(voiceData.llmModel).toBe("claude-sonnet-4-6");
  });

  it("marks the session FAILED and rethrows when the Moderator throws", async () => {
    wireHappy();
    const boom = new Error("moderator exploded");
    runModerator.mockRejectedValue(boom);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(council().convene("Expand?", [])).rejects.toThrow("moderator exploded");

    const failedUpdate = prisma.councilSession.update.mock.calls.find(
      (c) => c[0].data.status === "FAILED",
    );
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate![0].where.id).toBe("sess-1");
    errSpy.mockRestore();
  });
});

describe("LiveCouncil.replay — rehydration", () => {
  it("returns null for an unknown session id", async () => {
    prisma.councilSession.findUnique.mockResolvedValue(null);
    expect(await council().replay("nope")).toBeNull();
  });

  it("pulls the moderator out of voices into synthesis and maps specialists", async () => {
    prisma.councilSession.findUnique.mockResolvedValue({
      id: "sess-9",
      topic: "Expand?",
      ranAt: new Date(Date.UTC(2026, 4, 29)),
      recommendation: "Proceed.",
      confidence: 0.66,
      dissentNote: "Finance flagged FX.",
      voices: [
        {
          agentId: "hospitality-expert",
          speakerLabelAr: "خبير الضيافة",
          speakerLabelEn: "Hospitality Expert",
          position: "support",
          thesis: "Occupancy supports it.",
          evidenceJson: JSON.stringify([{ ref: "n1", weight: 0.4 }]),
          orderIndex: 0,
        },
        {
          agentId: "moderator",
          speakerLabelAr: "المُيَسّر",
          speakerLabelEn: "Moderator",
          position: "qualify",
          thesis: "Proceed.",
          evidenceJson: "[]",
          orderIndex: 1,
        },
      ],
    });

    const session = await council().replay("sess-9");
    expect(session).not.toBeNull();
    expect(session!.voices).toHaveLength(1); // moderator stripped out
    expect(session!.voices[0].agentId).toBe("hospitality-expert");
    expect(session!.voices[0].speakerLabel).toEqual({
      ar: "خبير الضيافة",
      en: "Hospitality Expert",
    });
    expect(session!.voices[0].evidence).toEqual([{ ref: "n1", weight: 0.4 }]);
    expect(session!.synthesis).toEqual({
      recommendation: "Proceed.",
      confidence: 0.66,
      dissentNote: "Finance flagged FX.",
    });
  });

  it("tolerates a malformed evidenceJson blob (falls back to [])", async () => {
    prisma.councilSession.findUnique.mockResolvedValue({
      id: "sess-bad",
      topic: "Expand?",
      ranAt: new Date(),
      recommendation: null,
      confidence: null,
      dissentNote: null,
      voices: [
        {
          agentId: "risk-officer",
          speakerLabelAr: "ضابط المخاطر",
          speakerLabelEn: "Risk Officer",
          position: "oppose",
          thesis: "Too risky.",
          evidenceJson: "{not json",
          orderIndex: 0,
        },
      ],
    });

    const session = await council().replay("sess-bad");
    expect(session!.voices[0].evidence).toEqual([]); // safeJson swallows the parse error
    // Null synthesis columns default to empty/zero, never undefined-crash.
    expect(session!.synthesis.recommendation).toBe("");
    expect(session!.synthesis.confidence).toBe(0);
    expect(session!.synthesis.dissentNote).toBeUndefined();
  });
});
