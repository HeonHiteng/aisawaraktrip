"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { generateItinerary, refineItinerary } from "@/lib/ai/generate";
import { getExperienceById } from "@/lib/domain/catalogue";
import {
  deleteTrip,
  getTrip,
  updateItinerary,
} from "@/lib/domain/trips";
import {
  addExperienceToDay,
  removeItem as removeItineraryItem,
} from "@/lib/ai/itinerary";
import { rateLimit } from "@/lib/rate-limit";
import { refineSchema } from "@/lib/validation/trip";

export type RefineState = { note?: string; error?: string };

function tripInputOf(t: NonNullable<Awaited<ReturnType<typeof getTrip>>>) {
  return {
    title: t.title,
    startDate: t.startDate,
    endDate: t.endDate,
    budgetPerPerson: t.budgetPerPerson,
    groupType: t.groupType,
    numAdults: t.numAdults,
    numChildren: t.numChildren,
    interests: t.interests,
    pace: t.pace,
    notes: t.notes,
  };
}

export async function refineTrip(
  _prev: RefineState,
  formData: FormData,
): Promise<RefineState> {
  const user = await requireUser();
  const rl = await rateLimit(`ai:refine:${user.id}`, 20, 60_000);
  if (!rl.ok) return { error: `Slow down — try again in ${rl.retryAfter}s.` };

  const tripId = String(formData.get("tripId") ?? "");
  const parsed = refineSchema.safeParse({
    instruction: formData.get("instruction"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const trip = await getTrip(user.id, tripId);
  if (!trip?.itinerary) return { error: "Trip not found." };

  const { itinerary, note } = await refineItinerary(
    trip.itinerary,
    parsed.data.instruction,
    tripInputOf(trip),
  );
  await updateItinerary(user.id, tripId, itinerary);
  revalidatePath(`/trips/${tripId}`);
  return { note };
}

export async function regenerateTrip(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  const trip = await getTrip(user.id, tripId);
  if (!trip) return;
  const itinerary = await generateItinerary(tripInputOf(trip));
  await updateItinerary(user.id, tripId, itinerary);
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTripItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const trip = await getTrip(user.id, tripId);
  if (!trip?.itinerary) return;
  await updateItinerary(
    user.id,
    tripId,
    removeItineraryItem(trip.itinerary, itemId),
  );
  revalidatePath(`/trips/${tripId}`);
}

export async function addExperienceToTrip(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  const dayNumber = Number(formData.get("dayNumber") ?? 0);
  const experienceId = String(formData.get("experienceId") ?? "");
  const [trip, exp] = await Promise.all([
    getTrip(user.id, tripId),
    getExperienceById(experienceId),
  ]);
  if (!trip?.itinerary || !exp) return;
  await updateItinerary(
    user.id,
    tripId,
    addExperienceToDay(trip.itinerary, dayNumber, exp, tripInputOf(trip)),
  );
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteTripAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  await deleteTrip(user.id, tripId);
  revalidatePath("/trips");
  redirect("/trips");
}
