import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

let db: PGlite;
let alice: string;
let bob: string;
let food: string; // experience id
let museum: string; // attraction id

const A = () => ({ role: "authenticated", sub: alice }) as const;
const B = () => ({ role: "authenticated", sub: bob }) as const;

const trip = (over: Record<string, unknown> = {}) => ({
  title: "Long weekend",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  budgetTotal: 3000,
  groupType: "couple",
  numAdults: 2,
  numChildren: 0,
  interests: ["food", "culture"],
  pace: "moderate",
  notes: "no museums",
  userId: "00000000-0000-0000-0000-000000000000", // must be ignored — identity comes from the JWT
  ...over,
});

const item = (over: Record<string, unknown> = {}) => ({
  type: "experience",
  startTime: "17:30",
  endTime: "20:30",
  durationMinutes: 180,
  title: "Food walk",
  description: "Tasting walk",
  whyRecommended: "Because food",
  estimatedCost: 300,
  locationLabel: "Kuching",
  experienceId: food,
  attractionId: null,
  bookable: true,
  ...over,
});

const badItem = () => item({ type: "attraction", attractionId: null, experienceId: null });

const itinerary = (over: Record<string, unknown> = {}) => ({
  generatedBy: "ai",
  model: "test",
  requestSummary: "2 days",
  days: [
    {
      dayNumber: 1,
      date: "2026-12-01",
      summary: "Arrive",
      items: [
        item({
          type: "attraction",
          experienceId: null,
          attractionId: museum,
          title: "Museum",
          startTime: "10:00",
          endTime: "12:30",
          bookable: false,
        }),
        item(),
      ],
    },
    {
      dayNumber: 2,
      date: "2026-12-02",
      summary: "Relax",
      items: [item({ title: "Second", startTime: "09:00" })],
    },
  ],
  ...over,
});

const oneDay = (items: unknown[]) => ({
  days: [{ dayNumber: 1, date: "2026-12-01", summary: "x", items }],
});

const createTrip = (actor: ReturnType<typeof A>, t = trip(), i = itinerary()) =>
  as<{ id: string }>(
    db,
    actor,
    `select public.create_trip($1::jsonb, $2::jsonb) as id`,
    [JSON.stringify(t), JSON.stringify(i)],
  ).then((r) => r[0].id);

const save = (actor: ReturnType<typeof A>, id: string, i = itinerary()) =>
  as(db, actor, `select public.save_itinerary($1, $2::jsonb)`, [id, JSON.stringify(i)]);

const currentItemCount = async (id: string) =>
  (
    await db.query<{ n: number }>(
      `select count(*)::int as n from public.itinerary_items i
       join public.itinerary_days d on d.id = i.itinerary_day_id
       join public.itineraries x on x.id = d.itinerary_id
       where x.trip_id = $1 and x.is_current`,
      [id],
    )
  ).rows[0].n;

