import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import { getExperienceById } from "@/lib/domain/catalogue";
import { weekdayKey } from "@/lib/format";
import {
  priceBooking,
  type Booking,
  type BookingInput,
  type BookingStatus,
} from "@/types/booking";

const DAY_NAME: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function listBookings(userId: string): Promise<Booking[]> {
  if (DEMO_MODE) {
    return [...demoStoreFor(userId).bookings].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  return []; // TODO(phase-6): supabase select from bookings
}

export async function bookingsForTrip(
  userId: string,
  tripId: string,
): Promise<Booking[]> {
  if (DEMO_MODE) {
    return demoStoreFor(userId).bookings.filter(
      (b) => b.tripId === tripId && b.status !== "cancelled",
    );
  }
  return [];
}

export async function getBooking(
  userId: string,
  bookingId: string,
): Promise<Booking | null> {
  if (DEMO_MODE) {
    return (
      demoStoreFor(userId).bookings.find((b) => b.id === bookingId) ?? null
    );
  }
  return null;
}

export async function createBooking(
  userId: string,
  input: BookingInput,
): Promise<Booking | { error: string }> {
  const experience = await getExperienceById(input.experienceId);
  if (!experience) return { error: "That experience could not be found." };

  const numPax = input.numAdults + input.numChildren;
  if (numPax < experience.minPax || numPax > experience.maxPax) {
    return {
      error: `This experience takes ${experience.minPax}–${experience.maxPax} people.`,
    };
  }

  const days = experience.availability.days ?? [];
  const picked = weekdayKey(input.bookingDate);
  if (days.length && !days.includes(picked)) {
    return {
      error: `This experience doesn't run on ${DAY_NAME[picked] ?? "that day"}. It runs ${days.map((d) => DAY_NAME[d] ?? d).join(", ")}.`,
    };
  }

  const times = experience.availability.times ?? [];
  if (times.length && !times.includes(input.startTime)) {
    return { error: "Pick one of the listed start times." };
  }

  // Price is snapshotted server-side from the catalogue — never trusted from the client.
  const { subtotal, serviceFee, totalAmount } = priceBooking(
    experience.pricePerPerson,
    numPax,
  );

  const booking: Booking = {
    ...input,
    id: uid(),
    userId,
    experienceTitle: experience.title,
    experienceSlug: experience.slug,
    vendorName: experience.vendor.name,
    locationName: experience.location?.name ?? null,
    unitPrice: experience.pricePerPerson,
    numPax,
    subtotal,
    serviceFee,
    totalAmount,
    currency: experience.currency,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (DEMO_MODE) {
    demoStoreFor(userId).bookings.unshift(booking);
  }
  // TODO(phase-6): insert into Supabase; TODO(phase-7): payment then -> confirmed
  return booking;
}

export async function setBookingStatus(
  userId: string,
  bookingId: string,
  status: BookingStatus,
  reason?: string,
): Promise<void> {
  if (DEMO_MODE) {
    const b = demoStoreFor(userId).bookings.find((x) => x.id === bookingId);
    if (b) {
      b.status = status;
      if (reason && status === "cancelled") b.specialRequests = reason;
    }
  }
  // TODO(phase-6): update via status-transition-guarded path
}
