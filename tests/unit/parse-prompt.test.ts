import { describe, expect, it } from "vitest";
import { parseTripPrompt } from "@/lib/plan/parse-prompt";

describe("parseTripPrompt", () => {
  it("parses the canonical example", () => {
    const r = parseTripPrompt(
      "3 days in Kuching, RM1,500, couple, interested in food + nature",
    );
    expect(r.days).toBe(3);
    expect(r.budgetPerPerson).toBe(1500);
    expect(r.groupType).toBe("couple");
    expect(r.numAdults).toBe(2);
    expect(r.interests).toEqual(expect.arrayContaining(["food", "nature"]));
  });

  it("understands nights, k-budgets and family", () => {
    const r = parseTripPrompt(
      "family trip, 4 nights, budget around 2k per person, 2 adults 2 kids, love wildlife and adventure",
    );
    expect(r.days).toBe(5);
    expect(r.budgetPerPerson).toBe(2000);
    expect(r.groupType).toBe("family");
    expect(r.numAdults).toBe(2);
    expect(r.numChildren).toBe(2);
    expect(r.interests).toEqual(
      expect.arrayContaining(["wildlife", "adventure"]),
    );
  });

  it("detects solo + relaxed pace", () => {
    const r = parseTripPrompt("solo, want a relaxed week exploring heritage");
    expect(r.groupType).toBe("solo");
    expect(r.numAdults).toBe(1);
    expect(r.pace).toBe("relaxed");
    expect(r.interests).toContain("heritage");
  });

  it("returns an empty object for an unparseable prompt", () => {
    expect(parseTripPrompt("hello there")).toEqual({});
  });

  it("caps trip length at 14 days", () => {
    expect(parseTripPrompt("30 days in Sarawak").days).toBe(14);
  });
});