beforeAll(async () => {
  db = await freshDb();
  alice = await createUser(db, "Alice");
  bob = await createUser(db, "Bob");
  food = (
    await db.query<{ id: string }>(
      `select id from public.experiences where slug = 'kuching-heritage-street-food-walk'`,
    )
  ).rows[0].id;
  museum = (
    await db.query<{ id: string }>(
      `select id from public.attractions where slug = 'borneo-cultures-museum'`,
    )
  ).rows[0].id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("create_trip", () => {
  it("saves the trip, itinerary v1, days and items in order — owned by the caller, not the payload", async () => {
    const id = await createTrip(A());
    const t = await db.query(
      `select user_id, status, budget_total::text, interests, notes from public.trips where id = $1`,
      [id],
    );
    expect(t.rows[0]).toEqual({
      user_id: alice,
      status: "planned",
      budget_total: "3000.00",
      interests: ["food", "culture"],
      notes: "no museums",
    });

    const v = await db.query(
      `select version, is_current, model from public.itineraries where trip_id = $1`,
      [id],
    );
    expect(v.rows).toEqual([{ version: 1, is_current: true, model: "test" }]);

    const rows = await db.query<{
      day_number: number;
      sort_order: number;
      title: string;
      start_time: string;
      item_type: string;
      is_bookable: boolean;
    }>(
      `select d.day_number, i.sort_order, i.title, i.start_time::text, i.item_type::text, i.is_bookable
       from public.itinerary_items i
       join public.itinerary_days d on d.id = i.itinerary_day_id
       join public.itineraries x on x.id = d.itinerary_id
       where x.trip_id = $1 order by d.day_number, i.sort_order`,
      [id],
    );
    expect(
      rows.rows.map((r) => [r.day_number, r.sort_order, r.title, r.start_time, r.item_type, r.is_bookable]),
    ).toEqual([
      [1, 0, "Museum", "10:00:00", "attraction", false],
      [1, 1, "Food walk", "17:30:00", "experience", true],
      [2, 0, "Second", "09:00:00", "experience", true],
    ]);
  });

  it("refuses signed-out callers", async () => {
    await expect(
      as(db, { role: "anon" }, `select public.create_trip($1::jsonb, $2::jsonb)`, [
        JSON.stringify(trip()),
        JSON.stringify(itinerary()),
      ]),
    ).rejects.toThrow(/permission denied/i);
  });

  it("is all-or-nothing: a bad item leaves no trip behind", async () => {
    const count = async () =>
      (await db.query<{ n: number }>(`select count(*)::int as n from public.trips`)).rows[0].n;
    const before = await count();
    await expect(
      createTrip(A(), trip(), itinerary(oneDay([item(), badItem()]))),
    ).rejects.toThrow(/itinerary_items_attraction_fk|violates check/i);
    expect(await count()).toBe(before);
  });
});

describe("save_itinerary", () => {
  it("adds a new version, keeps the old one, and exactly one stays current", async () => {
    const id = await createTrip(A());
    await save(A(), id, itinerary(oneDay([item({ title: "Only" })])));

    const v = await db.query(
      `select version, is_current from public.itineraries where trip_id = $1 order by version`,
      [id],
    );
    expect(v.rows).toEqual([
      { version: 1, is_current: false },
      { version: 2, is_current: true },
    ]);
    expect(await currentItemCount(id)).toBe(1);
  });

  it("assigns the version itself — a client-sent version is ignored", async () => {
    const id = await createTrip(A());
    await save(A(), id, itinerary({ version: 99 }));
    const v = await db.query<{ version: number }>(
      `select max(version)::int as version from public.itineraries where trip_id = $1`,
      [id],
    );
    expect(v.rows[0].version).toBe(2);
  });

  it("a failed save changes nothing: the previous itinerary stays current and intact", async () => {
    const id = await createTrip(A());
    await expect(
      save(A(), id, itinerary(oneDay([item({ title: "Fine" }), badItem()]))),
    ).rejects.toThrow();

    const v = await db.query(
      `select version, is_current from public.itineraries where trip_id = $1`,
      [id],
    );
    expect(v.rows).toEqual([{ version: 1, is_current: true }]);
    expect(await currentItemCount(id)).toBe(3);
  });

  it("someone else's trip is 'not found' — you can't write into it", async () => {
    const id = await createTrip(A());
    await expect(save(B(), id)).rejects.toThrow(/trip not found/);
    await expect(save({ role: "anon" } as never, id)).rejects.toThrow(/permission denied/i);
    const v = await db.query<{ n: number }>(
      `select count(*)::int as n from public.itineraries where trip_id = $1`,
      [id],
    );
    expect(v.rows[0].n).toBe(1);
  });

  it("the database itself refuses two current itineraries for one trip", async () => {
    const id = await createTrip(A());
    await expect(
      db.query(`insert into public.itineraries (trip_id, version, is_current) values ($1, 50, true)`, [id]),
    ).rejects.toThrow(/duplicate|unique/i);
  });
});

describe("ownership & cleanup", () => {
  it("a user only sees their own trip tree; deleting a trip removes all of it", async () => {
    const id = await createTrip(A());
    const seenBy = async (actor: ReturnType<typeof A>) =>
      (
        await as<{ n: number }>(
          db,
          actor,
          `select count(*)::int as n from public.itinerary_items i
           join public.itinerary_days d on d.id = i.itinerary_day_id
           join public.itineraries x on x.id = d.itinerary_id where x.trip_id = $1`,
          [id],
        )
      )[0].n;
    expect(await seenBy(A())).toBe(3);
    expect(await seenBy(B())).toBe(0);

    // RLS: someone else's delete silently matches nothing
    await as(db, B(), `delete from public.trips where id = $1`, [id]);
    expect((await db.query(`select 1 from public.trips where id = $1`, [id])).rows).toHaveLength(1);

    await as(db, A(), `delete from public.trips where id = $1`, [id]);
    const left = await db.query<{ itineraries: number; days: number; items: number }>(
      `select
         (select count(*)::int from public.itineraries where trip_id = $1) as itineraries,
         (select count(*)::int from public.itinerary_days d where not exists (select 1 from public.itineraries x where x.id = d.itinerary_id)) as days,
         (select count(*)::int from public.itinerary_items i where not exists (select 1 from public.itinerary_days d where d.id = i.itinerary_day_id)) as items`,
      [id],
    );
    expect(left.rows[0]).toEqual({ itineraries: 0, days: 0, items: 0 });
  });
});
