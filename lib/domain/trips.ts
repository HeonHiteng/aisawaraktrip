import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/domain/mappers/catalogue";
import {
  TRIP_SELECT,
  itineraryToRpc,
  tripFromRow,
  tripToRpc,
  type TripRow,
} from "@/lib/domain/mappers/trips";
import type { Itinerary, Trip, TripInput, TripStatus } from "@/types/trip";

/**
 * Trips + itineraries. Demo mode = the per-user in-memory store. Real mode goes
 * through the signed-in user's own Supabase client, so RLS (owner-only) is a second
 * lock behind the `user_id` filters below; the tree is written by the
 * `create_trip` / `save_itinerary` SQL functions (one transaction, version
 * assigned by the database).
 */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function listTrips(userId: string): Promise<Trip[]> {
  if (DEMO_MODE) {
    return [...demoStoreFor(userId).trips].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  const db = await createClient();
  const { data, error } = await db
    .from("trips")
    .select(TRIP_SELECT)
    .eq("user_id", userId) // explicit: an admin's RLS would otherwise show everyone's
    .eq("itineraries.is_current", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`trips: ${error.message}`);
  return (data as unknown as TripRow[]).map(tripFromRow);
}

export async function getTrip(
  userId: string,
  tripId: string,
): Promise<Trip | null> {
  if (DEMO_MODE) {
    return demoStoreFor(userId).trips.find((t) => t.id === tripId) ?? null;
  }
  if (!isUuid(tripId)) return null; // ids come from URLs
  const db = await createClient();
  const { data, error } = await db
    .from("trips")
    .select(TRIP_SELECT)
    .eq("id", tripId)
    .eq("user_id", userId)
    .eq("itineraries.is_current", true)
    .maybeSingle();
  if (error) throw new Error(`trip: ${error.message}`);
  return data ? tripFromRow(data as unknown as TripRow) : null;
}

export async function createTrip(
  userId: string,
  input: TripInput,
  itinerary: Itinerary,
): Promise<Trip> {
  if (DEMO_MODE) {
    const trip: Trip = {
      ...input,
      id: uid(),
      userId,
      destination: "Kuching",
      currency: "MYR",
      status: "planned",
      createdAt: new Date().toISOString(),
      itinerary,
    };
    demoStoreFor(userId).trips.unshift(trip);
    return trip;
  }
  const db = await createClient();
  const { data: id, error } = await db.rpc("create_trip", {
    p_trip: tripToRpc(input),
    p_itinerary: itineraryToRpc(itinerary),
  });
  if (error) throw new Error(`create trip: ${error.message}`);
  const trip = await getTrip(userId, id);
  if (!trip) throw new Error("create trip: saved but could not be read back");
  return trip;
}

export async function updateItinerary(
  userId: string,
  tripId: string,
  itinerary: Itinerary,
): Promise<void> {
  if (DEMO_MODE) {
    const t = demoStoreFor(userId).trips.find((x) => x.id === tripId);
    if (t) t.itinerary = itinerary;
    return;
  }
  if (!isUuid(tripId)) return;
  const db = await createClient();
  const { error } = await db.rpc("save_itinerary", {
    p_trip_id: tripId,
    p_itinerary: itineraryToRpc(itinerary),
  });
  if (error) throw new Error(`save itinerary: ${error.message}`);
}

export async function setTripStatus(
  userId: string,
  tripId: string,
  status: TripStatus,
): Promise<void> {
  if (DEMO_MODE) {
    const t = demoStoreFor(userId).trips.find((x) => x.id === tripId);
    if (t) t.status = status;
    return;
  }
  if (!isUuid(tripId)) return;
  const db = await createClient();
  const { error } = await db
    .from("trips")
    .update({ status })
    .eq("id", tripId)
    .eq("user_id", userId);
  if (error) throw new Error(`trip status: ${error.message}`);
}

export async function deleteTrip(
  userId: string,
  tripId: string,
): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStoreFor(userId);
    s.trips = s.trips.filter((t) => t.id !== tripId);
    return;
  }
  if (!isUuid(tripId)) return;
  const db = await createClient();
  const { error } = await db
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", userId);
  if (error) throw new Error(`delete trip: ${error.message}`);
}
