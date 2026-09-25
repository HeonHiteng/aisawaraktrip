import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

let db: PGlite;
let alice: string;
let bob: string;
let guest: string;
let admin: string;
let experienceId: string;
let aliceBooking: string;
let aliceTrip: string;

const DENIED = /permission denied|row-level security|violates/i;

beforeAll(async () => {
  db = await freshDb();
  alice = await createUser(db, "Alice");
  bob = await createUser(db, "Bob");
  guest = await createUser(db, "Guest", { anonymous: true });
  admin = await createUser(db, "Root", { admin: true });

  experienceId = (
    await db.query<{ id: string }>(
      `select id from public.experiences where is_published order by slug limit 1`,
    )
  ).rows[0].id;

  // Alice's data, written the way the server (service role) writes it.
  aliceTrip = (
    await as<{ id: string }>(
      db,
      { role: "service" },
      `insert into public.trips (user_id, start_date, end_date)
       values ($1, '2026-12-01', '2026-12-03') returning id`,
      [alice],
    )
  )[0].id;
  aliceBooking = (
    await as<{ id: string }>(
      db,
      { role: "service" },
      `insert into public.bookings
         (user_id, experience_id, booking_date, num_adults, unit_price, subtotal,
          service_fee, total_amount, customer_name, customer_email)
       values ($1, $2, '2026-12-02', 2, 100, 200, 10, 210, 'Alice', 'alice@example.test')
       returning id`,
      [alice, experienceId],
    )
  )[0].id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("schema", () => {
  it("applies every migration and the seed", async () => {
    const n = await as<{ n: number }>(
      db,
      { role: "anon" },
      `select count(*)::int as n from public.experiences`,
    );
    expect(n[0].n).toBe(6);
  });

  it("creates a profile for every new auth user (guests too)", async () => {
    const r = await db.query<{ n: number }>(
      `select count(*)::int as n from public.profiles where id = any($1)`,
      [[alice, bob, guest, admin]],
    );
    expect(r.rows[0].n).toBe(4);
  });
});

describe("catalogue visibility", () => {
  it("anon sees published rows only", async () => {
    await db.query(
      `insert into public.experiences (vendor_id, title, slug, is_published)
       select vendor_id, 'Hidden draft', 'hidden-draft', false from public.experiences limit 1`,
    );
    const rows = await as<{ slug: string }>(
      db,
      { role: "anon" },
      `select slug from public.experiences`,
    );
    expect(rows.map((r) => r.slug)).not.toContain("hidden-draft");
    expect(rows.length).toBe(6);
  });

  it("clients cannot write the catalogue; admins can", async () => {
    await expect(
      as(db, { role: "authenticated", sub: alice }, `update public.experiences set price_per_person = 1`),
    ).resolves.toEqual([]);
    const prices = await db.query<{ p: string }>(
      `select distinct price_per_person::text as p from public.experiences where slug <> 'hidden-draft'`,
    );
    expect(prices.rows.some((r) => r.p === "1.00")).toBe(false);

    await expect(
      as(db, { role: "authenticated", sub: alice }, `delete from public.experiences`),
    ).resolves.toEqual([]);

    const changed = await as(
      db,
      { role: "authenticated", sub: admin },
      `update public.experiences set is_published = true where slug = 'hidden-draft' returning id`,
    );
    expect(changed.length).toBe(1);
  });
});

describe("profiles", () => {
  it("a user cannot promote themselves to admin", async () => {
    await expect(
      as(db, { role: "authenticated", sub: alice }, `update public.profiles set role = 'admin' where id = $1`, [alice]),
    ).rejects.toThrow(/not allowed to change role/);
    const r = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [alice]);
    expect(r.rows[0].role).toBe("tourist");
  });

  it("a user cannot read another user's profile", async () => {
    const rows = await as(
      db,
      { role: "authenticated", sub: bob },
      `select id from public.profiles where id = $1`,
      [alice],
    );
    expect(rows).toEqual([]);
  });
});

describe("ownership isolation", () => {
  it("a user cannot read another user's trips or bookings", async () => {
    const bob_ = { role: "authenticated", sub: bob } as const;
    expect(await as(db, bob_, `select id from public.trips where id = $1`, [aliceTrip])).toEqual([]);
    expect(await as(db, bob_, `select id from public.bookings where id = $1`, [aliceBooking])).toEqual([]);
  });

  it("the owner and an admin can read them", async () => {
    for (const sub of [alice, admin]) {
      const r = await as(db, { role: "authenticated", sub }, `select id from public.bookings where id = $1`, [aliceBooking]);
      expect(r.length).toBe(1);
    }
  });

  it("a user cannot attach a trip to someone else", async () => {
    await expect(
      as(
        db,
        { role: "authenticated", sub: bob },
        `insert into public.trips (user_id, start_date, end_date) values ($1, '2026-12-01', '2026-12-02')`,
        [alice],
      ),
    ).rejects.toThrow(DENIED);
  });
});

describe("bookings & payments: money fields are server-only", () => {
  const alice_ = () => ({ role: "authenticated", sub: alice }) as const;

  it("a client cannot insert a booking directly (e.g. status=confirmed, total=0)", async () => {
    await expect(
      as(
        db,
        alice_(),
        `insert into public.bookings
           (user_id, experience_id, booking_date, unit_price, subtotal, total_amount,
            status, customer_name, customer_email)
         values ($1, $2, '2026-12-05', 0, 0, 0, 'confirmed', 'Alice', 'alice@example.test')`,
        [alice, experienceId],
      ),
    ).rejects.toThrow(DENIED);
  });

  it("a client cannot edit the price or status of their own booking", async () => {
    await as(db, alice_(), `update public.bookings set total_amount = 0, subtotal = 0, unit_price = 0 where id = $1`, [aliceBooking]).catch(() => {});
    await as(db, alice_(), `update public.bookings set status = 'confirmed' where id = $1`, [aliceBooking]).catch(() => {});
    const r = await db.query<{ total_amount: string; status: string }>(
      `select total_amount::text, status from public.bookings where id = $1`,
      [aliceBooking],
    );
    expect(r.rows[0]).toEqual({ total_amount: "210.00", status: "pending" });
  });

  it("a client cannot write payments or status history", async () => {
    await expect(
      as(
        db,
        alice_(),
        `insert into public.payments (booking_id, provider, amount, status)
         values ($1, 'mock', 210, 'paid')`,
        [aliceBooking],
      ),
    ).rejects.toThrow(DENIED);
    await expect(
      as(
        db,
        alice_(),
        `insert into public.booking_status_history (booking_id, to_status) values ($1, 'confirmed')`,
        [aliceBooking],
      ),
    ).rejects.toThrow(DENIED);
  });

  it("the server (service role) can transition status and it is logged", async () => {
    await as(db, { role: "service" }, `update public.bookings set status = 'confirmed' where id = $1`, [aliceBooking]);
    const h = await db.query<{ from_status: string; to_status: string }>(
      `select from_status, to_status from public.booking_status_history where booking_id = $1`,
      [aliceBooking],
    );
    expect(h.rows).toEqual([{ from_status: "pending", to_status: "confirmed" }]);
  });
});

describe("privileges that bypass RLS", () => {
  it("client roles cannot TRUNCATE tables", async () => {
    for (const actor of [
      { role: "anon" },
      { role: "authenticated", sub: alice },
    ] as const) {
      await expect(as(db, actor, `truncate public.categories`)).rejects.toThrow(DENIED);
    }
  });

  it("anon cannot write anywhere in public", async () => {
    await expect(
      as(db, { role: "anon" }, `insert into public.categories (slug, name) values ('x', 'x')`),
    ).rejects.toThrow(DENIED);
  });
});

describe("reviews", () => {
  it("are world-readable for published experiences", async () => {
    await db.query(
      `insert into public.reviews (experience_id, user_id, author_name, rating, comment)
       values ($1, $2, 'Alice', 5, 'Fantastic guide, would book again.')`,
      [experienceId, alice],
    );
    const rows = await as(db, { role: "anon" }, `select id from public.reviews`);
    expect(rows.length).toBe(1);
  });

  it("cannot be written by clients (server checks the booking gate first)", async () => {
    await expect(
      as(
        db,
        { role: "authenticated", sub: bob },
        `insert into public.reviews (experience_id, user_id, author_name, rating, comment)
         values ($1, $2, 'Bob', 5, 'Never even booked this one.')`,
        [experienceId, bob],
      ),
    ).rejects.toThrow(DENIED);
  });

  it("enforce one review per traveller and a 1–5 rating", async () => {
    await expect(
      db.query(
        `insert into public.reviews (experience_id, user_id, author_name, rating, comment)
         values ($1, $2, 'Alice', 4, 'A second review from the same person.')`,
        [experienceId, alice],
      ),
    ).rejects.toThrow(/duplicate|unique/i);
    await expect(
      db.query(
        `insert into public.reviews (experience_id, user_id, author_name, rating, comment)
         values ($1, $2, 'Bob', 6, 'Rating out of range on purpose.')`,
        [experienceId, bob],
      ),
    ).rejects.toThrow(/check|violates/i);
  });
});
