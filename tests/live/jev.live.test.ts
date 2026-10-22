import { TypeSafeClient } from "@typesafe-ai/sdk";
import { describe, expect, it } from "vitest";
import { catalogueSlugs } from "@/lib/ai/brief";
import { kuchingRegionOnly } from "@/lib/ai/itinerary";
import {
  interpretRefineIntent,
  interpretTripPrompt,
  JEV_MODEL,
  JEV_TIMEOUT_MS,
  requestJevBrief,
  type JevClient,
} from "@/lib/ai/jev";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import type { TripInput } from "@/types/trip";

/**
 * The REAL TypeSafe API (Jev): runs only when TYPESAFE_API_KEY is in .env.local, so adding a key
 * and running `npm run test:live` tells you whether the Jev planner works (question shapes, model
 * id, latency against the 8 s deadline). A run costs well under a cent. Skipped otherwise.
 */
const KEY = Boolean(process.env.TYPESAFE_API_KEY);
const catalogue = kuchingRegionOnly({ experiences: demoExperiences, attractions: demoAttractions });

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
  notes: "Two young kids, and grandma can't walk far.",
  prompt: "Relaxed family trip with small kids, no trekking or long hikes, we love wildlife",
};

/** The real client, counting input tokens so the cost estimate in docs/deployment.md stays honest. */
function countingClient() {
  const real = new TypeSafeClient({ timeout: JEV_TIMEOUT_MS, retry: { maxRetries: 1 } }) as unknown as JevClient;
  const tally = { requests: 0, inputTokens: 0 };
  const client: JevClient = {
    systemOne: async (req, opts) => {
      const res = await real.systemOne(req, opts);
      tally.requests++;
      tally.inputTokens += (res.usage as { input_tokens?: number | null } | undefined)?.input_tokens ?? 0;
      return res;
    },
  };
  return { client, tally };
}

const TREKS = ["bako-national-park-full-day-trek", "sarawak-kiri-river-kayaking-semadang"];

describe.skipIf(!KEY)("Jev planner (live API)", () => {
  it(
    "scores every candidate: vetoes the treks for this family and prefers real catalogue places",
    async () => {
      const { client, tally } = countingClient();
      const t0 = Date.now();
      const brief = await requestJevBrief(trip, catalogue, { client });
      const ms = Date.now() - t0;
      expect(brief, "the API call failed — see the [jev] log above").not.toBeNull();
      const allowed = new Set(catalogueSlugs(catalogue));
      for (const s of [...brief!.avoidSlugs, ...brief!.preferSlugs]) expect(allowed.has(s)).toBe(true);
      expect(brief!.avoidSlugs.some((s) => TREKS.includes(s))).toBe(true);
      expect(brief!.preferSlugs.length).toBeGreaterThan(0);
      console.log(
        `[${JEV_MODEL}] ${tally.requests}/${allowed.size} candidates in ${ms} ms, ${tally.inputTokens} input tokens`,
        JSON.stringify(brief, null, 1),
      );
    },
    30_000,
  );

  it(
    "reads the plan-page sentence",
    async () => {
      const { client, tally } = countingClient();
      const p = await interpretTripPrompt(trip.prompt!, { client });
      console.log(`prompt (${tally.inputTokens} input tokens) ->`, JSON.stringify(p));
      expect(p?.groupType).toBe("family");
      expect(p?.interests).toContain("wildlife");
      expect(p?.avoid?.categories).toContain("adventure");
    },
    15_000,
  );

  it(
    "reads a free-text edit",
    async () => {
      const { client, tally } = countingClient();
      const intent = await interpretRefineIntent("the second day is too pricey for us", 3, { client });
      console.log(`edit (${tally.inputTokens} input tokens) ->`, JSON.stringify(intent));
      expect(intent?.cheaper).toBe(true);
      expect(intent?.targetDay).toBe(2);
    },
    15_000,
  );
});
