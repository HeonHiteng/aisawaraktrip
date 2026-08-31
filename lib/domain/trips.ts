import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import type { Itinerary, Trip, TripInput, TripStatus } from "@/types/trip";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function listTrips(userId: string): Promise<Trip[]> {
  if (DEMO_MODE) {
    return [...demoStoreFor(userId).trips].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  return []; // TODO(phase-5): supabase select from trips
}

export async function getTrip(
  userId: string,
  tripId: string,
): Promise<Trip | null> {
  if (DEMO_MODE) {
    return demoStoreFor(userId).trips.find((t) => t.id === tripId) ?? null;
  }
  return null;
}

export async function createTrip(
  userId: string,
  input: TripInput,
  itinerary: Itinerary,
): Promise<Trip> {
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
  if (DEMO_MODE) {
    demoStoreFor(userId).trips.unshift(trip);
  }
  // TODO(phase-5): persist trip + itinerary/days/items to Supabase
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
  }
  // TODO(phase-5): upsert new itinerary version
}

export async function setTripStatus(
  userId: string,
  tripId: string,
  status: TripStatus,
): Promise<void> {
  if (DEMO_MODE) {
    const t = demoStoreFor(userId).trips.find((x) => x.id === tripId);
    if (t) t.status = status;
  }
}

export async function deleteTrip(
  userId: string,
  tripId: string,
): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStoreFor(userId);
    s.trips = s.trips.filter((t) => t.id !== tripId);
  }
  // TODO(phase-5): delete from Supabase (cascade)
}
