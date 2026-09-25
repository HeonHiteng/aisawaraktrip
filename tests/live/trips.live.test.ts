import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { TripInput } from "@/types/trip";

/**
 * Real domain code, real Supabase, real (anonymous) users. The cookie-based
 * server client is swapped for one signed in as a throwaway guest — everything
 * else (mappers, SQL functions, RLS) is the production path. Users are deleted
 * afterwards (their trips cascade).
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => state.current,
}));

import {
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  setTripStatus,
  updateItinerary,
} from "@/lib/domain/trips";
import { generateItinerary, refineItinerary } from "@/lib/ai/generate";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);
const created: string[] = [];

async function guest(): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  created.push(data.user.id);
  return { id: data.user.id, client };
}

const input: TripInput = {
  title: "Live test trip",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  budgetPerPerson: 1500,
  groupType: "couple",
  numAdults: 2,
  numChildren: 0,
  interests: ["food", "nature", "culture"],
  pace: "moderate",
  notes: null,
};

let alice: Awaited<ReturnType<typeof guest>>;
let bob: Awaited<ReturnType<typeof guest>>;
const as = (u: typeof alice) => (state.current = u.client);

beforeAll(async () => {
  alice = await guest();
  bob = await guest();
});

afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id);
});

describe("trips (live Supabase, real guests)", () => {
  it("creates a trip from the real builder and reads the same tree back", async () => {
    as(alice);
    const itinerary = await generateItinerary(input);
    const trip = await createTrip(alice.id, input, itinerary);

    expect(trip.userId).toBe(alice.id);
    expect(trip.status).toBe("planned");
    expect(trip.budgetPerPerson).toBe(1500);
    expect(trip.interests).toEqual(input.interests);
    expect(trip.itinerary?.version).toBe(1);
    expect(trip.itinerary?.days.map((d) => d.dayNumber)).toEqual([1, 2, 3]);

    // the saved tree matches what was built: same items, same order, same times
    const flat = (i: typeof itinerary) => i.days.map((d) => d.items.map((x) => [x.type, x.title, x.startTime, x.endTime, x.estimatedCost, x.experienceId, x.attractionId]));
    expect(flat(trip.itinerary!)).toEqual(flat(itinerary));
    // links survive: attraction items keep their slug, experiences keep their id
    const items = trip.itinerary!.days.flatMap((d) => d.items);
    expect(items.filter((i) => i.type === "attraction").every((i) => i.attractionSlug && i.attractionId)).toBe(true);
    expect(items.filter((i) => i.bookable).every((i) => i.experienceId)).toBe(true);

    expect(await getTrip(alice.id, trip.id)).toEqual(trip);
    expect((await listTrips(alice.id)).map((t) => t.id)).toContain(trip.id);
  });

  it("saving again adds version 2, keeps exactly one current, and refine works end to end", async () => {
    as(alice);
    const trip = await createTrip(alice.id, input, await generateItinerary(input));
    const { itinerary: refined } = await refineItinerary(trip.itinerary!, "add more food", input);
    await updateItinerary(alice.id, trip.id, refined);

    const after = await getTrip(alice.id, trip.id);
    expect(after?.itinerary?.version).toBe(2);
    const { data } = await admin.from("itineraries").select("version,is_current").eq("trip_id", trip.id).order("version");
    expect(data).toEqual([
      { version: 1, is_current: false },
      { version: 2, is_current: true },
    ]);
  });

  it("removing an item goes through the same path and persists", async () => {
    as(alice);
    const { removeItem } = await import("@/lib/ai/itinerary");
    const trip = await createTrip(alice.id, input, await generateItinerary(input));
    const victim = trip.itinerary!.days[0].items[0];
    await updateItinerary(alice.id, trip.id, removeItem(trip.itinerary!, victim.id));
    const after = (await getTrip(alice.id, trip.id))!;
    const total = (t: typeof after) => t.itinerary!.days.reduce((n, d) => n + d.items.length, 0);
    expect(total(after)).toBe(total(trip) - 1);
  });

  it("status changes persist; another traveller sees nothing and can change nothing", async () => {
    as(alice);
    const trip = await createTrip(alice.id, input, await generateItinerary(input));
    await setTripStatus(alice.id, trip.id, "booked");
    expect((await getTrip(alice.id, trip.id))?.status).toBe("booked");

    as(bob);
    expect(await getTrip(bob.id, trip.id)).toBeNull();
    expect((await listTrips(bob.id)).map((t) => t.id)).not.toContain(trip.id);
    await setTripStatus(bob.id, trip.id, "archived");
    await deleteTrip(bob.id, trip.id);
    // even claiming to be alice, bob's session can't reach alice's rows (RLS is the second lock)
    expect(await getTrip(alice.id, trip.id)).toBeNull();

    as(alice);
    const still = await getTrip(alice.id, trip.id);
    expect(still?.status).toBe("booked");
  });

  it("deleting removes the whole tree; junk ids are 'not found', not errors", async () => {
    as(alice);
    const trip = await createTrip(alice.id, input, await generateItinerary(input));
    await deleteTrip(alice.id, trip.id);
    expect(await getTrip(alice.id, trip.id)).toBeNull();
    const { count } = await admin.from("itineraries").select("id", { count: "exact", head: true }).eq("trip_id", trip.id);
    expect(count).toBe(0);

    expect(await getTrip(alice.id, "demo-trip-sample")).toBeNull();
    expect(await getTrip(alice.id, "' or 1=1 --")).toBeNull();
    await expect(updateItinerary(alice.id, "nope", (await generateItinerary(input)))).resolves.toBeUndefined();
  });
});
