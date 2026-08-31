"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { generateItinerary } from "@/lib/ai/generate";
import { createTrip } from "@/lib/domain/trips";
import { tripInputSchema } from "@/lib/validation/trip";

export type PlanState = { error?: string };

export async function generateTrip(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const user = await requireUser();

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
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the trip details.",
    };
  }

  const input = { ...parsed.data, notes: parsed.data.notes ?? null };
  const itinerary = await generateItinerary(input);
  const trip = await createTrip(user.id, input, itinerary);

  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}
