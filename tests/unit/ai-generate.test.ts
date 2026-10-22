import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Brief } from "@/lib/ai/brief";
import type { RefineIntent } from "@/lib/ai/itinerary";
import type { ParsedTrip } from "@/lib/plan/parse-prompt";
import type { TripInput } from "@/types/trip";

/**
 * generateItinerary / refineItinerary wiring: the AI is optional, and whatever it does or
 * fails to do, the plan comes from the catalogue. (The Claude and Jev calls are faked.)
 * Order: Jev brief → Claude brief → rules.
 */

const claude = vi.hoisted(() => ({
  enabled: false,
  brief: null as unknown,
  briefCalls: 0,
  parsed: null as unknown,
  promptCalls: 0,
}));

const jev = vi.hoisted(() => ({
  enabled: false,
  brief: null as unknown,
  parsed: null as unknown,
  intent: null as unknown,
  briefCalls: 0,
  promptCalls: 0,
  intentCalls: 0,
}));

vi.mock("@/lib/ai/claude", () => ({
  PLANNER_MODEL: "claude-sonnet-5",
  aiEnabled: () => claude.enabled,
  requestBrief: async () => {
    claude.briefCalls++;
    return claude.brief;
  },
  readTripPrompt: async () => {
    claude.promptCalls++;
    return claude.parsed;
  },
}));

