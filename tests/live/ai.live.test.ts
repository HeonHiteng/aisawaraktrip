import { describe, expect, it } from "vitest";
import { catalogueSlugs } from "@/lib/ai/brief";
import { PLANNER_MODEL, PROMPT_MODEL, readTripPrompt, requestBrief } from "@/lib/ai/claude";
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
});

describe.skipIf(!KEY)("Claude reading the plan page's description (live API)", () => {
  it(
    "reads Chinese numbers, a total budget, a relative date and vetoes",
    async () => {
      const t0 = Date.now();
      const zh = await readTripPrompt("5天4夜，5个大人一个小孩，budget在RM1000 / person，不要坐船");
      const ms = Date.now() - t0;
      expect(zh, "the API call failed — see the [ai] log above").not.toBeNull();
      expect(zh).toMatchObject({ days: 5, numAdults: 5, numChildren: 1, groupType: "family", budgetPerPerson: 1000 });
      expect(zh!.avoid?.slugs).toContain("santubong-sunset-wildlife-river-cruise");
      console.log(`[${PROMPT_MODEL}] ${ms}ms`, JSON.stringify(zh));

      const total = await readTripPrompt("下个月15号出发，三天两夜，两夫妻，总预算四千马币");
      expect(total).toMatchObject({ days: 3, numAdults: 2, groupType: "couple", budgetPerPerson: 2000 });
      expect(total!.startDate).toMatch(/^\d{4}-\d{2}-15$/);
      console.log(`[${PROMPT_MODEL}]`, JSON.stringify(total));

      const en = await readTripPrompt("Long weekend for two couples, slow pace, love wildlife, skip museums");
      expect(en).toMatchObject({ numAdults: 4, pace: "relaxed" });
      expect(en!.interests).toContain("wildlife");
      console.log(`[${PROMPT_MODEL}]`, JSON.stringify(en));
    },
    60_000,
  );
});
