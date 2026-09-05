import { describe, expect, it } from "vitest";
import {
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  setTripStatus,
  updateItinerary,
} from "@/lib/domain/trips";
import { buildItinerary } from "@/lib/ai/itinerary";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import type { TripInput } from "@/types/trip";

let seq = 0;
const nextUser = () => `trips-domain-user-${Date.now()}-${seq++}`;

const candidates = { experiences: demoExperiences, attractions: demoAttractions };

function tripInput(overrides: Partial<TripInput> = {}): TripInput {
  return {
    title: "Test trip",
    startDate: "2026-12-14",
    endDate: "2026-12-16",
    budgetPerPerson: 1500,
    groupType: "couple",
    numAdults: 2,
    numChildren: 0,
    interests: ["food", "nature", "culture"],
    pace: "moderate",
    notes: null,
    ...overrides,
  };
}

describe("createTrip / getTrip / listTrips", () => {
  it("creates a trip owned by the given user, newest first", async () => {
    const userId = nextUser();
    const input = tripInput();
    const itinerary = buildItinerary(input, candidates);
    const trip = await createTrip(userId, input, itinerary);

    expect(trip.userId).toBe(userId);
    expect(trip.status).toBe("planned");
    expect(trip.itinerary?.id).toBe(itinerary.id);

    const second = await createTrip(userId, tripInput({ title: "Second" }), itinerary);
    const list = await listTrips(userId);
    expect(list[0].id).toBe(second.id); // newest first
    expect(list.some((t) => t.id === trip.id)).toBe(true);
  });

  it("isolates trips per user", async () => {
    const userA = nextUser();
    const userB = nextUser();
    const input = tripInput();
    const trip = await createTrip(userA, input, buildItinerary(input, candidates));

    expect(await getTrip(userA, trip.id)).not.toBeNull();
    expect(await getTrip(userB, trip.id)).toBeNull();
  });
});

describe("updateItinerary / setTripStatus / deleteTrip", () => {
  it("replaces the stored itinerary", async () => {
    const userId = nextUser();
    const input = tripInput();
    const trip = await createTrip(userId, input, buildItinerary(input, candidates));

    const revised = { ...trip.itinerary!, version: 99 };
    await updateItinerary(userId, trip.id, revised);
    expect((await getTrip(userId, trip.id))?.itinerary?.version).toBe(99);
  });

  it("updates trip status", async () => {
    const userId = nextUser();
    const input = tripInput();
    const trip = await createTrip(userId, input, buildItinerary(input, candidates));

    await setTripStatus(userId, trip.id, "booked");
    expect((await getTrip(userId, trip.id))?.status).toBe("booked");
  });

  it("removes the trip", async () => {
    const userId = nextUser();
    const input = tripInput();
    const trip = await createTrip(userId, input, buildItinerary(input, candidates));

    await deleteTrip(userId, trip.id);
    expect(await getTrip(userId, trip.id)).toBeNull();
    expect((await listTrips(userId)).some((t) => t.id === trip.id)).toBe(false);
  });
});
