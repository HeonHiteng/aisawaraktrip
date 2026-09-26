import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

let db: PGlite;
let alice: string;
let bob: string;
let vendorId: string;
let n = 0;

const SERVICE = { role: "service" } as const;

/** A fresh experience with the given per-slot capacity (null = not set = unlimited). */
async function mkExp(capacity: number | null): Promise<string> {
  n++;
  const availability = capacity === null ? {} : { days: ["mon"], times: ["10:00"], capacity_per_slot: capacity };
  return (
    await db.query<{ id: string }>(
      `insert into public.experiences (vendor_id, title, slug, price_per_person, min_pax, max_pax, availability, is_published)
       values ($1, $2, $3, 100, 1, 50, $4::jsonb, true) returning id`,
      [vendorId, `Cap ${n}`, `cap-${n}`, JSON.stringify(availability)],
    )
  ).rows[0].id;
}

const payload = (user: string, exp: string, pax: number, over: Record<string, unknown> = {}) => ({
  user_id: user,
  experience_id: exp,
  trip_id: null,
  booking_date: "2026-12-07",
  start_time: "10:00",
  num_adults: pax,
  num_children: 0,
  unit_price: 100,
  subtotal: 100 * pax,
  service_fee: 6 * pax,
  total_amount: 106 * pax,
  currency: "MYR",
  customer_name: "T",
  customer_email: "t@t.test",
  customer_phone: null,
  special_requests: null,
  experience_title: "Cap",
  experience_slug: "cap",
  vendor_name: "V",
  location_name: null,
  ...over,
});

const book = async (user: string, exp: string, pax: number, over: Record<string, unknown> = {}, holdMinutes = 30) =>
  (
    await as<{ id: string }>(db, SERVICE, `select public.create_booking($1::jsonb, $2) as id`, [JSON.stringify(payload(user, exp, pax, over)), holdMinutes])
  )[0].id;

/** Run a booking that should be refused; return the reason and the seats-left detail. */
async function refused(user: string, exp: string, pax: number, over: Record<string, unknown> = {}) {
  try {
    await book(user, exp, pax, over);
  } catch (e) {
    const err = e as Error & { detail?: string };
    return { message: err.message, left: err.detail };
  }
  throw new Error("expected the booking to be refused");
}

const setStatus = (id: string, status: string) => db.query(`update public.bookings set status = $2 where id = $1`, [id, status]);
const expireHold = (id: string) => db.query(`update public.bookings set hold_expires_at = now() - interval '1 minute' where id = $1`, [id]);
const taken = async (exp: string, date = "2026-12-07", time = "10:00") =>
  (await as<{ n: number }>(db, SERVICE, `select public.slot_taken($1, $2::date, $3::time) as n`, [exp, date, time]))[0].n;

