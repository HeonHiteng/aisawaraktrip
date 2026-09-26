import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { BookingInput } from "@/types/booking";
import type { ExperienceForm } from "@/lib/validation/admin";

/**
 * Slot capacity on the REAL database: real guests, real SQL functions, real row locks.
 * The experience is created through the admin domain code (capacity 4) and everything
 * is deleted afterwards.
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));
vi.mock("@/lib/email", () => ({ sendBookingConfirmation: async () => {} }));

import { adminListVendors, adminSaveExperience } from "@/lib/domain/admin";
import { listLocations } from "@/lib/domain/catalogue";
import { createBooking, getBooking } from "@/lib/domain/bookings";
import { settlePayment, startPayment } from "@/lib/domain/payments";
import { HOLD_MINUTES } from "@/lib/booking-hold";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

const users: string[] = [];
let experienceId = "";

async function guest(): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  return { id: data.user.id, client };
}

let root: Awaited<ReturnType<typeof guest>>;
let alice: Awaited<ReturnType<typeof guest>>;
let bob: Awaited<ReturnType<typeof guest>>;
let carol: Awaited<ReturnType<typeof guest>>;
const as = (u: typeof root) => (state.current = u.client);

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const req = (date: string, pax: number): BookingInput => ({
  experienceId,
  tripId: null,
  bookingDate: date,
  startTime: "10:00",
  numAdults: pax,
  numChildren: 0,
  customerName: "Cap Tester",
  customerEmail: "cap@example.test",
  customerPhone: null,
  specialRequests: null,
});

async function book(u: typeof root, date: string, pax: number) {
  as(u);
  const r = await createBooking(u.id, req(date, pax));
  if ("error" in r) throw new Error(r.error);
  return r;
}
async function refused(u: typeof root, date: string, pax: number) {
  as(u);
  const r = await createBooking(u.id, req(date, pax));
  if (!("error" in r)) throw new Error("expected refusal");
  return r.error;
}

/** Simulate time passing: this unpaid booking's hold has now lapsed. */
const lapse = (id: string) =>
  svc.from("bookings").update({ hold_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", id);

beforeAll(async () => {
  root = await guest();
  alice = await guest();
  bob = await guest();
  carol = await guest();
  await svc.from("profiles").update({ role: "admin" }).eq("id", root.id);

  as(root);
  const vendorId = (await adminListVendors())[0].id;
  const locationId = (await listLocations())[0].id;
  const form: ExperienceForm = {
    title: `Capacity Test ${Date.now().toString(36)}`,
    summary: "s", description: "d", vendorId, locationId,
    durationMinutes: 60, pricePerPerson: 50, minPax: 1, maxPax: 4,
    categories: ["food"], meetingPoint: "here",
    availabilityDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    availabilityTimes: "10:00", capacityPerSlot: 4, bookingLeadtimeHours: 0,
    languages: "", includes: "", cancellationPolicy: "", images: "", isPublished: true,
  };
  experienceId = (await adminSaveExperience(form)).id;
});

afterAll(async () => {
  for (const id of users) await svc.auth.admin.deleteUser(id); // their bookings/payments cascade
  if (experienceId) await svc.from("experiences").delete().eq("id", experienceId);
});

describe("slot capacity (live)", () => {
  it("fills a slot exactly, refuses with the seats left, and cancelling frees them", async () => {
    const d = day(40);
    const first = await book(alice, d, 3);
    expect(new Date(first.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now() + (HOLD_MINUTES - 2) * 60_000);

    expect(await refused(bob, d, 2)).toMatch(/Only 1 seat left/);
    await book(bob, d, 1); // exactly full
    expect(await refused(carol, d, 1)).toMatch(/fully booked/);

    // a different date is untouched
    await expect(book(carol, day(41), 4)).resolves.toBeDefined();

    // Alice cancels -> her 3 seats are free again
    await svc.from("bookings").update({ status: "cancelled" }).eq("id", first.id);
    await expect(book(carol, d, 3)).resolves.toBeDefined();
  });

  it("SIX people grabbing the last seats at the same instant: exactly four get one", async () => {
    const d = day(42);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => {
        const u = [alice, bob, carol][Math.floor(Math.random() * 3)];
        return createBooking(u.id, req(d, 1)); // the service-role write path doesn't depend on the session
      }),
    );
    const ok = results.filter((r) => !("error" in r));
    const no = results.filter((r) => "error" in r);
    expect(ok).toHaveLength(4);
    expect(no).toHaveLength(2);
    const { data } = await svc.from("bookings").select("num_pax").eq("experience_id", experienceId).eq("booking_date", d);
    expect(data!.reduce((n, b) => n + (b.num_pax ?? 0), 0)).toBe(4); // never more than capacity
  });

  it("an unpaid hold is released after it lapses", async () => {
    const d = day(43);
    const first = await book(alice, d, 4);
    expect(await refused(bob, d, 1)).toMatch(/fully booked/);
    await lapse(first.id);
    await expect(book(bob, d, 4)).resolves.toBeDefined();
  });

  it("checkout renews a lapsed hold if the seats are free, and refuses if they've gone", async () => {
    const d = day(44);
    as(alice);
    const mine = await book(alice, d, 2);
    await lapse(mine.id);
    const started = await startPayment(alice.id, mine.id, "mock");
    expect("error" in started).toBe(false);
    expect(new Date((await getBooking(alice.id, mine.id))!.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now());

    // now lapse it again and let someone else take the whole slot
    await lapse(mine.id);
    await book(bob, d, 4);
    as(alice);
    expect(await startPayment(alice.id, mine.id, "mock")).toMatchObject({ error: expect.stringMatching(/filled up while you were checking out/) });
  });

  it("paying after the hold lapsed AND the slot filled: cancelled, never overbooked, payment flagged for refund", async () => {
    const d = day(45);
    const late = await book(alice, d, 4);
    as(alice);
    const started = await startPayment(alice.id, late.id, "mock");
    if ("error" in started) throw new Error(started.error);
    const q = new URL(started.redirectUrl, "http://x").searchParams;
    const params = { ref: q.get("ref")!, amount: q.get("amount")!, method: "mock", outcome: "approve" };

    await lapse(late.id);
    const other = await book(bob, d, 4); // takes the released seats

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    as(alice);
    expect(await settlePayment(alice.id, params)).toEqual({ status: "paid" });
    expect(err.mock.calls.some((c) => String(c[0]).includes("refund needed"))).toBe(true);
    err.mockRestore();

    as(alice);
    expect((await getBooking(alice.id, late.id))?.status).toBe("cancelled");
    const { data: pay } = await svc.from("payments").select("status").eq("booking_id", late.id).single();
    expect(pay?.status).toBe("paid"); // the money arrived — this is the one that needs a refund
    as(bob);
    expect((await getBooking(bob.id, other.id))?.status).toBe("pending"); // Bob keeps his seats
  });
});
