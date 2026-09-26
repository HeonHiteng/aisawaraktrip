import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

/** The local food guide + must-see ranking: schema, RLS, the seed SQL, and the admin function. */

let db: PGlite;
let admin: string;
let tourist: string;

const ADMIN = () => ({ role: "authenticated", sub: admin }) as const;
const TOURIST = () => ({ role: "authenticated", sub: tourist }) as const;
const seed = () => readFileSync(join(__dirname, "..", "..", "supabase", "seed-guide.sql"), "utf8");

beforeAll(async () => {
  db = await freshDb();
  admin = await createUser(db, "Root", { admin: true });
  tourist = await createUser(db, "Tina");
  await db.exec(seed());
}, 60_000);

afterAll(async () => {
  await db.close();
});

const count = async (sql: string) => Number((await db.query<{ n: string }>(sql)).rows[0].n);

describe("seed-guide.sql", () => {
  it("loads the whole guide, and is safe to run again (idempotent)", async () => {
    expect(await count(`select count(*) n from public.eateries`)).toBe(30);
    await db.exec(seed());
    expect(await count(`select count(*) n from public.eateries`)).toBe(30);
    expect(await count(`select count(*) n from public.attractions where slug in ('gunung-mulu-national-park','niah-caves','lambir-hills-national-park','kuching-wetlands')`)).toBe(4);
  });

  it("ranks the must-see list and keeps the places we lack details for as unpublished drafts", async () => {
    const r = await db.query<{ slug: string; featured_rank: number; is_published: boolean }>(
      `select slug, featured_rank, is_published from public.attractions where featured_rank is not null order by featured_rank`,
    );
    expect(r.rows.map((x) => [x.slug, x.featured_rank])).toEqual([
      ["semenggoh-nature-reserve", 1],
      ["gunung-mulu-national-park", 2],
      ["sarawak-cultural-village", 3],
      ["niah-caves", 4],
      ["bako-national-park", 5],
      ["kuching-waterfront", 6],
      ["lambir-hills-national-park", 7],
      ["kuching-wetlands", 8],
    ]);
    const drafts = r.rows.filter((x) => !x.is_published).map((x) => x.slug);
    expect(drafts.sort()).toEqual(["gunung-mulu-national-park", "kuching-wetlands", "lambir-hills-national-park", "niah-caves"]);
  });

  it("every eatery has a city, a Maps link and (mostly) a tier; Lepau carries three dishes once", async () => {
    expect(await count(`select count(*) n from public.eateries where maps_url is null or maps_url !~ '^https://'`)).toBe(0);
    expect(await count(`select count(*) n from public.eateries where maps_url like '%g_st%'`)).toBe(0); // tracking params stripped
    expect(await count(`select count(*) n from public.eateries where name = 'Lepau'`)).toBe(1);
    const lepau = await db.query<{ dishes: string[] }>(`select dishes from public.eateries where slug = 'lepau'`);
    expect(lepau.rows[0].dishes.sort()).toEqual(["manok-pansoh", "midin", "umai"]);
    const byCity = await db.query<{ city: string; n: string }>(`select city, count(*) n from public.eateries group by city order by city`);
    expect(byCity.rows.map((r) => [r.city, Number(r.n)])).toEqual([["Bintulu", 4], ["Kuching", 12], ["Miri", 7], ["Sibu", 7]]);
  });
});

