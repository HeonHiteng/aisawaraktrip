import "server-only";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";
import { listEateries } from "@/lib/domain/eateries";
import {
  applyRefinement,
  buildItinerary,
  type RefineResult,
} from "@/lib/ai/itinerary";
import { applyBrief } from "@/lib/ai/brief";
import {
  aiEnabled,
  interpretRefinement,
  PLANNER_MODEL,
  requestBrief,
} from "@/lib/ai/claude";
import type { Itinerary, TripInput } from "@/types/trip";

/**
 * Itinerary generation entry point.
 *
 * With ANTHROPIC_API_KEY set, Claude reads the request and the catalogue and returns a brief
 * (what to skip, what to rank first, a personal reason per pick) — see lib/ai/brief.ts. The
 * deterministic builder then does ALL scheduling and pricing from the database, so the model
 * can never introduce a place, a price or a time. With no key, or on any AI error or timeout,
 * the builder runs alone: the planner always works.
 */
export async function generateItinerary(trip: TripInput): Promise<Itinerary> {
  const [experiences, attractions, eateries] = await Promise.all([
    listExperiences(),
    listAttractions(),
    listEateries({ city: "Kuching" }),
  ]);
  const catalogue = { experiences, attractions, eateries };

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

/**
 * Refine: the rule-based editor runs first. If it can't map the instruction and AI is on, a
 * small model rephrases it into a command the editor understands, and the editor tries again.
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
  const first = applyRefinement(itinerary, instruction, trip, candidates);
  if (first.changed || !aiEnabled()) return first;

  const command = await interpretRefinement(instruction, itinerary.days.length);
  if (!command) return first;
  const second = applyRefinement(itinerary, command, trip, candidates);
  return second.changed
    ? { ...second, note: `${second.note} (understood as “${command}”)` }
    : first;
}