vi.mock("@/lib/ai/jev", () => ({
  JEV_MODEL: "jev-latest",
  jevEnabled: () => jev.enabled,
  requestJevBrief: async () => {
    jev.briefCalls++;
    return jev.brief;
  },
  interpretTripPrompt: async () => {
    jev.promptCalls++;
    return jev.parsed;
  },
  interpretRefineIntent: async () => {
    jev.intentCalls++;
    return jev.intent;
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

const itemsOf = (i: Awaited<ReturnType<typeof generateItinerary>>) => i.days.flatMap((d) => d.items);

beforeEach(() => {
  Object.assign(claude, { enabled: false, brief: null, briefCalls: 0, parsed: null, promptCalls: 0 });
  Object.assign(jev, { enabled: false, brief: null, parsed: null, intent: null, briefCalls: 0, promptCalls: 0, intentCalls: 0 });
});

describe("generateItinerary", () => {
  it("with no API key it never calls the AI and builds from the catalogue", async () => {
    const it = await generateItinerary(trip);
    expect(claude.briefCalls).toBe(0);
    expect(jev.briefCalls).toBe(0);
    expect(it.model).toBeNull();
    expect(it.days).toHaveLength(3);
  });

  it("with Jev on, its brief is applied and recorded, and Claude is never asked", async () => {
    jev.enabled = true;
    claude.enabled = true;
    const veto = demoAttractions.find((a) => a.categories.includes("shopping"))!;
    jev.brief = { avoidSlugs: [veto.slug], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    const it = await generateItinerary(trip);
    expect(jev.briefCalls).toBe(1);
    expect(jev.promptCalls).toBe(0); // no prompt on this trip
    expect(claude.briefCalls).toBe(0);
    expect(it.model).toBe("jev-latest");
    expect(itemsOf(it).some((i) => i.attractionSlug === veto.slug)).toBe(false);
    // prices still come from the catalogue
    const exps = new Map(demoExperiences.map((e) => [e.id, e.pricePerPerson]));
    for (const i of itemsOf(it)) {
      if (i.experienceId) expect(i.estimatedCost).toBe(exps.get(i.experienceId)! * 2);
    }
  });

  it("what Jev read in the traveller's prompt is vetoed too", async () => {
    const shoppers = { ...trip, interests: ["shopping", "heritage"] as TripInput["interests"] };
    const isShopping = (slug: string | null) =>
      demoAttractions.find((a) => a.slug === slug)?.categories.includes("shopping") ?? false;
    expect(itemsOf(await generateItinerary(shoppers)).some((i) => isShopping(i.attractionSlug))).toBe(true); // control

    jev.enabled = true;
    jev.brief = { avoidSlugs: [], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    jev.parsed = { avoid: { categories: ["shopping"], slugs: [] } } satisfies ParsedTrip;
    const it = await generateItinerary({ ...shoppers, prompt: "old town walks, we'd rather not browse stores" });
    expect(jev.promptCalls).toBe(1);
    expect(itemsOf(it).some((i) => isShopping(i.attractionSlug))).toBe(false);
  });

  it("the plan page's reading of the prompt is vetoed, and no model reads the sentence again", async () => {
    const shoppers = { ...trip, interests: ["shopping", "heritage"] as TripInput["interests"] };
    const isShopping = (slug: string | null) =>
      demoAttractions.find((a) => a.slug === slug)?.categories.includes("shopping") ?? false;
    const prompt = "老街走走就好，商场就算了"; // the rules can't read this veto; Claude did, on the page

    jev.enabled = true;
    claude.enabled = true;
    jev.brief = { avoidSlugs: [], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    const before = await generateItinerary({ ...shoppers, prompt });
    expect(itemsOf(before).some((i) => isShopping(i.attractionSlug))).toBe(true); // control
    expect(jev.promptCalls).toBe(1); // no page reading: Jev reads it here (and found nothing)

    jev.promptCalls = 0;
    const it = await generateItinerary(
      { ...shoppers, prompt },
      { promptAvoid: { categories: ["shopping"], slugs: [] } },
    );
    expect(jev.promptCalls).toBe(0);
    expect(claude.promptCalls).toBe(0); // generation never asks Claude to read the sentence
    expect(claude.briefCalls).toBe(0); // Jev's brief answered
    expect(it.model).toBe("jev-latest");
    expect(itemsOf(it).some((i) => isShopping(i.attractionSlug))).toBe(false);
  });

  it("the page's vetoes also apply when Claude's brief plans the trip", async () => {
    const shoppers = { ...trip, interests: ["shopping", "heritage"] as TripInput["interests"] };
    const isShopping = (slug: string | null) =>
      demoAttractions.find((a) => a.slug === slug)?.categories.includes("shopping") ?? false;
    claude.enabled = true;
    claude.brief = { avoidSlugs: [], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    const it = await generateItinerary(
      { ...shoppers, prompt: "老街走走就好，商场就算了" },
      { promptAvoid: { categories: ["shopping"], slugs: [] } },
    );
    expect(it.model).toBe("claude-sonnet-5");
    expect(itemsOf(it).some((i) => isShopping(i.attractionSlug))).toBe(false);
  });

  it("if Jev fails, Claude's brief is used", async () => {
    jev.enabled = true;
    claude.enabled = true;
    claude.brief = { avoidSlugs: [], avoidCategories: [], preferSlugs: [], reasons: {} } satisfies Brief;
    const it = await generateItinerary(trip);
    expect(jev.briefCalls).toBe(1);
    expect(claude.briefCalls).toBe(1);
    expect(it.model).toBe("claude-sonnet-5");
  });

  it("if every AI fails (null briefs), the rule-based plan is returned as if nothing happened", async () => {
    jev.enabled = true;
    claude.enabled = true;
    const it = await generateItinerary(trip);
    expect(jev.briefCalls).toBe(1);
    expect(claude.briefCalls).toBe(1);
    expect(it.model).toBeNull();
    expect(it.days).toHaveLength(3);
  });
});

describe("refineItinerary", () => {
  const intent = (over: Partial<RefineIntent>): RefineIntent => ({
    cheaper: false,
    moreFood: false,
    noOutdoor: false,
    relax: false,
    culture: false,
    targetDay: null,
    ...over,
  });

  it("with Jev on, its reading of the request drives the rule-based editor", async () => {
    const base = await generateItinerary(trip);
    jev.enabled = true;
    jev.intent = intent({ cheaper: true, targetDay: 2 });
    const r = await refineItinerary(base, "the second day is too pricey for us", trip);
    expect(jev.intentCalls).toBe(1);
    expect(r.changed).toBe(true);
    expect(r.note).toContain("Day 2");
  });

  it("if Jev can't read it (null), the rules still handle what they understand", async () => {
    const base = await generateItinerary(trip);
    jev.enabled = true;
    const r = await refineItinerary(base, "more food please", trip);
    expect(jev.intentCalls).toBe(1);
    expect(r.changed).toBe(true);
  });

  it("with no key, the rules alone read it, and an unmapped request gets the usual hint", async () => {
    const base = await generateItinerary(trip);
    expect((await refineItinerary(base, "more food please", trip)).changed).toBe(true);
    const r = await refineItinerary(base, "blorp", trip);
    expect(r.changed).toBe(false);
    expect(r.note).toMatch(/couldn't map/);
    expect(jev.intentCalls).toBe(0);
  });
});