beforeAll(async () => {
  db = await freshDb();
  alice = await createUser(db, "Alice");
  bob = await createUser(db, "Bob");
  vendorId = (await db.query<{ id: string }>(`select id from public.vendors limit 1`)).rows[0].id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("create_booking: a slot can't be overbooked", () => {
  it("accepts bookings up to the capacity, then refuses and says how many seats are left", async () => {
    const exp = await mkExp(4);
    await book(alice, exp, 3);
    expect(await refused(bob, exp, 2)).toEqual({ message: "slot_full", left: "1" });
    await book(bob, exp, 1); // exactly fills it
    expect(await taken(exp)).toBe(4);
    expect(await refused(bob, exp, 1)).toEqual({ message: "slot_full", left: "0" });
  });

  it("a refused booking leaves nothing behind", async () => {
    const exp = await mkExp(2);
    await book(alice, exp, 2);
    await refused(bob, exp, 1);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.bookings where experience_id = $1`, [exp])).rows[0].n).toBe(1);
  });

  it("slots are independent: another time or another date has its own seats", async () => {
    const exp = await mkExp(2);
    await book(alice, exp, 2);
    await book(bob, exp, 2, { start_time: "14:00" });
    await book(bob, exp, 2, { booking_date: "2026-12-14" });
    expect(await taken(exp)).toBe(2);
    expect(await taken(exp, "2026-12-07", "14:00")).toBe(2);
  });

  it("only the experience's own capacity counts (one experience filling up doesn't affect another)", async () => {
    const a = await mkExp(1);
    const b = await mkExp(1);
    await book(alice, a, 1);
    await expect(book(bob, b, 1)).resolves.toBeDefined();
  });

  it("no capacity set (or 0) means unlimited, as before", async () => {
    for (const cap of [null, 0]) {
      const exp = await mkExp(cap);
      await book(alice, exp, 30);
      await expect(book(bob, exp, 15)).resolves.toBeDefined();
    }
  });

  it("children take a seat too", async () => {
    const exp = await mkExp(3);
    await book(alice, exp, 2, { num_children: 1, subtotal: 300, service_fee: 18, total_amount: 318 });
    expect(await refused(bob, exp, 1)).toMatchObject({ message: "slot_full", left: "0" });
  });

  it("an unknown experience is an error, not a booking", async () => {
    await expect(book(alice, "00000000-0000-0000-0000-000000000000", 1)).rejects.toThrow(/experience not found/);
  });
});

describe("which bookings hold seats", () => {
  it("confirmed and completed always do; cancelled, refunded and expired unpaid ones don't", async () => {
    const exp = await mkExp(10);
    const ids = {
      confirmed: await book(alice, exp, 1),
      completed: await book(alice, exp, 1),
      cancelled: await book(alice, exp, 1),
      refunded: await book(alice, exp, 1),
      expired: await book(alice, exp, 1),
      livePending: await book(alice, exp, 1),
    };
    await setStatus(ids.confirmed, "confirmed");
    await setStatus(ids.completed, "completed");
    await setStatus(ids.cancelled, "cancelled");
    await setStatus(ids.refunded, "refunded");
    await expireHold(ids.expired);
    // confirmed + completed + a live hold = 3 seats
    expect(await taken(exp)).toBe(3);
  });

  it("an unpaid booking holds its seats only for the hold period, then they are released", async () => {
    const exp = await mkExp(2);
    const first = await book(alice, exp, 2);
    expect((await refused(bob, exp, 1)).message).toBe("slot_full");
    await expireHold(first); // time passes
    await expect(book(bob, exp, 2)).resolves.toBeDefined();
  });

  it("cancelling frees the seats immediately", async () => {
    const exp = await mkExp(2);
    const first = await book(alice, exp, 2);
    await setStatus(first, "cancelled");
    await expect(book(bob, exp, 2)).resolves.toBeDefined();
  });
});

describe("extend_booking_hold (checkout)", () => {
  const extend = (booking: string, user: string) =>
    as<{ t: string }>(db, SERVICE, `select public.extend_booking_hold($1, $2, 30)::text as t`, [booking, user]);

  it("renews the hold when the seats are still free", async () => {
    const exp = await mkExp(2);
    const b = await book(alice, exp, 2, {}, 1); // a 1-minute hold
    await extend(b, alice);
    const r = await db.query<{ mins: number }>(`select extract(epoch from (hold_expires_at - now()))::int / 60 as mins from public.bookings where id = $1`, [b]);
    expect(r.rows[0].mins).toBeGreaterThanOrEqual(28);
  });

  it("a lapsed hold can be renewed only if nobody took the seats meanwhile", async () => {
    const exp = await mkExp(2);
    const b = await book(alice, exp, 2);
    await expireHold(b);
    await expect(extend(b, alice)).resolves.toBeDefined(); // still free -> renewed

    await expireHold(b);
    await book(bob, exp, 2); // someone else takes the freed seats
    await expect(extend(b, alice)).rejects.toThrow(/slot_full/);
  });

  it("only for your own pending booking", async () => {
    const exp = await mkExp(5);
    const b = await book(alice, exp, 1);
    await expect(extend(b, bob)).rejects.toThrow(/booking not found/);
    await setStatus(b, "confirmed");
    await expect(extend(b, alice)).rejects.toThrow(/booking_not_pending/);
  });
});

describe("paying after the hold lapsed", () => {
  const pay = async (booking: string, amount: number) => {
    n++;
    await db.query(`insert into public.payments (booking_id, provider, provider_ref, amount, method, status) values ($1, 'mock', $2, $3, 'mock', 'created')`, [booking, `cap_ref_${n}`, amount]);
    return `cap_ref_${n}`;
  };
  const settle = async (ref: string, amount: number) =>
    (await as<{ r: { result: string; confirmed_now: boolean; booking_status: string } }>(db, SERVICE, `select public.settle_payment('mock', $1, 'paid', $2) as r`, [ref, amount]))[0].r;
  const status = async (id: string) => (await db.query<{ status: string; reason: string | null }>(`select status, cancellation_reason as reason from public.bookings where id = $1`, [id])).rows[0];

  it("a live hold confirms as usual", async () => {
    const exp = await mkExp(2);
    const b = await book(alice, exp, 2);
    const r = await settle(await pay(b, 212), 212);
    expect(r).toMatchObject({ result: "paid", confirmed_now: true, booking_status: "confirmed" });
    expect((await db.query(`select hold_expires_at from public.bookings where id = $1`, [b])).rows[0]).toEqual({ hold_expires_at: null });
  });

  it("a lapsed hold with the seats still free confirms", async () => {
    const exp = await mkExp(2);
    const b = await book(alice, exp, 2);
    const ref = await pay(b, 212);
    await expireHold(b);
    expect(await settle(ref, 212)).toMatchObject({ confirmed_now: true, booking_status: "confirmed" });
  });

  it("a lapsed hold whose seats were taken is cancelled — never overbooked — and the payment stays paid for refund", async () => {
    const exp = await mkExp(2);
    const late = await book(alice, exp, 2);
    const ref = await pay(late, 212);
    await expireHold(late);
    await book(bob, exp, 2); // bob takes the released seats and pays

    const r = await settle(ref, 212);
    expect(r).toMatchObject({ result: "paid", confirmed_now: false, booking_status: "cancelled" });
    expect(await status(late)).toEqual({ status: "cancelled", reason: "The slot filled up before payment completed" });
    expect((await db.query<{ status: string }>(`select status from public.payments where provider_ref = $1`, [ref])).rows[0].status).toBe("paid"); // the money arrived — refund needed
    expect(await taken(exp)).toBe(2); // bob's hold only: no overbooking
  });
});

describe("only the server can use them", () => {
  it("signed-in users, guests and visitors are refused", async () => {
    const exp = await mkExp(5);
    const b = await book(alice, exp, 1);
    const calls = [
      `select public.create_booking('${JSON.stringify(payload(alice, exp, 1))}'::jsonb, 30)`,
      `select public.extend_booking_hold('${b}', '${alice}', 30)`,
      `select public.slot_taken('${exp}', '2026-12-07', '10:00')`,
    ];
    for (const sql of calls) {
      await expect(as(db, { role: "authenticated", sub: alice }, sql)).rejects.toThrow(/permission denied/i);
      await expect(as(db, { role: "anon" }, sql)).rejects.toThrow(/permission denied/i);
    }
  });
});
