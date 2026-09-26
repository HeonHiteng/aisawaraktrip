import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { Booking, BookingInput } from "@/types/booking";
import type { TripInput } from "@/types/trip";

/**
 * The money path, for real: real guests, real Supabase, real SQL functions.
 * Only two things are swapped: the cookie session (for a throwaway guest's
 * client) and the email sender (so we can count how many are sent).
 */

const state = vi.hoisted(() => ({ current: null as unknown, emails: [] as string[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));
vi.mock("@/lib/email", () => ({
  sendBookingConfirmation: async (b: { id: string }) => {
    state.emails.push(b.id);
  },
}));

import {
  bookingsForTrip,
  createBooking,
  getBooking,
  listBookings,
  setBookingStatus,
} from "@/lib/domain/bookings";
import {
  getPaymentForBooking,
  settlePayment,
  startPayment,
} from "@/lib/domain/payments";
import { createTrip, getTrip } from "@/lib/domain/trips";
import { generateItinerary } from "@/lib/ai/generate";
import { getExperience } from "@/lib/domain/catalogue";
import { weekdayKey } from "@/lib/format";

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

let alice: Awaited<ReturnType<typeof guest>>;
let bob: Awaited<ReturnType<typeof guest>>;
const as = (u: typeof alice) => (state.current = u.client);

let expId: string;
// Valid run days spread over the next weeks. Each booking takes the NEXT one, so the whole file
// never piles onto one slot (the food walk seats 10 per slot — capacity is enforced now).
const runDates: string[] = [];
let dateCursor = 0;
const nextDate = () => runDates[dateCursor++ % runDates.length];
let startTime: string;

const input = (over: Partial<BookingInput> = {}): BookingInput => ({
  experienceId: expId,
  tripId: null,
  bookingDate: nextDate(),
  startTime,
  numAdults: 2,
  numChildren: 0,
  customerName: "Alice Tester",
  customerEmail: "alice@example.test",
  customerPhone: null,
  specialRequests: null,
  ...over,
});

const tripInput: TripInput = {
  title: "Booking test trip",
  startDate: "2026-12-01",
  endDate: "2026-12-02",
  budgetPerPerson: 1500,
  groupType: "couple",
  numAdults: 2,
  numChildren: 0,
  interests: ["food"],
  pace: "moderate",
  notes: null,
};

async function book(over: Partial<BookingInput> = {}): Promise<Booking> {
  const r = await createBooking(alice.id, input(over));
  if ("error" in r) throw new Error(r.error);
  return r;
}

/** Start a payment and return the mock gateway's callback params for it. */
async function pay(b: Booking) {
  const started = await startPayment(alice.id, b.id, "mock");
  if ("error" in started) throw new Error(started.error);
  const q = new URL(started.redirectUrl, "http://x").searchParams;
  return { ref: q.get("ref")!, amount: q.get("amount")!, method: "mock" };
}

beforeAll(async () => {
  alice = await guest();
  bob = await guest();
  // the food walk runs Tue–Sat at 17:30, min 2 people, RM 150 each
  const exp = (await getExperience("kuching-heritage-street-food-walk"))!;
  expId = exp.id;
  startTime = exp.availability.times[0];
  for (let i = 30; i < 70; i++) {
    const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    if (exp.availability.days.includes(weekdayKey(d))) runDates.push(d);
  }
  expect(runDates.length).toBeGreaterThan(10);
});

afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id);
});

