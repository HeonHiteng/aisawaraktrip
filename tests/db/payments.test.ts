import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

let db: PGlite;
let alice: string;
let bob: string;
let experienceId: string;
let n = 0;

const SERVICE = { role: "service" } as const;

/** A pending booking (RM 318 = 300 + 6% fee), a payment started for it, optionally on a trip. */
async function setup(opts: { trip?: boolean } = {}) {
  n++;
  let tripId: string | null = null;
  if (opts.trip) {
    tripId = (
      await as<{ id: string }>(
        db,
        SERVICE,
        `insert into public.trips (user_id, start_date, end_date, status) values ($1, '2026-12-01', '2026-12-03', 'planned') returning id`,
        [alice],
      )
    )[0].id;
  }
  const booking = (
    await as<{ id: string }>(
      db,
      SERVICE,
      `insert into public.bookings
         (user_id, experience_id, trip_id, booking_date, num_adults, unit_price, subtotal, service_fee, total_amount,
          customer_name, customer_email, experience_title, experience_slug, vendor_name)
       values ($1, $2, $3, '2026-12-02', 2, 150, 300, 18, 318, 'Alice', 'alice@example.test', 'Food walk', 'food-walk', 'KFW')
       returning id`,
      [alice, experienceId, tripId],
    )
  )[0].id;
  const ref = `mock_ref_${n}`;
  await as(
    db,
    SERVICE,
    `insert into public.payments (booking_id, provider, provider_ref, amount, method, status)
     values ($1, 'mock', $2, 318, 'mock', 'created')`,
    [booking, ref],
  );
  return { booking, ref, tripId };
}

type Settled = {
  result: string;
  confirmed_now?: boolean;
  booking_id?: string;
  user_id?: string;
  booking_status?: string;
};

const settle = async (
  ref: string,
  status: string,
  amount: number,
  expectedUser: string | null = null,
  provider = "mock",
): Promise<Settled> =>
  (
    await as<{ r: Settled }>(
      db,
      SERVICE,
      `select public.settle_payment(
         p_provider => $1, p_provider_ref => $2, p_status => $3::public.payment_status, p_amount => $4,
         p_raw => $5::jsonb, p_provider_payment_id => $6, p_expected_user => $7) as r`,
      [provider, ref, status, amount, JSON.stringify({ ref, status }), status === "paid" ? `pay_${ref}` : null, expectedUser],
    )
  )[0].r;

const bookingStatus = async (id: string) =>
  (await db.query<{ status: string }>(`select status from public.bookings where id = $1`, [id])).rows[0].status;
const history = async (id: string) =>
  (await db.query<{ from_status: string; to_status: string }>(`select from_status, to_status from public.booking_status_history where booking_id = $1 order by created_at`, [id])).rows;
const payment = async (ref: string) =>
  (await db.query<{ status: string; provider_payment_id: string | null; paid_at: string | null }>(`select status, provider_payment_id, paid_at::text from public.payments where provider_ref = $1`, [ref])).rows[0];

