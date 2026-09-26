import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { BookingInput } from "@/types/booking";

/**
 * Deleting an account on the REAL database: it removes everything, but refuses while a trip is
 * upcoming or a refund is owed. Users created here are removed afterwards.
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));
vi.mock("@/lib/email", () => ({ sendBookingConfirmation: async () => {} }));

import { deleteAccount } from "@/lib/domain/account";
import { createBooking } from "@/lib/domain/bookings";
import { settlePayment, startPayment } from "@/lib/domain/payments";
import { getExperience } from "@/lib/domain/catalogue";
import { weekdayKey } from "@/lib/format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

const users: string[] = [];
async function guest() {
  const client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  state.current = client;
  return data.user.id;
}
const exists = async (id: string) => (await svc.auth.admin.getUserById(id)).data.user !== null;

let experienceId = "";
let startTime = "";
const runDays: string[] = [];
let cursor = 0;
const nextRunDay = () => runDays[cursor++]; // each booking gets its own date: never piles on a slot

beforeAll(async () => {
  // the food walk runs Tue–Sat, min 2 people
  const e = (await getExperience("kuching-heritage-street-food-walk"))!;
  experienceId = e.id;
  startTime = e.availability.times[0];
  for (let i = 90; i < 130; i++) {
    const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    if (e.availability.days.includes(weekdayKey(d))) runDays.push(d);
  }
  expect(runDays.length).toBeGreaterThan(3);
});

afterAll(async () => {
  for (const id of users) await svc.auth.admin.deleteUser(id).catch(() => {});
});

async function paidBooking(userId: string) {
  const input: BookingInput = {
    experienceId, tripId: null, bookingDate: nextRunDay(), startTime,
    numAdults: 2, numChildren: 0, customerName: "Del Tester", customerEmail: "del@example.test",
    customerPhone: null, specialRequests: null,
  };
  const b = await createBooking(userId, input);
  if ("error" in b) throw new Error(b.error);
  const started = await startPayment(userId, b.id, "mock");
  if ("error" in started) throw new Error(started.error);
  const q = new URL(started.redirectUrl, "http://x").searchParams;
  const r = await settlePayment(userId, { ref: q.get("ref")!, amount: q.get("amount")!, method: "mock", outcome: "approve" });
  expect(r).toEqual({ status: "paid" });
  return b.id;
}

describe("deleteAccount (live)", () => {
  it("deletes a guest with nothing outstanding, and their data goes with them", async () => {
    const id = await guest();
    const { data: trip } = await svc.from("trips").select("id").eq("user_id", id);
    expect(trip).toEqual([]);
    expect(await deleteAccount(id)).toEqual({ ok: true });
    expect(await exists(id)).toBe(false);
    const { data: prof } = await svc.from("profiles").select("id").eq("id", id);
    expect(prof).toEqual([]);
  });

  it("refuses while a confirmed booking is upcoming; deletes (bookings and payments too) once cancelled and refunded", async () => {
    const id = await guest();
    const bookingId = await paidBooking(id);

    const blocked = await deleteAccount(id);
    expect(blocked).toMatchObject({ error: expect.stringMatching(/upcoming confirmed booking/) });
    expect(await exists(id)).toBe(true);

    // cancelled but still paid: a refund is owed
    await svc.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    expect(await deleteAccount(id)).toMatchObject({ error: expect.stringMatching(/refund/i) });
    expect(await exists(id)).toBe(true);

    // refunded: nothing owed any more
    await svc.from("bookings").update({ status: "refunded" }).eq("id", bookingId);
    expect(await deleteAccount(id)).toEqual({ ok: true });
    expect(await exists(id)).toBe(false);
    const { data: b } = await svc.from("bookings").select("id").eq("id", bookingId);
    expect(b).toEqual([]);
    const { data: p } = await svc.from("payments").select("id").eq("booking_id", bookingId);
    expect(p).toEqual([]);
  });

  it("refuses to delete an admin", async () => {
    const id = await guest();
    await svc.from("profiles").update({ role: "admin" }).eq("id", id);
    expect(await deleteAccount(id)).toMatchObject({ error: expect.stringMatching(/Admin accounts/) });
    expect(await exists(id)).toBe(true);
  });
});
