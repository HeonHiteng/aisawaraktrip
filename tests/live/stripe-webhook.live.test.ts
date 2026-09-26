import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { BookingInput } from "@/types/booking";

/**
 * The Stripe webhook, end to end on the REAL database: a correctly signed event confirms the
 * booking exactly once; a forged, tampered, replayed-with-wrong-amount or unknown one confirms
 * nothing. Only Stripe's network calls are absent (events are signed locally with the SDK).
 */

const SECRET = "whsec_live_test_secret";
vi.stubEnv("PAYMENT_PROVIDER", "stripe");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_never_called");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);

const state = vi.hoisted(() => ({ current: null as unknown, emails: [] as string[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));
vi.mock("@/lib/email", () => ({ sendBookingConfirmation: async (b: { id: string }) => void state.emails.push(b.id) }));

import { POST } from "@/app/api/payments/webhook/route";
import { createBooking } from "@/lib/domain/bookings";
import { getExperience } from "@/lib/domain/catalogue";
import { weekdayKey } from "@/lib/format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);
const sdk = new Stripe("sk_test_dummy");

const users: string[] = [];
let client: SupabaseClient<Database>;
let userId = "";
let experienceId = "";
let startTime = "";
const runDays: string[] = [];
let cursor = 0;

beforeAll(async () => {
  client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  userId = data.user.id;
  users.push(userId);
  state.current = client;
  const e = (await getExperience("kuching-heritage-street-food-walk"))!;
  experienceId = e.id;
  startTime = e.availability.times[0];
  for (let i = 140; i < 200; i++) {
    const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    if (e.availability.days.includes(weekdayKey(d))) runDays.push(d);
  }
});

afterAll(async () => {
  for (const id of users) await svc.auth.admin.deleteUser(id); // bookings + payments cascade
});

/** A pending booking with a Stripe payment row waiting, as `startPayment` would leave it. */
async function pendingStripeBooking() {
  const input: BookingInput = {
    experienceId, tripId: null, bookingDate: runDays[cursor++], startTime,
    numAdults: 2, numChildren: 0, customerName: "Hook Tester", customerEmail: "hook@example.test",
    customerPhone: null, specialRequests: null,
  };
  const b = await createBooking(userId, input);
  if ("error" in b) throw new Error(b.error);
  const ref = `cs_test_${Math.random().toString(36).slice(2, 14)}`;
  const { error } = await svc.from("payments").insert({
    booking_id: b.id, provider: "stripe", provider_ref: ref, amount: b.totalAmount, currency: "MYR", method: "card", status: "created",
  });
  if (error) throw new Error(error.message);
  return { id: b.id, ref, amount: b.totalAmount };
}

const sessionEvent = (type: string, ref: string, amountMyr: number, payment_status: "paid" | "unpaid" = "paid") =>
  JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    object: "event",
    type,
    data: { object: { id: ref, object: "checkout.session", payment_status, status: "complete", amount_total: Math.round(amountMyr * 100), currency: "myr", payment_intent: `pi_${ref.slice(8)}`, payment_method_types: ["card"] } },
  });

const post = (payload: string, signature: string | null) =>
  POST(new NextRequest("http://localhost/api/payments/webhook", { method: "POST", body: payload, headers: signature ? { "stripe-signature": signature } : {} }));
const sign = (payload: string, secret = SECRET) => sdk.webhooks.generateTestHeaderString({ payload, secret });

const bookingStatus = async (id: string) => (await svc.from("bookings").select("status").eq("id", id).single()).data?.status;
const paymentStatus = async (id: string) => (await svc.from("payments").select("status, provider_payment_id").eq("booking_id", id).single()).data;

describe("Stripe webhook (live database)", () => {
  it("a correctly signed 'paid' event confirms the booking, and sends one confirmation", async () => {
    const b = await pendingStripeBooking();
    const payload = sessionEvent("checkout.session.completed", b.ref, b.amount);
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, status: "paid" });
    expect(await bookingStatus(b.id)).toBe("confirmed");
    expect(await paymentStatus(b.id)).toMatchObject({ status: "paid" });
    expect(state.emails.filter((e) => e === b.id)).toHaveLength(1);
  });

  it("Stripe delivering the same event again changes nothing and sends no second email", async () => {
    const b = await pendingStripeBooking();
    const payload = sessionEvent("checkout.session.completed", b.ref, b.amount);
    await post(payload, sign(payload));
    const again = await post(payload, sign(payload));
    expect(again.status).toBe(200);
    expect(await bookingStatus(b.id)).toBe("confirmed");
    expect(state.emails.filter((e) => e === b.id)).toHaveLength(1);
  });

  it("a forged, unsigned or tampered request is refused (400) and confirms nothing", async () => {
    const b = await pendingStripeBooking();
    const payload = sessionEvent("checkout.session.completed", b.ref, b.amount);
    expect((await post(payload, sign(payload, "whsec_attacker"))).status).toBe(400);
    expect((await post(payload, null)).status).toBe(400);
    expect((await post(payload.replace(/"amount_total":\d+/, '"amount_total":1'), sign(payload))).status).toBe(400);
    expect(await bookingStatus(b.id)).toBe("pending");
    expect(await paymentStatus(b.id)).toMatchObject({ status: "created" });
  });

  it("a signed event for the WRONG amount never confirms the booking", async () => {
    const b = await pendingStripeBooking();
    const payload = sessionEvent("checkout.session.completed", b.ref, 1); // RM 1 instead of the real total
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(await bookingStatus(b.id)).toBe("pending");
    expect((await paymentStatus(b.id))?.status).not.toBe("paid");
    expect(state.emails).not.toContain(b.id);
  });

  it("an event for a payment we never created is acknowledged and touches nothing", async () => {
    const payload = sessionEvent("checkout.session.completed", "cs_test_not_ours", 100);
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "failed" });
  });

  it("unrelated event types are acknowledged (200) and ignored", async () => {
    const payload = JSON.stringify({ id: "evt_x", object: "event", type: "customer.created", data: { object: { id: "cus_1", object: "customer" } } });
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: "customer.created" });
  });

  it("FPX-style: completed-but-unpaid keeps it pending; the later 'succeeded' event confirms it", async () => {
    const b = await pendingStripeBooking();
    const first = sessionEvent("checkout.session.completed", b.ref, b.amount, "unpaid");
    expect((await (await post(first, sign(first))).json()).status).toBe("pending");
    expect(await bookingStatus(b.id)).toBe("pending");
    const later = sessionEvent("checkout.session.async_payment_succeeded", b.ref, b.amount);
    expect((await (await post(later, sign(later))).json()).status).toBe("paid");
    expect(await bookingStatus(b.id)).toBe("confirmed");
  });

  it("a paid booking can't be un-paid by a later 'expired' or 'failed' event", async () => {
    const b = await pendingStripeBooking();
    const paid = sessionEvent("checkout.session.completed", b.ref, b.amount);
    await post(paid, sign(paid));
    const expired = sessionEvent("checkout.session.expired", b.ref, b.amount, "unpaid");
    await post(expired, sign(expired));
    expect(await bookingStatus(b.id)).toBe("confirmed");
    expect((await paymentStatus(b.id))?.status).toBe("paid");
  });
});
