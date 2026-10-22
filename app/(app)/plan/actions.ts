"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aiEnabled, readTripPrompt } from "@/lib/ai/claude";
import { generateItinerary } from "@/lib/ai/generate";
import { interpretTripPrompt, jevEnabled } from "@/lib/ai/jev";
import { createTrip } from "@/lib/domain/trips";
import { parseTripPrompt, type ParsedTrip } from "@/lib/plan/parse-prompt";
import { rateLimit } from "@/lib/rate-limit";
import { parsePromptAvoid, promptSchema, tripInputSchema } from "@/lib/validation/trip";

export type PlanState = { error?: string };

export async function generateTrip(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const user = await requireUser();

  // AI generation is the most expensive path — cap it per user.
  const rl = await rateLimit(`ai:plan:${user.id}`, 8, 60_000);
  if (!rl.ok) {
    return { error: `Slow down — try again in ${rl.retryAfter}s.` };
  }

  const parsed = tripInputSchema.safeParse({
    title: formData.get("title") || "My Sarawak trip",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    budgetPerPerson: formData.get("budgetPerPerson") || null,
    groupType: formData.get("groupType"),
    numAdults: formData.get("numAdults"),
    numChildren: formData.get("numChildren"),
    interests: formData.getAll("interests"),
    pace: formData.get("pace"),
    notes: formData.get("notes") || null,
    prompt: formData.get("prompt") || null,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the trip details.",
    };
  }

  const input = {
    ...parsed.data,
    notes: parsed.data.notes ?? null,
    prompt: parsed.data.prompt || null,
  };
  // what the AI already read the traveller ruling out on this page — no need to read it again
  const promptAvoid = input.prompt ? parsePromptAvoid(formData.get("promptAvoid")) : null;
  const itinerary = await generateItinerary(input, { promptAvoid });
  const trip = await createTrip(user.id, input, itinerary);

  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

export type PromptReading = { parsed: ParsedTrip; source: "claude" | "jev" | "rules" };

/**
 * Read the plan page's one-line description into form fields. The form has already applied the
 * rules' reading instantly; this second pass asks Claude and Jev at the same time (whichever is
 * on) and keeps Claude's reading, then Jev's, then the rules'. Asking both at once means a slow
 * or failing Claude never adds its timeout on top of Jev's. Never throws to the client:
 * rate-limited, off, or failing, it returns the rules' reading.
 */
export async function interpretPrompt(text: string): Promise<PromptReading> {
  const user = await requireUser();
  const input = promptSchema.safeParse(text);
  if (!input.success) return { parsed: {}, source: "rules" };
  const rules = (): PromptReading => ({ parsed: parseTripPrompt(input.data), source: "rules" });
  const useClaude = aiEnabled();
  const useJev = jevEnabled();
  if (!useClaude && !useJev) return rules();
  const rl = await rateLimit(`ai:prompt:${user.id}`, 20, 60_000);
  if (!rl.ok) return rules();
  const [fromClaude, fromJev] = await Promise.all([
    useClaude ? readTripPrompt(input.data) : null,
    useJev ? interpretTripPrompt(input.data) : null,
  ]);
  if (fromClaude) return { parsed: fromClaude, source: "claude" };
  if (fromJev) return { parsed: fromJev, source: "jev" };
  return rules();
}
