import { describe, expect, it } from "vitest";
import { catalogueSlugs } from "@/lib/ai/brief";
import { interpretRefinement, PLANNER_MODEL, requestBrief } from "@/lib/ai/claude";
import { buildItinerary } from "@/lib/ai/itinerary";
import { applyBrief } from "@/lib/ai/brief";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import type { TripInput } from "@/types/trip";

/**
 * The REAL Claude API: runs only when ANTHROPIC_API_KEY is in .env.local, so adding a key and
 * running `npm run test:live` tells you in seconds whether the planner integration works
 * (structured output, model ids, timeouts). Costs a few cents. Skipped otherwise.
 */
const KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const catalogue = { experiences: demoExperiences, attractions: demoAttractions };

const trip: TripInput = {
  title: "t",
  startDate: "2026-10-20",
  endDate: "2026-10-22",
  budgetPerPerson: 1200,
  groupType: "family",
  numAdults: 2,
  numChildren: 2,
  interests: ["nature", "wildlife", "food"],
  pace: "relaxed",
  notes: "We have two young kids and my mother-in-law can't walk far. We'd rather skip anything with a lot of trekking or shopping.",
};

describe.skipIf(!KEY)("Claude planner (live API)", () => {
  it(
    "returns a brief made only of real catalogue slugs, and the plan built from it is valid",
    async () => {
      const brief = await requestBrief(trip, catalogue);
      expect(brief, "the API call failed — see the [ai] log above").not.toBeNull();
      const allowed = new Set(catalogueSlugs(catalogue));
      for (const s of [...brief!.avoidSlugs, ...brief!.preferSlugs, ...Object.keys(brief!.reasons)]) {
        expect(allowed.has(s)).toBe(true);
      }
      expect(brief!.preferSlugs.length).toBeGreaterThan(0);
      console.log(`[${PLANNER_MODEL}]`, JSON.stringify(brief, null, 1));

      const itinerary = buildItinerary(trip, applyBrief(catalogue, brief!));
      expect(itinerary.days).toHaveLength(3);
      expect(itinerary.days.flatMap((d) => d.items).length).toBeGreaterThan(3);
    },
    60_000,
  );

  it(
    "rephrases a free-text edit into a command, or declines",
    async () => {
      const cmd = await interpretRefinement("the second day is costing too much for us", 3);
      console.log("refine ->", cmd);
      expect(cmd === null || /cheap|day/i.test(cmd)).toBe(true);
    },
    30_000,
  );
});
