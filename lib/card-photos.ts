import { coverPhoto, DEFAULT_PHOTO, eateryPhoto } from "@/lib/photo-credits";
import type { Attraction, Experience } from "@/types/catalogue";
import type { Eatery } from "@/types/eatery";
import type { ItineraryItem, Trip } from "@/types/trip";

/**
 * Photos for cards that aren't catalogue cards themselves (trips, bookings, itinerary stops):
 * they borrow the photo of the place / experience / eatery they point at. Build the index once
 * per page from the catalogue lists the page already loads.
 */
export interface PhotoIndex {
  attraction: Map<string, string>; // by id and by slug
  experience: Map<string, string>; // by id and by slug
  eatery: Map<string, string>; // by lower-cased name
}

export function buildPhotoIndex({
  attractions = [],
  experiences = [],
  eateries = [],
}: {
  attractions?: Attraction[];
  experiences?: Experience[];
  eateries?: Eatery[];
}): PhotoIndex {
  const attraction = new Map<string, string>();
  for (const a of attractions) {
    const src = coverPhoto(a.images[0]?.url, a.categories[0]).src;
    attraction.set(a.id, src).set(a.slug, src);
  }
  const experience = new Map<string, string>();
  for (const e of experiences) {
    const src = coverPhoto(e.images[0]?.url, e.categories[0]).src;
    experience.set(e.id, src).set(e.slug, src);
  }
  const eatery = new Map<string, string>();
  for (const e of eateries) eatery.set(e.name.toLowerCase(), eateryPhoto(e.dishes));
  return { attraction, experience, eatery };
}

/** Meals in a plan are titled "Lunch at <place>" / "Dinner at <place>" (lib/ai/itinerary). */
const MEAL_TITLE = /^(?:lunch|dinner|breakfast) at (.+)$/i;

/** The photo for one itinerary stop, or null for transport / free time (no picture to show). */
export function itemPhoto(item: ItineraryItem, idx: PhotoIndex): string | null {
  if (item.experienceId) {
    return idx.experience.get(item.experienceId) ?? coverPhoto(null, "adventure").src;
  }
  if (item.type === "attraction") {
    return (
      (item.attractionId && idx.attraction.get(item.attractionId)) ||
      (item.attractionSlug && idx.attraction.get(item.attractionSlug)) ||
      DEFAULT_PHOTO
    );
  }
  if (item.type === "meal") {
    const name = MEAL_TITLE.exec(item.title)?.[1]?.toLowerCase();
    return (name && idx.eatery.get(name)) || coverPhoto(null, "food").src;
  }
  return null;
}

/** A trip's cover: its first place or experience with a photo, else Kuching's riverfront. */
export function tripCover(trip: Trip, idx: PhotoIndex): string {
  for (const day of trip.itinerary?.days ?? []) {
    for (const item of day.items) {
      if (item.type !== "attraction" && item.type !== "experience") continue;
      const src = itemPhoto(item, idx);
      if (src) return src;
    }
  }
  return DEFAULT_PHOTO;
}

/** A booking's photo: the booked experience's. */
export function bookingPhoto(experienceSlug: string, idx: PhotoIndex): string {
  return idx.experience.get(experienceSlug) ?? DEFAULT_PHOTO;
}
