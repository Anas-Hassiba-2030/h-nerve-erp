import { describe, it, expect } from "vitest";
import { canTransition, workCenterShouldBeActive } from "./maintenance";

describe("canTransition", () => {
  it("allows SCHEDULED -> IN_PROGRESS and SCHEDULED -> CANCELLED", () => {
    expect(canTransition("SCHEDULED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("SCHEDULED", "CANCELLED")).toBe(true);
  });

  it("allows IN_PROGRESS -> DONE and IN_PROGRESS -> CANCELLED", () => {
    expect(canTransition("IN_PROGRESS", "DONE")).toBe(true);
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
  });

  it("rejects skipping SCHEDULED straight to DONE", () => {
    expect(canTransition("SCHEDULED", "DONE")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransition("DONE", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CANCELLED", "SCHEDULED")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransition("SCHEDULED", "SCHEDULED")).toBe(false);
  });
});

describe("workCenterShouldBeActive", () => {
  it("is false only while IN_PROGRESS", () => {
    expect(workCenterShouldBeActive("IN_PROGRESS")).toBe(false);
  });

  it("is true for SCHEDULED, DONE, and CANCELLED", () => {
    expect(workCenterShouldBeActive("SCHEDULED")).toBe(true);
    expect(workCenterShouldBeActive("DONE")).toBe(true);
    expect(workCenterShouldBeActive("CANCELLED")).toBe(true);
  });
});
