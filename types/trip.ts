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
