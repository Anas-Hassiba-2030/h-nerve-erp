import { describe, it, expect, afterEach } from "vitest";
import { isOwnerEmail, ownerEmails } from "./owner";

describe("owner identification", () => {
  const orig = process.env.OWNER_EMAILS;
  afterEach(() => { process.env.OWNER_EMAILS = orig; });

  it("recognizes the built-in owner (case-insensitive)", () => {
    expect(isOwnerEmail("anashasiba91@gmail.com")).toBe(true);
    expect(isOwnerEmail("ANASHASIBA91@GMAIL.COM")).toBe(true);
    expect(isOwnerEmail("  anashasiba91@gmail.com  ")).toBe(true);
  });

  it("rejects non-owners and empty input", () => {
    expect(isOwnerEmail("random@example.com")).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });

  it("honors extra owners from OWNER_EMAILS env (comma-separated)", () => {
    process.env.OWNER_EMAILS = "ceo@hourani.jo, second@x.com";
    expect(isOwnerEmail("ceo@hourani.jo")).toBe(true);
    expect(isOwnerEmail("second@x.com")).toBe(true);
    expect(ownerEmails().has("anashasiba91@gmail.com")).toBe(true); // built-in still present
  });
});
