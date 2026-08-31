import { describe, expect, it } from "vitest";
import { applyRefinement, buildItinerary } from "@/lib/ai/itinerary";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { weekdayKey } from "@/lib/format";
import {
  bookableExperiences,
  itineraryTotal,
  type ItineraryItem,
  type TripInput,
} from "@/types/trip";

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

  it("every day has food sorted — a meal, or a food experience", () => {
    for (const over of [
      {},
      { pace: "packed" as const, endDate: "2026-09-27" },
      { pace: "relaxed" as const, endDate: "2026-09-24" },
    ]) {
      for (const day of buildItinerary(trip(over), candidates).days) {
        const hasMeal = day.items.some((i) => i.type === "meal");
        const hasFoodExp = day.items.some(
          (i) =>
            i.type === "experience" &&
            (demoExperiences
              .find((e) => e.id === i.experienceId)
              ?.categories.includes("food") ??
              false),
        );
        expect(hasMeal || hasFoodExp).toBe(true);
      }
    }
  });

  it("schedules experiences at their real start time, not a generic slot", () => {
    const it = buildItinerary(
      trip({ pace: "packed", endDate: "2026-09-27" }),
      candidates,
    );
    let checked = 0;
    for (const day of it.days) {
      for (const item of day.items) {
        if (!item.experienceId) continue;
        const exp = demoExperiences.find((e) => e.id === item.experienceId)!;
        expect(item.startTime).toBe(exp.availability.times[0]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("never schedules an experience on a weekday the vendor doesn't run it", () => {
    const it = buildItinerary(
      trip({ startDate: "2026-09-14", endDate: "2026-09-27", pace: "packed" }),
      candidates,
    );
    for (const day of it.days) {
      const wd = weekdayKey(day.date);
      for (const item of day.items) {
        if (!item.experienceId) continue;
        const exp = demoExperiences.find((e) => e.id === item.experienceId)!;
        if (exp.availability.days.length === 0) continue;
        expect(exp.availability.days).toContain(wd);
      }
    }
  });

  it("produces a conflict-free daily schedule (no overlapping items)", () => {
    const it = buildItinerary(
      trip({ startDate: "2026-09-14", endDate: "2026-09-27", pace: "packed" }),
      candidates,
    );
    const overlap = (a: ItineraryItem, b: ItineraryItem) =>
      a.startTime < b.endTime && b.startTime < a.endTime;
    for (const day of it.days) {
      for (let i = 0; i < day.items.length; i++) {
        for (let j = i + 1; j < day.items.length; j++) {
          expect(overlap(day.items[i], day.items[j])).toBe(false);
        }
      }
    }
  });

  it("respects an attraction's closed weekday (museum is shut Mondays)", () => {
    // A 14-day packed trip cycles through every weekday, so the museum would be
    // picked for a Monday if the closed check didn't work.
    const it = buildItinerary(
      trip({ startDate: "2026-09-07", endDate: "2026-09-20", pace: "packed" }),
      candidates,
    );
    for (const day of it.days) {
      if (weekdayKey(day.date) !== "mon") continue;
      const slugs = day.items.map((i) => i.attractionSlug);
      expect(slugs).not.toContain("borneo-cultures-museum");
      expect(slugs).not.toContain("fort-margherita");
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

  it("keeps a day's stops in one area, with transfers on excursion days", () => {
    const it = buildItinerary(
      trip({ startDate: "2026-09-16", endDate: "2026-09-21", pace: "packed" }),
      candidates,
    );
    const CITY = "Kuching City Centre";
    for (const day of it.days) {
      const areas = new Set(
        day.items
          .filter((i) => i.type === "experience" || i.type === "attraction")
          .map((i) => i.locationLabel),
      );
      const outlying = [...areas].filter((a) => a && a !== CITY);
      // at most one outlying area per day, and never mixed with city sightseeing
      expect(outlying.length).toBeLessThanOrEqual(1);
      if (outlying.length === 1 && day.items.some((i) => i.type === "attraction" && i.locationLabel === CITY)) {
        // a city stop on an excursion day is only OK when the excursion is
        // half-day (morning or evening) — there must still be a transfer item
        expect(day.items.some((i) => i.type === "transport")).toBe(true);
      }
      if (outlying.length === 1) {
        expect(day.items.some((i) => i.type === "transport")).toBe(true);
      }
    }
  });

  it("leaves out things the notes veto (no museums, no hiking)", () => {
    const it = buildItinerary(
      trip({
        startDate: "2026-09-16",
        endDate: "2026-09-22",
        pace: "packed",
        notes: "no museums please, and we hate hiking / strenuous treks",
      }),
      candidates,
    );
    for (const day of it.days) {
      for (const item of day.items) {
        expect(item.attractionSlug).not.toBe("borneo-cultures-museum");
        // adventure-tagged experiences (Bako trek, kayak) are vetoed by "hiking"
        const exp = demoExperiences.find((e) => e.id === item.experienceId);
        if (exp) expect(exp.categories).not.toContain("adventure");
      }
    }
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

describe("bookableExperiences", () => {
  it("lists each bookable experience once, in day order", () => {
    const it = buildItinerary(
      trip({ startDate: "2026-09-14", endDate: "2026-09-20", pace: "packed" }),
      candidates,
    );
    const list = bookableExperiences(it);
    expect(list.length).toBeGreaterThan(0);

    const ids = list.map((e) => e.experienceId);
    expect(new Set(ids).size).toBe(ids.length); // no dupes
    for (const e of list) {
      expect(validExpIds.has(e.experienceId)).toBe(true);
      expect(e.title).toBeTruthy();
    }

    // matches the bookable experience items actually in the itinerary
    const fromDays = new Set(
      it.days.flatMap((d) =>
        d.items
          .filter((i) => i.bookable && i.experienceId)
          .map((i) => i.experienceId as string),
      ),
    );
    expect(new Set(ids)).toEqual(fromDays);
  });

  it("returns [] for a null itinerary", () => {
    expect(bookableExperiences(null)).toEqual([]);
  });
});
