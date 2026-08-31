import "server-only";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";
import {
  applyRefinement,
  buildItinerary,
  type RefineResult,
} from "@/lib/ai/itinerary";
import type { Itinerary, TripInput } from "@/types/trip";

/**
 * Itinerary generation entry point.
 *
 * Today: a deterministic builder that assembles the itinerary ONLY from
 * verified catalogue records (`lib/domain/catalogue`).
 *
 * Phase 4 real mode (when ANTHROPIC_API_KEY is set): retrieve candidates,
 * constrain Claude to them (`lib/ai/prompt`, `lib/ai/schema`), then run every
 * returned id through `lib/ai/validate` before persisting. The builder below
 * stays as the fallback and the reference for the output shape.
 */
export async function generateItinerary(trip: TripInput): Promise<Itinerary> {
  const [experiences, attractions] = await Promise.all([
    listExperiences(),
    listAttractions(),
  ]);
  return buildItinerary(trip, { experiences, attractions });
}

export async function refineItinerary(
  itinerary: Itinerary,
  instruction: string,
  trip: TripInput,
): Promise<RefineResult> {
  const [experiences, attractions] = await Promise.all([
    listExperiences(),
    listAttractions(),
  ]);
  return applyRefinement(itinerary, instruction, trip, {
    experiences,
    attractions,
  });
}
