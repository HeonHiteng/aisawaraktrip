import "server-only";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";
import { listEateries } from "@/lib/domain/eateries";
import {
  applyRefineIntent,
  buildItinerary,
  intentFromText,
  kuchingRegionOnly,
  type RefineResult,
} from "@/lib/ai/itinerary";
import { applyBrief, catalogueSlugs, sanitizeBrief, type Brief } from "@/lib/ai/brief";
import { aiEnabled, PLANNER_MODEL, readTripPrompt, requestBrief } from "@/lib/ai/claude";
import {
  interpretRefineIntent,
  interpretTripPrompt,
  JEV_MODEL,
  jevEnabled,
  requestJevBrief,
} from "@/lib/ai/jev";
import type { ParsedTrip } from "@/lib/plan/parse-prompt";
import type { Itinerary, TripInput } from "@/types/trip";

/**
 * Itinerary generation entry point.
 *
 * A brief (what to skip, what to rank first — lib/ai/brief.ts) comes from the first planner
 * that answers: Jev scoring each candidate (TYPESAFE_API_KEY), then Claude (ANTHROPIC_API_KEY).
 * What the traveller ruled out in their one-line description ("no boats", "不要爬山") is read by
 * Claude and Jev side by side and added to Jev's brief as vetoes.
 * The deterministic builder then does ALL scheduling and pricing from the database, so no model
 * can introduce a place, a price or a time. With no key, or on any AI error or timeout, the
 * builder runs alone: the planner always works.
 */
export async function generateItinerary(trip: TripInput): Promise<Itinerary> {
  const [experiences, attractions, eateries] = await Promise.all([
    listExperiences(),
    listAttractions(),
    listEateries({ city: "Kuching" }),
  ]);
  const catalogue = { experiences, attractions, eateries };

  if (jevEnabled()) {
    const [brief, fromJev, fromClaude] = await Promise.all([
      requestJevBrief(trip, kuchingRegionOnly(catalogue)),
      trip.prompt ? interpretTripPrompt(trip.prompt) : null,
      trip.prompt && aiEnabled() ? readTripPrompt(trip.prompt) : null,
    ]);
    if (brief) {
      const vetoed = withPromptVetoes(withPromptVetoes(brief, fromJev, catalogue), fromClaude, catalogue);
      return {
        ...buildItinerary(trip, applyBrief(catalogue, vetoed)),
        model: JEV_MODEL,
      };
    }
  }

  if (aiEnabled()) {
    const brief = await requestBrief(trip, catalogue);
    if (brief) {
      return {
        ...buildItinerary(trip, applyBrief(catalogue, brief)),
        model: PLANNER_MODEL,
      };
    }
  }
  return buildItinerary(trip, catalogue);
}

/** Add what the traveller ruled out in their own words; a veto still beats a preference. */
function withPromptVetoes(
  brief: Brief,
  parsed: ParsedTrip | null,
  catalogue: Parameters<typeof catalogueSlugs>[0],
): Brief {
  if (!parsed?.avoid) return brief;
  return sanitizeBrief(
    {
      ...brief,
      avoidSlugs: [...brief.avoidSlugs, ...parsed.avoid.slugs],
      avoidCategories: [...brief.avoidCategories, ...parsed.avoid.categories],
      reasons: Object.entries(brief.reasons).map(([slug, reason]) => ({ slug, reason })),
    },
    new Set(catalogueSlugs(catalogue)),
  );
}

/**
 * Refine: Jev (when on) reads what the edit asks for; if it's off, fails, or isn't sure, the
 * rules read it instead. Either way the rule-based editor alone changes the itinerary.
 */
export async function refineItinerary(
  itinerary: Itinerary,
  instruction: string,
  trip: TripInput,
): Promise<RefineResult> {
  const [experiences, attractions] = await Promise.all([
    listExperiences(),
    listAttractions(),
  ]);
  const candidates = { experiences, attractions };
  const total = itinerary.days.length;
  const intent = jevEnabled() ? await interpretRefineIntent(instruction, total) : null;
  return applyRefineIntent(
    itinerary,
    intent ?? intentFromText(instruction, total),
    trip,
    candidates,
  );
}
