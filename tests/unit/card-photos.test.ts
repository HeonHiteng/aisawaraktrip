import { describe, expect, it } from "vitest";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { demoEateries } from "@/lib/demo/eateries";
import { bookingPhoto, buildPhotoIndex, itemPhoto, tripCover } from "@/lib/card-photos";
import { CATEGORY_PHOTO, DEFAULT_PHOTO, eateryPhoto } from "@/lib/photo-credits";
import type { ItineraryItem, Trip } from "@/types/trip";

const idx = buildPhotoIndex({
  attractions: demoAttractions,
  experiences: demoExperiences,
  eateries: demoEateries,
});

function item(over: Partial<ItineraryItem>): ItineraryItem {
  return {
    id: "i1", type: "free_time", startTime: "09:00", endTime: "10:00", durationMinutes: 60,
    title: "", description: "", whyRecommended: null, estimatedCost: 0, locationLabel: null,
    attractionSlug: null, attractionId: null, experienceId: null, bookable: false,
    ...over,
  };
}

describe("card photos for trips, bookings and itinerary stops", () => {
  const fort = demoAttractions.find((a) => a.slug === "fort-margherita")!;
  const exp = demoExperiences[0]!;
  const eatery = demoEateries[0]!;

  it("a stop borrows the photo of what it points at", () => {
    expect(itemPhoto(item({ type: "attraction", attractionSlug: fort.slug }), idx)).toBe(fort.images[0]!.url);
    expect(itemPhoto(item({ type: "attraction", attractionId: fort.id }), idx)).toBe(fort.images[0]!.url);
    expect(itemPhoto(item({ type: "experience", experienceId: exp.id }), idx)).toBe(exp.images[0]!.url);
    expect(itemPhoto(item({ type: "meal", title: `Lunch at ${eatery.name}` }), idx)).toBe(eateryPhoto(eatery.dishes));
  });

  it("unknown places still get a photo; transport and free time get none", () => {
    expect(itemPhoto(item({ type: "attraction", attractionSlug: "gone" }), idx)).toBe(DEFAULT_PHOTO);
    expect(itemPhoto(item({ type: "meal", title: "Dinner at Somewhere New" }), idx)).toBe(CATEGORY_PHOTO.food);
    expect(itemPhoto(item({ type: "transport" }), idx)).toBeNull();
    expect(itemPhoto(item({ type: "free_time" }), idx)).toBeNull();
  });

  it("a trip's cover is its first place, else the riverfront; a booking shows its experience", () => {
    const trip = {
      itinerary: { days: [{ dayNumber: 1, date: "2026-11-12", summary: "", items: [
        item({ type: "meal", title: `Lunch at ${eatery.name}` }),
        item({ type: "attraction", attractionSlug: fort.slug }),
      ] }] },
    } as unknown as Trip;
    expect(tripCover(trip, idx)).toBe(fort.images[0]!.url);
    expect(tripCover({ itinerary: null } as unknown as Trip, idx)).toBe(DEFAULT_PHOTO);
    expect(bookingPhoto(exp.slug, idx)).toBe(exp.images[0]!.url);
    expect(bookingPhoto("unknown", idx)).toBe(DEFAULT_PHOTO);
  });
});
