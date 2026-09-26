import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Brief } from "@/lib/ai/brief";
import type { TripInput } from "@/types/trip";

/**
 * generateItinerary / refineItinerary wiring: the AI is optional, and whatever it does or
 * fails to do, the plan comes from the catalogue. (The Claude calls themselves are faked.)
 */

const claude = vi.hoisted(() => ({
  enabled: false,
  brief: null as unknown,
  command: null as string | null,
  briefCalls: 0,
  refineCalls: 0,
}));

vi.mock("@/lib/ai/claude", () => ({
  PLANNER_MODEL: "claude-sonnet-5",
  aiEnabled: () => claude.enabled,
  requestBrief: async () => {
    claude.briefCalls++;
    return claude.brief;
  },
  interpretRefinement: async () => {
    claude.refineCalls++;
    return claude.command;
  },
}));

import { generateItinerary, refineItinerary } from "@/lib/ai/generate";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";

const trip: TripInput = {
  title: "t",
  startDate: "2026-10-20",
  endDate: "2026-10-22",
  budgetPerPerson: 1500,
  groupType: "couple",
  numAdults: 2,
  numChildren: 0,
  interests: ["food", "nature", "culture"],
  pace: "moderate",
  notes: null,
};

beforeEach(() => {
  claude.enabled = false;
  claude.brief = null;
  claude.command = null;
  claude.briefCalls = 0;
  claude.refineCalls = 0;
});

describe("generateItinerary", () => {
  it("with no API key it never calls the AI and builds from the catalogue", async () => {
    const it = await generateItinerary(trip);
    expect(claude.briefCalls).toBe(0);
    expect(it.model).toBeNull();
    expect(it.days).toHaveLength(3);
  });

  it("with a key it asks for a brief, applies it, and records the model", async () => {
    claude.enabled = true;
    const veto = demoAttractions.find((a) => a.categories.includes("shopping"))!;
    claude.brief = { avoidSlugs: [veto.slug], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    const it = await generateItinerary(trip);
    expect(claude.briefCalls).toBe(1);
    expect(it.model).toBe("claude-sonnet-5");
    expect(it.days.flatMap((d) => d.items).some((i) => i.attractionSlug === veto.slug)).toBe(false);
    // prices still come from the catalogue
    const exps = new Map(demoExperiences.map((e) => [e.id, e.pricePerPerson]));
    for (const i of it.days.flatMap((d) => d.items)) {
      if (i.experienceId) expect(i.estimatedCost).toBe(exps.get(i.experienceId)! * 2);
    }
  });

  it("if the AI fails (null brief), the rule-based plan is returned as if nothing happened", async () => {
    claude.enabled = true;
    claude.brief = null;
    const it = await generateItinerary(trip);
    expect(claude.briefCalls).toBe(1);
    expect(it.model).toBeNull();
    expect(it.days).toHaveLength(3);
  });
});

describe("refineItinerary", () => {
  it("a request the rules understand never touches the AI", async () => {
    claude.enabled = true;
    const base = await generateItinerary(trip);
    const r = await refineItinerary(base, "more food please", trip);
    expect(r.changed).toBe(true);
    expect(claude.refineCalls).toBe(0);
  });

  it("an unmapped request is rephrased by the AI and then handled by the rules", async () => {
    claude.enabled = true;
    const base = await generateItinerary(trip);
    const unmapped = "the second day feels too pricey for us";
    expect((await refineItinerary(base, unmapped, trip)).changed).toBe(false); // (command still null)
    claude.command = "make day 2 cheaper";
    const r = await refineItinerary(base, unmapped, trip);
    expect(claude.refineCalls).toBeGreaterThan(0);
    expect(r.note).toContain("understood as “make day 2 cheaper”");
  });

  it("with no key, an unmapped request gets the usual hint", async () => {
    const base = await generateItinerary(trip);
    const r = await refineItinerary(base, "blorp", trip);
    expect(r.changed).toBe(false);
    expect(r.note).toMatch(/couldn't map/);
    expect(claude.refineCalls).toBe(0);
  });
});
