import { describe, expect, it } from "vitest";
import { applyRefinement, buildItinerary } from "@/lib/ai/itinerary";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { itineraryTotal, type TripInput } from "@/types/trip";

const candidates = {
  experiences: demoExperiences,
  attractions: demoAttractions,
};

const validExpIds = new Set(demoExperiences.map((e) => e.id));
const validAttSlugs = new Set(demoAttractions.map((a) => a.slug));

function trip(overrides: Partial<TripInput> = {}): TripInput {
  return {
    title: "Test trip",
    startDate: "2026-09-20",
    endDate: "2026-09-22", // 3 days
    budgetPerPerson: 1500,
    groupType: "couple",
    numAdults: 2,
    numChildren: 0,
    interests: ["food", "nature", "culture"],
    pace: "moderate",
    notes: null,
    ...overrides,
  };
}

describe("buildItinerary", () => {
  it("produces one day per calendar day", () => {
    expect(buildItinerary(trip(), candidates).days).toHaveLength(3);
    expect(
      buildItinerary(
        trip({ startDate: "2026-09-20", endDate: "2026-09-20" }),
        candidates,
      ).days,
    ).toHaveLength(1);
  });

  it("only references catalogue records that actually exist (no invented data)", () => {
    const it = buildItinerary(trip({ endDate: "2026-09-25" }), candidates);
    for (const day of it.days) {
      for (const item of day.items) {
        if (item.experienceId) expect(validExpIds.has(item.experienceId)).toBe(true);
        if (item.attractionSlug)
          expect(validAttSlugs.has(item.attractionSlug)).toBe(true);
        if (item.type === "experience") expect(item.experienceId).toBeTruthy();
        if (item.type === "attraction") expect(item.attractionSlug).toBeTruthy();
      }
    }
  });

  it("never repeats an experience or attraction across the trip", () => {
    const it = buildItinerary(trip({ endDate: "2026-09-27" }), candidates);
    const seen = new Set<string>();
    for (const day of it.days) {
      for (const item of day.items) {
        const key = item.experienceId ?? item.attractionSlug;
        if (!key) continue;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("keeps items in chronological order within a day", () => {
    for (const day of buildItinerary(trip(), candidates).days) {
      const times = day.items.map((i) => i.startTime);
      expect([...times].sort()).toEqual(times);
    }
  });

  it("gives every day at least one meal", () => {
    for (const day of buildItinerary(trip(), candidates).days) {
      expect(day.items.some((i) => i.type === "meal")).toBe(true);
    }
  });

  it("biases toward cheaper plans when the budget is tight", () => {
    const rich = itineraryTotal(
      buildItinerary(trip({ budgetPerPerson: 5000 }), candidates),
    );
    const tight = itineraryTotal(
      buildItinerary(trip({ budgetPerPerson: 400 }), candidates),
    );
    expect(tight).toBeLessThan(rich);
  });
});

describe("applyRefinement", () => {
  it('"make it cheaper" lowers the estimated total', () => {
    const base = buildItinerary(trip(), candidates);
    const { itinerary } = applyRefinement(
      base,
      "make it cheaper",
      trip(),
      candidates,
    );
    expect(itineraryTotal(itinerary)).toBeLessThanOrEqual(itineraryTotal(base));
    expect(itinerary.version).toBe(base.version + 1);
    expect(itinerary.generatedBy).toBe("user");
  });

  it('"no outdoor activities on day 2" removes nature/adventure items from that day', () => {
    const base = buildItinerary(trip({ pace: "packed" }), candidates);
    const { itinerary } = applyRefinement(
      base,
      "no outdoor activities on day 2",
      trip(),
      candidates,
    );
    const day2 = itinerary.days.find((d) => d.dayNumber === 2)!;
    for (const item of day2.items) {
      const cats =
        candidates.experiences.find((e) => e.id === item.experienceId)
          ?.categories ??
        candidates.attractions.find((a) => a.slug === item.attractionSlug)
          ?.categories ??
        [];
      expect(cats).not.toContain("nature");
      expect(cats).not.toContain("adventure");
      expect(cats).not.toContain("wildlife");
    }
  });

  it("returns a helpful note when the instruction matches nothing", () => {
    const base = buildItinerary(trip(), candidates);
    const { note } = applyRefinement(base, "asdfghjkl", trip(), candidates);
    expect(note.toLowerCase()).toContain("couldn't");
  });
});
