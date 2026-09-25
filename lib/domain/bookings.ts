import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExperienceById } from "@/lib/domain/catalogue";
import { getTrip } from "@/lib/domain/trips";
import { isUuid } from "@/lib/domain/mappers/catalogue";
import { bookingFromRow, bookingToInsert } from "@/lib/domain/mappers/bookings";
import { weekdayKey } from "@/lib/format";
import {
  priceBooking,
  type Booking,
  type BookingInput,
  type BookingStatus,
} from "@/types/booking";

/**
 * Bookings. Demo mode = the per-user in-memory store.
 *
 * Real mode: READS go through the signed-in user's own client (RLS: owner only,
 * plus an explicit `user_id` filter). WRITES go through the service role, because
 * clients have no write privileges on `bookings` at all (see migration 0008) —
 * that is what stops anyone POSTing a confirmed RM0 booking with the public key.
 * Every write below re-derives identity from the session (`userId`) and prices
 * from the catalogue; nothing money-related comes from the request.
 */

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
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`bookings: ${error.message}`);
  return data.map(bookingFromRow);
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
  if (!isUuid(tripId)) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .neq("status", "cancelled");
  if (error) throw new Error(`trip bookings: ${error.message}`);
  return data.map(bookingFromRow);
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
  if (!isUuid(bookingId)) return null; // ids come from URLs
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`booking: ${error.message}`);
  return data ? bookingFromRow(data) : null;
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

  // A booking may only hang off one of the caller's OWN trips: settling it later
  // flips that trip to "booked", and a foreign trip id must never get that far.
  const tripId =
    input.tripId && (await getTrip(userId, input.tripId)) ? input.tripId : null;

  // Price is snapshotted server-side from the catalogue — never trusted from the client.
  const { subtotal, serviceFee, totalAmount } = priceBooking(
    experience.pricePerPerson,
    numPax,
  );

  if (DEMO_MODE) {
    const booking: Booking = {
      ...input,
      tripId,
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
    demoStoreFor(userId).bookings.unshift(booking);
    return booking;
  }

  const { data, error } = await createAdminClient()
    .from("bookings")
    .insert(
      bookingToInsert(
        userId,
        { ...input, tripId },
        {
          experienceTitle: experience.title,
          experienceSlug: experience.slug,
          vendorName: experience.vendor.name,
          locationName: experience.location?.name ?? null,
          unitPrice: experience.pricePerPerson,
          subtotal,
          serviceFee,
          totalAmount,
          currency: experience.currency,
        },
      ),
    )
    .select("*")
    .single();
  if (error) throw new Error(`create booking: ${error.message}`);
  return bookingFromRow(data);
}

/**
 * The traveller-facing status change. Only cancelling is available to a traveller,
 * and only for their own pending/confirmed booking — the guard is in the UPDATE's
 * WHERE clause, so it is one atomic statement (no read-then-write race). Admins
 * change status through `lib/domain/admin`.
 */
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
    return;
  }
  if (status !== "cancelled") {
    throw new Error("Travellers can only cancel a booking.");
  }
  if (!isUuid(bookingId)) return;
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ status: "cancelled", cancellation_reason: reason ?? null })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .in("status", ["pending", "confirmed"]);
  if (error) throw new Error(`cancel booking: ${error.message}`);
}