beforeAll(async () => {
  db = await freshDb();
  alice = await createUser(db, "Alice");
  bob = await createUser(db, "Bob");
  experienceId = (await db.query<{ id: string }>(`select id from public.experiences limit 1`)).rows[0].id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("booking amounts", () => {
  it("the database refuses a booking whose money doesn't add up", async () => {
    const bad = (subtotal: number, fee: number, total: number, unit = 150) =>
      db.query(
        `insert into public.bookings
           (user_id, experience_id, booking_date, num_adults, unit_price, subtotal, service_fee, total_amount,
            customer_name, customer_email, experience_title, experience_slug, vendor_name)
         values ($1, $2, '2026-12-02', 2, $6, $3, $4, $5, 'A', 'a@a.test', 't', 's', 'v')`,
        [alice, experienceId, subtotal, fee, total, unit],
      );
    await expect(bad(300, 18, 300)).rejects.toThrow(/bookings_amounts_consistent/); // total != subtotal + fee
    await expect(bad(299, 18, 317)).rejects.toThrow(/bookings_amounts_consistent/); // subtotal != unit x pax
    await expect(bad(0, 0, 0, 0)).resolves.toBeDefined(); // a free experience is fine
  });
});

describe("settle_payment", () => {
  it("only the first four arguments are required", async () => {
    const { booking, ref } = await setup();
    const r = await as<{ r: Settled }>(db, SERVICE, `select public.settle_payment('mock', $1, 'paid', 318) as r`, [ref]);
    expect(r[0].r).toMatchObject({ result: "paid", confirmed_now: true, booking_id: booking });
  });

  it("a verified payment confirms the booking, logs history, and marks the trip booked — once", async () => {
    const { booking, ref, tripId } = await setup({ trip: true });
    const r = await settle(ref, "paid", 318);

    expect(r).toMatchObject({ result: "paid", confirmed_now: true, booking_id: booking, user_id: alice, booking_status: "confirmed" });
    expect(await bookingStatus(booking)).toBe("confirmed");
    expect(await history(booking)).toEqual([{ from_status: "pending", to_status: "confirmed" }]);
    const p = await payment(ref);
    expect(p.status).toBe("paid");
    expect(p.provider_payment_id).toBe(`pay_${ref}`);
    expect(p.paid_at).not.toBeNull();
    expect((await db.query<{ status: string }>(`select status from public.trips where id = $1`, [tripId])).rows[0].status).toBe("booked");
  });

  it("is idempotent: a retried callback changes nothing and does not claim to have confirmed again", async () => {
    const { booking, ref } = await setup();
    expect((await settle(ref, "paid", 318)).confirmed_now).toBe(true);
    const again = await settle(ref, "paid", 318);
    expect(again).toMatchObject({ result: "paid", confirmed_now: false, booking_status: "confirmed" });
    expect(await history(booking)).toHaveLength(1);
    // even a contradictory late "failed" cannot un-pay it
    expect((await settle(ref, "failed", 318)).result).toBe("paid");
    expect((await payment(ref)).status).toBe("paid");
    expect(await bookingStatus(booking)).toBe("confirmed");
  });

  it("never confirms on a wrong amount — the payment fails and the booking stays pending", async () => {
    const { booking, ref } = await setup();
    const r = await settle(ref, "paid", 1);
    expect(r).toMatchObject({ result: "failed", confirmed_now: false });
    expect((await payment(ref)).status).toBe("failed");
    expect(await bookingStatus(booking)).toBe("pending");
    expect(await history(booking)).toEqual([]);
  });

  it("failed or cancelled attempts leave the booking pending, and a retry can still succeed", async () => {
    const { booking, ref } = await setup();
    expect((await settle(ref, "cancelled", 318)).result).toBe("cancelled");
    expect(await bookingStatus(booking)).toBe("pending");
    expect((await settle(ref, "failed", 318)).result).toBe("failed");
    expect(await bookingStatus(booking)).toBe("pending");
    expect(await settle(ref, "paid", 318)).toMatchObject({ result: "paid", confirmed_now: true });
    expect(await bookingStatus(booking)).toBe("confirmed");
  });

  it("money for a booking cancelled mid-payment is recorded but never revives the booking", async () => {
    const { booking, ref } = await setup();
    await as(db, SERVICE, `update public.bookings set status = 'cancelled' where id = $1`, [booking]);
    const r = await settle(ref, "paid", 318);
    expect(r).toMatchObject({ result: "paid", confirmed_now: false, booking_status: "cancelled" });
    expect((await payment(ref)).status).toBe("paid"); // the money really arrived — this one needs a refund
    expect(await bookingStatus(booking)).toBe("cancelled");
  });

  it("the signed-in return path can only settle its own payments", async () => {
    const { booking, ref } = await setup();
    expect(await settle(ref, "paid", 318, bob)).toEqual({ result: "unknown" });
    expect(await bookingStatus(booking)).toBe("pending");
    expect((await payment(ref)).status).toBe("created");
    expect(await settle(ref, "paid", 318, alice)).toMatchObject({ result: "paid", confirmed_now: true });
  });

  it("an unknown reference (or another provider's) does nothing", async () => {
    const { booking, ref } = await setup();
    expect(await settle("nope", "paid", 318)).toEqual({ result: "unknown" });
    expect(await settle(ref, "paid", 318, null, "stripe")).toEqual({ result: "unknown" });
    expect(await bookingStatus(booking)).toBe("pending");
  });

  it("only the server can settle: signed-in users, guests and visitors are refused", async () => {
    const { ref } = await setup();
    const call = (actor: Parameters<typeof as>[1]) =>
      as(db, actor, `select public.settle_payment('mock', $1, 'paid', 318)`, [ref]);
    await expect(call({ role: "authenticated", sub: alice })).rejects.toThrow(/permission denied/i);
    await expect(call({ role: "anon" })).rejects.toThrow(/permission denied/i);
    expect((await payment(ref)).status).toBe("created");
  });
});