describe("eateries RLS", () => {
  it("anyone can read published eateries; drafts are visible to admins only", async () => {
    await as(db, ADMIN(), `update public.eateries set is_published = false where slug = 'mui-xin-laksa'`);
    const anon = await as<{ slug: string }>(db, { role: "anon" }, `select slug from public.eateries where slug = 'mui-xin-laksa'`);
    expect(anon).toHaveLength(0);
    expect(await as(db, { role: "anon" }, `select 1 from public.eateries`)).toHaveLength(29);
    expect(await as(db, TOURIST(), `select 1 from public.eateries where slug = 'mui-xin-laksa'`)).toHaveLength(0);
    expect(await as(db, ADMIN(), `select 1 from public.eateries where slug = 'mui-xin-laksa'`)).toHaveLength(1);
    await as(db, ADMIN(), `update public.eateries set is_published = true where slug = 'mui-xin-laksa'`);
  });

  it("only admins can write", async () => {
    const insert = `insert into public.eateries (slug, name, city) values ('x-cafe', 'X Cafe', 'Kuching')`;
    await expect(as(db, TOURIST(), insert)).rejects.toThrow(/row-level security/i);
    await expect(as(db, { role: "anon" }, insert)).rejects.toThrow(/row-level security|permission denied/i);
    await as(db, TOURIST(), `update public.eateries set name = 'hacked'`);
    await as(db, TOURIST(), `delete from public.eateries`);
    expect(await count(`select count(*) n from public.eateries where name = 'hacked'`)).toBe(0);
    expect(await count(`select count(*) n from public.eateries`)).toBe(30);

    await as(db, ADMIN(), insert);
    expect(await count(`select count(*) n from public.eateries where slug = 'x-cafe'`)).toBe(1);
    await as(db, ADMIN(), `delete from public.eateries where slug = 'x-cafe'`);
  });

  it("the table refuses bad data: unknown city, tier outside 1-3, non-https link, over-long note", async () => {
    const ins = (cols: string, vals: string) =>
      as(db, ADMIN(), `insert into public.eateries (slug, name, ${cols}) values ('bad', 'Bad Place', ${vals})`);
    await expect(ins("city", "'Kapit'")).rejects.toThrow(/eateries_city_check|check/i);
    await expect(ins("city, price_tier", "'Kuching', 4")).rejects.toThrow(/check/i);
    await expect(ins("city, maps_url", "'Kuching', 'http://maps.example'")).rejects.toThrow(/check/i);
    await expect(ins("city, maps_url", "'Kuching', 'javascript:alert(1)'")).rejects.toThrow(/check/i);
    await expect(ins("city, notes", `'Kuching', '${"x".repeat(301)}'`)).rejects.toThrow(/check/i);
  });
});

describe("admin_save_attraction — must-see rank", () => {
  const payload = (over: Record<string, unknown> = {}) => ({
    slugBase: "rank-test",
    name: "Rank Test",
    summary: "s",
    description: "d",
    locationId: "11111111-0000-0000-0000-000000000001",
    address: "x",
    avgVisitMinutes: 60,
    priceMin: 0,
    priceMax: 0,
    isFree: true,
    tips: "",
    categories: ["heritage"],
    images: [],
    isPublished: true,
    ...over,
  });
  const save = (p: unknown) =>
    as<{ id: string }>(db, ADMIN(), `select public.admin_save_attraction($1::jsonb) as id`, [JSON.stringify(p)]).then((r) => r[0].id);
  const rank = async (id: string) =>
    (await db.query<{ featured_rank: number | null }>(`select featured_rank from public.attractions where id = $1`, [id])).rows[0].featured_rank;

  it("saves a rank on create, changes it, and clears it when left empty", async () => {
    const id = await save(payload({ featuredRank: 2 }));
    expect(await rank(id)).toBe(2);
    await save(payload({ id, featuredRank: 7 }));
    expect(await rank(id)).toBe(7);
    await save(payload({ id, featuredRank: "" }));
    expect(await rank(id)).toBeNull();
    await save(payload({ id })); // key absent = unranked too (the form always sends the field)
    expect(await rank(id)).toBeNull();
  });

  it("refuses a rank outside 1-99", async () => {
    await expect(save(payload({ featuredRank: 0 }))).rejects.toThrow(/check/i);
    await expect(save(payload({ featuredRank: 100 }))).rejects.toThrow(/check/i);
  });
});
