import { describe, expect, it } from "vitest";
import {
  itineraryToRpc,
  tripFromRow,
  tripToRpc,
  type TripRow,
} from "@/lib/domain/mappers/trips";
import type { Itinerary, TripInput } from "@/types/trip";

const input: TripInput = {
  title: "Long weekend",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  budgetPerPerson: 1500,
  groupType: "family",
  numAdults: 2,
  numChildren: 1,
  interests: ["food", "culture"],
  pace: "moderate",
  notes: "no museums",
};

const itinerary: Itinerary = {
  id: "client-id-must-not-be-sent",
  version: 7, // must not be sent: the database assigns versions
  generatedBy: "ai",
  model: null,
  requestSummary: "3 days",
  createdAt: "2026-01-01T00:00:00Z",
  days: [
    {
      dayNumber: 1,
      date: "2026-12-01",
      summary: "Arrive",
      items: [
        {
          id: "client-item-id",
          type: "attraction",
          startTime: "10:00",
          endTime: "12:30",
          durationMinutes: 150,
          title: "Museum",
          description: "d",
          whyRecommended: null,
          estimatedCost: 90,
          locationLabel: "City",
          attractionSlug: "borneo-cultures-museum",
          attractionId: "22222222-0000-0000-0000-000000000002",
          experienceId: null,
          bookable: false,
        },
      ],
    },
  ],
};

describe("tripToRpc", () => {
  it("stores the group budget (per person x travellers) and never carries a user id", () => {
    const p = tripToRpc(input) as Record<string, unknown>;
    expect(p.budgetTotal).toBe(4500); // 1500 x (2 adults + 1 child)
    expect(p).not.toHaveProperty("userId");
    expect(p).toMatchObject({ title: "Long weekend", groupType: "family", pace: "moderate", interests: ["food", "culture"] });
  });

  it("keeps 'no budget' as null and rounds to cents", () => {
    expect((tripToRpc({ ...input, budgetPerPerson: null }) as Record<string, unknown>).budgetTotal).toBeNull();
    expect((tripToRpc({ ...input, budgetPerPerson: 100.005, numAdults: 1, numChildren: 0 }) as Record<string, unknown>).budgetTotal).toBeCloseTo(100.01, 2);
  });
});

describe("itineraryToRpc", () => {
  it("omits ids and version (the database assigns them) and carries the attraction id", () => {
    const p = itineraryToRpc(itinerary) as { days: { items: Record<string, unknown>[] }[] } & Record<string, unknown>;
    expect(p).not.toHaveProperty("version");
    expect(p).not.toHaveProperty("id");
    const item = p.days[0].items[0];
    expect(item).not.toHaveProperty("id");
    expect(item.attractionId).toBe("22222222-0000-0000-0000-000000000002");
    expect(item.type).toBe("attraction");
  });
});

const row = (over: Partial<TripRow> = {}): TripRow => ({
  id: "t1",
  user_id: "u1",
  title: "Long weekend",
  destination: "Kuching",
  start_date: "2026-12-01",
  end_date: "2026-12-03",
  budget_total: 4500,
  currency: "MYR",
  group_type: "family",
  num_adults: 2,
  num_children: 1,
  interests: ["food", "not-a-category", "culture"],
  pace: "moderate",
  notes: null,
  status: "planned",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  itineraries: [
    {
      id: "old",
      trip_id: "t1",
      version: 1,
      generated_by: "ai",
      model: null,
      request_summary: null,
      is_current: false,
      created_at: "2026-01-01T00:00:00Z",
      itinerary_days: [],
    },
    {
      id: "cur",
      trip_id: "t1",
      version: 2,
      generated_by: "user",
      model: "m",
      request_summary: "sum",
      is_current: true,
      created_at: "2026-01-02T00:00:00Z",
      itinerary_days: [
        {
          id: "d2",
          itinerary_id: "cur",
          day_number: 2,
          date: "2026-12-02",
          summary: null,
          itinerary_items: [],
        },
        {
          id: "d1",
          itinerary_id: "cur",
          day_number: 1,
          date: "2026-12-01",
          summary: "Arrive",
          itinerary_items: [
            { id: "b", itinerary_day_id: "d1", sort_order: 1, start_time: "17:30:00", end_time: "20:30:00", duration_minutes: 180, item_type: "experience", attraction_id: null, experience_id: "e1", title: "Food walk", description: null, why_recommended: "yum", estimated_cost: "450.00" as never, location_label: null, lat: null, lng: null, is_bookable: true, booking_id: null, created_at: "x", attraction: null },
            { id: "a", itinerary_day_id: "d1", sort_order: 0, start_time: "10:00:00", end_time: null, duration_minutes: null, item_type: "attraction", attraction_id: "att1", experience_id: null, title: "Museum", description: "d", why_recommended: null, estimated_cost: 90, location_label: "City", lat: null, lng: null, is_bookable: false, booking_id: null, created_at: "x", attraction: null },
          ],
        },
      ],
    },
  ],
  ...over,
});

describe("tripFromRow", () => {
  it("picks the current itinerary and sorts days and items", () => {
    const t = tripFromRow(row());
    expect(t.itinerary?.id).toBe("cur");
    expect(t.itinerary?.version).toBe(2);
    expect(t.itinerary?.generatedBy).toBe("user");
    expect(t.itinerary?.days.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(t.itinerary?.days[0].items.map((i) => i.title)).toEqual(["Museum", "Food walk"]);
  });

  it("trims Postgres times, coerces numerics, and defaults missing text", () => {
    const [museum, food] = tripFromRow(row()).itinerary!.days[0].items;
    expect(food).toMatchObject({ startTime: "17:30", endTime: "20:30", estimatedCost: 450, bookable: true, experienceId: "e1" });
    expect(museum).toMatchObject({ startTime: "10:00", endTime: "", durationMinutes: 0, description: "d" });
    expect(tripFromRow(row()).itinerary!.days[1].summary).toBe("");
  });

  it("recovers the per-person budget, drops unknown interests, keeps null itinerary null", () => {
    const t = tripFromRow(row({ itineraries: [] }));
    expect(t.budgetPerPerson).toBe(1500);
    expect(t.interests).toEqual(["food", "culture"]);
    expect(t.itinerary).toBeNull();
    expect(tripFromRow(row({ budget_total: null })).budgetPerPerson).toBeNull();
  });

  it("keeps the attraction id even when the slug is hidden (unpublished attraction)", () => {
    const item = tripFromRow(row()).itinerary!.days[0].items[0];
    expect(item.attractionSlug).toBeNull();
    expect(item.attractionId).toBe("att1");
  });

  it("round-trips the budget through the RPC shape", () => {
    const stored = (tripToRpc(input) as { budgetTotal: number }).budgetTotal;
    expect(tripFromRow(row({ budget_total: stored })).budgetPerPerson).toBe(input.budgetPerPerson);
  });
});
