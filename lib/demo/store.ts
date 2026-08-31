import "server-only";
import type { Booking } from "@/types/booking";
import type { Payment } from "@/types/payment";
import type { Trip } from "@/types/trip";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { buildItinerary } from "@/lib/ai/itinerary";
import { buildSeedHistory, SEED_USER_ID } from "@/lib/demo/seed-bookings";

/**
 * In-memory store for demo mode. Survives across requests within one running
 * server process; resets on restart. Never used when Supabase is configured.
 */
interface UserStore {
  trips: Trip[];
  bookings: Booking[];
  payments: Payment[];
}

const g = globalThis as unknown as {
  __demoStore?: Map<string, UserStore>;
  __demoSeeded?: boolean;
};
g.__demoStore ??= new Map<string, UserStore>();

// Historical bookings/payments so the admin dashboard has a real shape on a
// fresh server. Lives under a synthetic user that never signs in.
if (!g.__demoSeeded) {
  g.__demoSeeded = true;
  const { bookings, payments } = buildSeedHistory();
  g.__demoStore.set(SEED_USER_ID, { trips: [], bookings, payments });
}

function seedTrip(userId: string): Trip {
  const start = new Date();
  start.setDate(start.getDate() + 21);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const input = {
    title: "Long weekend in Kuching",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    budgetPerPerson: 1500,
    groupType: "couple" as const,
    numAdults: 2,
    numChildren: 0,
    interests: ["food", "nature", "culture"] as const,
    pace: "moderate" as const,
    notes: null,
  };
  return {
    ...input,
    interests: [...input.interests],
    id: "demo-trip-sample",
    userId,
    destination: "Kuching",
    currency: "MYR",
    status: "planned",
    createdAt: new Date().toISOString(),
    itinerary: buildItinerary(
      { ...input, interests: [...input.interests] },
      { experiences: demoExperiences, attractions: demoAttractions },
    ),
  };
}

export function demoStoreFor(userId: string): UserStore {
  const map = g.__demoStore!;
  if (!map.has(userId)) {
    map.set(userId, {
      trips: [seedTrip(userId)],
      bookings: [],
      payments: [],
    });
  }
  const store = map.get(userId)!;
  // Backfill keys added after a store entry was first created (HMR safety).
  store.trips ??= [];
  store.bookings ??= [];
  store.payments ??= [];
  return store;
}

/** Every booking across demo personas — used by the admin view. */
export function allDemoBookings() {
  return demoStores().flatMap((s) => s.bookings);
}

/** Every payment across demo personas. */
export function allDemoPayments() {
  return demoStores().flatMap((s) => s.payments);
}

/** All per-persona stores, for admin-side reads/writes. */
export function demoStores(): UserStore[] {
  return [...g.__demoStore!.values()].map((s) => {
    s.trips ??= [];
    s.bookings ??= [];
    s.payments ??= [];
    return s;
  });
}
