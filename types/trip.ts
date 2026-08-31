import type { CategorySlug } from "@/types/catalogue";

export type GroupType =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "business";
export type TripPace = "relaxed" | "moderate" | "packed";
export type TripStatus =
  | "draft"
  | "planned"
  | "booked"
  | "completed"
  | "archived";

export const TRIP_STATUS_META: Record<
  TripStatus,
  { label: string; tone: "muted" | "violet" | "green" | "blue" }
> = {
  draft: { label: "Draft", tone: "muted" },
  planned: { label: "Planned", tone: "violet" },
  booked: { label: "Booked", tone: "green" },
  completed: { label: "Completed", tone: "blue" },
  archived: { label: "Archived", tone: "muted" },
};

export interface TripInput {
  title: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  budgetPerPerson: number | null;
  groupType: GroupType;
  numAdults: number;
  numChildren: number;
  interests: CategorySlug[];
  pace: TripPace;
  notes: string | null;
}

export type ItineraryItemType =
  | "attraction"
  | "experience"
  | "meal"
  | "transport"
  | "free_time";

export interface ItineraryItem {
  id: string;
  type: ItineraryItemType;
  startTime: string; // "09:00"
  endTime: string;
  durationMinutes: number;
  title: string;
  description: string;
  whyRecommended: string | null;
  estimatedCost: number; // MYR, for the whole group
  locationLabel: string | null;
  attractionSlug: string | null;
  experienceId: string | null;
  bookable: boolean;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  summary: string;
  items: ItineraryItem[];
}

export interface Itinerary {
  id: string;
  version: number;
  generatedBy: "ai" | "user";
  model: string | null;
  requestSummary: string;
  days: ItineraryDay[];
  createdAt: string;
}

export interface Trip extends TripInput {
  id: string;
  userId: string;
  destination: string;
  currency: string;
  status: TripStatus;
  createdAt: string;
  itinerary: Itinerary | null;
}

export function tripNights(trip: Pick<Trip, "startDate" | "endDate">): number {
  const a = new Date(trip.startDate);
  const b = new Date(trip.endDate);
  return Math.max(
    1,
    Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1,
  );
}

export function itineraryTotal(itinerary: Itinerary | null): number {
  if (!itinerary) return 0;
  return itinerary.days.reduce(
    (sum, d) => sum + d.items.reduce((s, i) => s + i.estimatedCost, 0),
    0,
  );
}

export function dayTotal(day: ItineraryDay): number {
  return day.items.reduce((s, i) => s + i.estimatedCost, 0);
}

/** Distinct bookable experiences in an itinerary, in day order (deduped). */
export function bookableExperiences(
  itinerary: Itinerary | null,
): { experienceId: string; title: string }[] {
  if (!itinerary) return [];
  const seen = new Set<string>();
  const out: { experienceId: string; title: string }[] = [];
  for (const day of itinerary.days) {
    for (const item of day.items) {
      if (item.bookable && item.experienceId && !seen.has(item.experienceId)) {
        seen.add(item.experienceId);
        out.push({ experienceId: item.experienceId, title: item.title });
      }
    }
  }
  return out;
}
