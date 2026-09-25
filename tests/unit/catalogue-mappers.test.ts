import { describe, expect, it } from "vitest";
import {
  attractionFromRow,
  availabilityFromJson,
  availabilityToJson,
  experienceFromRow,
  groupImages,
  isUuid,
  openingHoursFromJson,
  type AttractionRow,
  type ExperienceRow,
} from "@/lib/domain/mappers/catalogue";

const expRow = (over: Partial<ExperienceRow> = {}): ExperienceRow => ({
  id: "44444444-0000-0000-0000-000000000001",
  vendor_id: "33333333-0000-0000-0000-000000000001",
  title: "Heritage Walk",
  slug: "heritage-walk",
  summary: "s",
  description: "d",
  location_id: null,
  address: null,
  lat: null,
  lng: null,
  duration_minutes: 180,
  price_per_person: 150,
  currency: "MYR",
  min_pax: 2,
  max_pax: 10,
  languages: ["English"],
  includes: ["Guide"],
  meeting_point: "Waterfront",
  cancellation_policy: "Free until 24h",
  availability: { days: ["tue", "wed"], times: ["17:30"], capacity_per_slot: 10 },
  booking_leadtime_hours: 24,
  rating: 4.9,
  review_count: 128,
  is_sample: true,
  is_published: true,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  vendor: {
    id: "33333333-0000-0000-0000-000000000001",
    name: "Kuching Food Walks",
    slug: "kuching-food-walks",
    verification_status: "verified",
    avatar_url: "https://x.test/a.jpg",
  },
  location: { id: "l1", name: "Kuching City Centre", area: "Kuching" },
  experience_categories: [
    { categories: { slug: "food" } },
    { categories: { slug: "heritage" } },
  ],
  ...over,
});

describe("availability json", () => {
  it("round-trips through the DB shape", () => {
    const a = { days: ["mon", "sat"], times: ["09:00", "14:00"], capacityPerSlot: 8 };
    expect(availabilityFromJson(availabilityToJson(a))).toEqual(a);
  });

  it("tolerates junk instead of throwing (admin-editable jsonb)", () => {
    for (const junk of [null, 5, "x", [], {}, { days: "tue", times: [1, "09:00"], capacity_per_slot: -3 }]) {
      const a = availabilityFromJson(junk as never);
      expect(Array.isArray(a.days)).toBe(true);
      expect(a.times.every((t) => typeof t === "string")).toBe(true);
      expect(a.capacityPerSlot).toBeGreaterThanOrEqual(0);
    }
    expect(availabilityFromJson({ days: "tue", times: [1, "09:00"] } as never).times).toEqual(["09:00"]);
  });
});

describe("experienceFromRow", () => {
  it("maps snake_case rows to the domain shape the screens use", () => {
    const e = experienceFromRow(expRow(), [{ url: "/demo/a.jpg", alt: "a" }]);
    expect(e).toMatchObject({
      id: "44444444-0000-0000-0000-000000000001",
      title: "Heritage Walk",
      pricePerPerson: 150,
      minPax: 2,
      maxPax: 10,
      bookingLeadtimeHours: 24,
      rating: 4.9,
      reviewCount: 128,
      isPublished: true,
      categories: ["food", "heritage"],
      images: [{ url: "/demo/a.jpg", alt: "a" }],
      vendor: { name: "Kuching Food Walks", verificationStatus: "verified", avatarUrl: "https://x.test/a.jpg" },
      location: { name: "Kuching City Centre", area: "Kuching" },
      availability: { days: ["tue", "wed"], times: ["17:30"], capacityPerSlot: 10 },
    });
  });

  it("drops unknown or duplicate categories and keeps a null rating null", () => {
    const e = experienceFromRow(
      expRow({
        rating: null,
        experience_categories: [
          { categories: { slug: "food" } },
          { categories: { slug: "food" } },
          { categories: { slug: "not-a-category" } },
          { categories: null },
        ],
      }),
    );
    expect(e.categories).toEqual(["food"]);
    expect(e.rating).toBeNull();
    expect(e.images).toEqual([]);
  });

  it("coerces numeric strings (Postgres numeric) to numbers", () => {
    const e = experienceFromRow(expRow({ price_per_person: "199.50" as never, rating: "4.7" as never }));
    expect(e.pricePerPerson).toBe(199.5);
    expect(e.rating).toBe(4.7);
  });
});

describe("attractionFromRow", () => {
  const row: AttractionRow = {
    id: "22222222-0000-0000-0000-000000000002",
    name: "Museum",
    slug: "museum",
    summary: null,
    description: null,
    location_id: null,
    address: "Jalan X",
    lat: 1.5,
    lng: 110.3,
    avg_visit_minutes: 150,
    price_min: 30,
    price_max: 50,
    is_free: false,
    booking_required: false,
    opening_hours: { tue_sun: "09:00-16:45", mon: "closed", junk: 5 },
    contact: {},
    tips: null,
    is_sample: true,
    is_published: true,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    location: null,
    attraction_categories: [{ categories: { slug: "culture" } }],
  };

  it("maps fields and keeps only string opening hours", () => {
    const a = attractionFromRow(row);
    expect(a).toMatchObject({
      name: "Museum",
      avgVisitMinutes: 150,
      priceMin: 30,
      priceMax: 50,
      location: null,
      categories: ["culture"],
    });
    expect(a.openingHours).toEqual({ tue_sun: "09:00-16:45", mon: "closed" });
    expect(openingHoursFromJson(null as never)).toEqual({});
  });
});

describe("groupImages", () => {
  it("groups by owner, primary first, then sort order", () => {
    const m = groupImages([
      { owner_id: "a", url: "2", alt: null, is_primary: false, sort_order: 2 },
      { owner_id: "a", url: "1", alt: null, is_primary: false, sort_order: 1 },
      { owner_id: "a", url: "P", alt: "p", is_primary: true, sort_order: 9 },
      { owner_id: "b", url: "B", alt: null, is_primary: false, sort_order: 0 },
    ]);
    expect(m.get("a")!.map((i) => i.url)).toEqual(["P", "1", "2"]);
    expect(m.get("b")!.map((i) => i.url)).toEqual(["B"]);
  });
});

describe("isUuid", () => {
  it("accepts uuids and rejects everything a URL could smuggle in", () => {
    expect(isUuid("44444444-0000-0000-0000-000000000001")).toBe(true);
    for (const bad of ["exp-cruise", "", "1", "44444444-0000-0000-0000-00000000000g", "' or 1=1 --", "44444444-0000-0000-0000-000000000001 "]) {
      expect(isUuid(bad)).toBe(false);
    }
  });
});