describe("createBooking (live)", () => {
  it("snapshots price and listing details server-side, and it is readable back", async () => {
    as(alice);
    const b = await book({ specialRequests: "vegetarian" });
    expect(b).toMatchObject({
      userId: alice.id,
      status: "pending",
      unitPrice: 150,
      numPax: 2,
      subtotal: 300,
      serviceFee: 18,
      totalAmount: 318,
      currency: "MYR",
      startTime,
      experienceSlug: "kuching-heritage-street-food-walk",
      vendorName: "Kuching Food Walks",
      locationName: "Kuching City Centre",
      specialRequests: "vegetarian",
    });
    expect(await getBooking(alice.id, b.id)).toEqual(b);
    expect((await listBookings(alice.id)).map((x) => x.id)).toContain(b.id);
  });

  it("enforces the experience's own rules", async () => {
    as(alice);
    expect(await createBooking(alice.id, input({ numAdults: 1 }))).toMatchObject({ error: expect.stringMatching(/takes 2/) });
    expect(await createBooking(alice.id, input({ numAdults: 9, numChildren: 9 }))).toMatchObject({ error: expect.stringMatching(/takes 2/) });
    const monday = new Date(Date.now() + 40 * 86_400_000);
    while (weekdayKey(monday.toISOString().slice(0, 10)) !== "mon") monday.setDate(monday.getDate() + 1);
    expect(await createBooking(alice.id, input({ bookingDate: monday.toISOString().slice(0, 10) }))).toMatchObject({ error: expect.stringMatching(/doesn't run on Monday/) });
    expect(await createBooking(alice.id, input({ startTime: "03:00" }))).toMatchObject({ error: expect.stringMatching(/start times/) });
    expect(await createBooking(alice.id, input({ experienceId: "exp-cruise" }))).toMatchObject({ error: expect.stringMatching(/could not be found/) });
  });

  it("a booking can only hang off the caller's OWN trip", async () => {
    as(bob);
    const bobsTrip = await createTrip(bob.id, tripInput, await generateItinerary(tripInput));
    as(alice);
    const mine = await createTrip(alice.id, tripInput, await generateItinerary(tripInput));

    expect((await book({ tripId: mine.id })).tripId).toBe(mine.id);
    expect((await book({ tripId: bobsTrip.id })).tripId).toBeNull(); // foreign trip id is dropped, not trusted
    expect((await book({ tripId: "not-a-uuid" })).tripId).toBeNull();
    expect((await bookingsForTrip(alice.id, mine.id)).length).toBe(1);
    expect(await bookingsForTrip(alice.id, bobsTrip.id)).toEqual([]);
  });

  it("other travellers cannot see or cancel it", async () => {
    as(alice);
    const b = await book();
    as(bob);
    expect(await getBooking(bob.id, b.id)).toBeNull();
    expect((await listBookings(bob.id)).map((x) => x.id)).not.toContain(b.id);
    await setBookingStatus(bob.id, b.id, "cancelled"); // silently matches nothing
    as(alice);
    expect((await getBooking(alice.id, b.id))?.status).toBe("pending");
  });
});

describe("payment settlement (live)", () => {
  it("start → settle confirms the booking, marks the trip booked and emails exactly once", async () => {
    as(alice);
    const trip = await createTrip(alice.id, tripInput, await generateItinerary(tripInput));
    const b = await book({ tripId: trip.id });
    const params = await pay(b);
    expect(params.amount).toBe("318");

    const p0 = await getPaymentForBooking(alice.id, b.id);
    expect(p0).toMatchObject({ status: "created", amount: 318, provider: "mock", providerRef: params.ref });

    const before = state.emails.length;
    expect(await settlePayment(alice.id, { ...params, outcome: "approve" })).toEqual({ status: "paid" });
    // the traveller's retry / a second tab / a webhook replay: idempotent, no second email
    expect(await settlePayment(alice.id, { ...params, outcome: "approve" })).toEqual({ status: "paid" });
    expect(state.emails.slice(before)).toEqual([b.id]);

    expect((await getBooking(alice.id, b.id))?.status).toBe("confirmed");
    expect(await getPaymentForBooking(alice.id, b.id)).toMatchObject({ status: "paid" });
    expect((await getTrip(alice.id, trip.id))?.status).toBe("booked");

    const { data: hist } = await admin.from("booking_status_history").select("from_status,to_status").eq("booking_id", b.id);
    expect(hist).toEqual([{ from_status: "pending", to_status: "confirmed" }]);
    expect(await startPayment(alice.id, b.id, "mock")).toEqual({ error: "This booking isn't awaiting payment." });
  });

  it("a tampered amount never confirms the booking", async () => {
    as(alice);
    const b = await book();
    const params = await pay(b);
    const before = state.emails.length;
    expect(await settlePayment(alice.id, { ...params, amount: "1", outcome: "approve" })).toEqual({ status: "failed" });
    expect((await getBooking(alice.id, b.id))?.status).toBe("pending");
    expect(await getPaymentForBooking(alice.id, b.id)).toMatchObject({ status: "failed" });
    expect(state.emails.length).toBe(before);
  });

  it("cancelled or failed attempts keep the booking pending; a later good attempt still works", async () => {
    as(alice);
    const b = await book();
    const params = await pay(b);
    expect(await settlePayment(alice.id, { ...params, outcome: "cancel" })).toEqual({ status: "cancelled" });
    expect(await settlePayment(alice.id, { ...params, outcome: "fail" })).toEqual({ status: "failed" });
    expect((await getBooking(alice.id, b.id))?.status).toBe("pending");
    expect(await settlePayment(alice.id, { ...params, outcome: "approve" })).toEqual({ status: "paid" });
    expect((await getBooking(alice.id, b.id))?.status).toBe("confirmed");
  });

  it("one traveller cannot settle another's payment reference", async () => {
    as(alice);
    const b = await book();
    const params = await pay(b);
    as(bob);
    expect(await settlePayment(bob.id, { ...params, outcome: "approve" })).toEqual({ status: "failed" });
    as(alice);
    expect((await getBooking(alice.id, b.id))?.status).toBe("pending");
  });

  it("money arriving for a booking cancelled mid-payment is flagged, and never revives it", async () => {
    as(alice);
    const b = await book();
    const params = await pay(b);
    await setBookingStatus(alice.id, b.id, "cancelled", "changed my mind");

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const before = state.emails.length;
    expect(await settlePayment(alice.id, { ...params, outcome: "approve" })).toEqual({ status: "paid" });
    expect(err.mock.calls.some((c) => String(c[0]).includes("refund needed"))).toBe(true);
    err.mockRestore();

    expect((await getBooking(alice.id, b.id))?.status).toBe("cancelled");
    expect(state.emails.length).toBe(before);
    expect(await getPaymentForBooking(alice.id, b.id)).toMatchObject({ status: "paid" });
  });
});

describe("reviews (live)", () => {
  it("need a confirmed booking; then one review each, blended into the rating; the database backs the gate", async () => {
    const { canReview, addReview, listReviews, ratingSummary } = await import("@/lib/domain/reviews");

    // a brand-new traveller, so "no booking yet" really is the starting point
    const carol = await guest();
    as(carol);
    expect(await canReview(carol.id, expId)).toMatchObject({ ok: false });

    const made = await createBooking(carol.id, input({ customerName: "Carol" }));
    if ("error" in made) throw new Error(made.error);
    const started = await startPayment(carol.id, made.id, "mock");
    if ("error" in started) throw new Error(started.error);
    const q = new URL(started.redirectUrl, "http://x").searchParams;
    const params = { ref: q.get("ref")!, amount: q.get("amount")!, method: "mock" };

    expect(await canReview(carol.id, expId)).toMatchObject({ ok: false }); // pending doesn't count
    await settlePayment(carol.id, { ...params, outcome: "approve" });
    expect(await canReview(carol.id, expId)).toEqual({ ok: true });

    const r = await addReview(carol.id, "Carol T.", { experienceId: expId, rating: 5, comment: "Brilliant evening, great food." });
    expect(r).toMatchObject({ authorName: "Carol T.", rating: 5, userId: carol.id });

    const list = await listReviews(expId);
    expect(list.map((x) => x.userId)).toContain(carol.id);
    // baseline 4.9 x 128 + this 5-star review -> still 4.9, over 129
    expect(await ratingSummary(expId)).toEqual({ average: 4.9, count: 129 });

    // once only — a friendly message, not an exception
    expect(await canReview(carol.id, expId)).toMatchObject({ ok: false });
    expect(await addReview(carol.id, "Carol T.", { experienceId: expId, rating: 1, comment: "Trying to review twice here." })).toMatchObject({ error: expect.stringMatching(/already reviewed/) });

    // someone who never booked
    const dave = await guest();
    as(dave);
    expect(await canReview(dave.id, expId)).toMatchObject({ ok: false });
    expect(await addReview(dave.id, "Dave", { experienceId: expId, rating: 5, comment: "Never went, reviewing anyway." })).toMatchObject({ error: expect.stringMatching(/once your booking/) });

    // even code that skipped the TypeScript gate can't: the database refuses (service role included)
    const { error } = await admin.from("reviews").insert({ experience_id: expId, user_id: dave.id, author_name: "Dave", rating: 5, comment: "Straight to the database." });
    expect(error?.message).toMatch(/requires a confirmed or completed booking/);
  });
});

describe("cancelling (live)", () => {
  it("a traveller cancels their own booking with a reason; nothing but cancelling is allowed", async () => {
    as(alice);
    const b = await book();
    await expect(setBookingStatus(alice.id, b.id, "confirmed")).rejects.toThrow(/only cancel/i);
    expect((await getBooking(alice.id, b.id))?.status).toBe("pending");

    await setBookingStatus(alice.id, b.id, "cancelled", "plans changed");
    expect((await getBooking(alice.id, b.id))?.status).toBe("cancelled");
    const { data } = await admin.from("bookings").select("cancellation_reason").eq("id", b.id).single();
    expect(data?.cancellation_reason).toBe("plans changed");

    // a completed/refunded/already-cancelled booking is not "cancellable" again
    await admin.from("bookings").update({ status: "completed" }).eq("id", b.id);
    await setBookingStatus(alice.id, b.id, "cancelled");
    expect((await getBooking(alice.id, b.id))?.status).toBe("completed");
  });

  it("junk ids are 'not found', never errors", async () => {
    as(alice);
    expect(await getBooking(alice.id, "demo-booking")).toBeNull();
    expect(await getBooking(alice.id, "' or 1=1 --")).toBeNull();
    expect(await getPaymentForBooking(alice.id, "nope")).toBeNull();
    expect(await bookingsForTrip(alice.id, "nope")).toEqual([]);
    await expect(setBookingStatus(alice.id, "nope", "cancelled")).resolves.toBeUndefined();
  });
});
