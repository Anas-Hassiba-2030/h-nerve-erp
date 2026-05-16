// lib/gamification.ts — chess-rank progression. Drives the sidebar rank
// piece, the bonus %, and the achievements page the pitch demos. Off-by-one
// XP thresholds put a user in the wrong rank. Pure, deterministic.

import { describe, it, expect } from "vitest";
import {
  RANKS,
  rankFor,
  nextRank,
  progressToNext,
  bonusFor,
  rankById,
} from "./gamification";

// thresholds: PAWN 0 · BISHOP 51 · KNIGHT 151 · QUEEN 301 · KING 500
describe("rankFor — boundary-exact", () => {
  it("each threshold flips exactly at minXp, not before", () => {
    expect(rankFor(0).id).toBe("PAWN");
    expect(rankFor(50).id).toBe("PAWN");
    expect(rankFor(51).id).toBe("BISHOP");
    expect(rankFor(150).id).toBe("BISHOP");
    expect(rankFor(151).id).toBe("KNIGHT");
    expect(rankFor(300).id).toBe("KNIGHT");
    expect(rankFor(301).id).toBe("QUEEN");
    expect(rankFor(499).id).toBe("QUEEN");
    expect(rankFor(500).id).toBe("KING");
  });
  it("absurd / negative xp clamps to the ends (PAWN..KING)", () => {
    expect(rankFor(-50).id).toBe("PAWN");
    expect(rankFor(10_000_000).id).toBe("KING");
  });
});

describe("nextRank", () => {
  it("points at the next tier, null once at KING", () => {
    expect(nextRank(0)?.id).toBe("BISHOP");
    expect(nextRank(50)?.id).toBe("BISHOP");
    expect(nextRank(499)?.id).toBe("KING");
    expect(nextRank(500)).toBeNull();
    expect(nextRank(9999)).toBeNull();
  });
});

describe("progressToNext", () => {
  it("at the start of a tier: 0 progress, full span ahead", () => {
    expect(progressToNext(51)).toEqual({ current: 0, needed: 100, pct: 0 });
  });
  it("part-way through a tier: pct is the fraction toward next", () => {
    const p = progressToNext(101); // BISHOP(51) → KNIGHT(151): 50/100
    expect(p).toEqual({ current: 50, needed: 100, pct: 0.5 });
  });
  it("at KING (no next): needed 0, pct fully complete", () => {
    const p = progressToNext(600);
    expect(p.needed).toBe(0);
    expect(p.pct).toBe(1);
  });
  it("pct never exceeds 1", () => {
    expect(progressToNext(150).pct).toBeLessThanOrEqual(1);
  });
});

describe("bonusFor", () => {
  it("maps xp → the rank's bonus percent", () => {
    expect(bonusFor(0)).toBe(0);
    expect(bonusFor(51)).toBe(3);
    expect(bonusFor(151)).toBe(6);
    expect(bonusFor(301)).toBe(10);
    expect(bonusFor(500)).toBe(15);
  });
});

describe("rankById — descriptor lookup", () => {
  it("known id returns its descriptor", () => {
    expect(rankById("KING").symbol).toBe("♚");
  });
  it("unknown / empty id falls back to PAWN (never undefined)", () => {
    expect(rankById("WIZARD").id).toBe("PAWN");
    expect(rankById("").id).toBe("PAWN");
  });
});

describe("RANKS table integrity", () => {
  it("is strictly ascending in minXp and bonusPercent", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp);
      expect(RANKS[i].bonusPercent).toBeGreaterThanOrEqual(RANKS[i - 1].bonusPercent);
    }
    expect(RANKS[0].minXp).toBe(0); // PAWN must start at 0 so rankFor never gaps
  });
});
