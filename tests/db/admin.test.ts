import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDb } from "./harness";

let db: PGlite;
let admin: string;
let tourist: string;
let vendorId: string;
let locationId: string;

const ADMIN = () => ({ role: "authenticated", sub: admin }) as const;
const TOURIST = () => ({ role: "authenticated", sub: tourist }) as const;

const exp = (over: Record<string, unknown> = {}) => ({
  slugBase: "new-tour",
  title: "New Tour",
  summary: "s",
  description: "d",
  vendorId,
  locationId,
  durationMinutes: 120,
  pricePerPerson: 99.5,
  minPax: 1,
  maxPax: 8,
  languages: ["English", "Malay"],
  includes: ["Guide", "Water"],
  meetingPoint: "Waterfront",
  cancellationPolicy: "Free until 24h",
  availability: { days: ["mon", "tue"], times: ["09:00"], capacity_per_slot: 8 },
  bookingLeadtimeHours: 12,
  categories: ["food", "culture"],
  images: ["/a.jpg", "/b.jpg", "/c.jpg"],
  isPublished: true,
  ...over,
});

const saveExp = (actor: ReturnType<typeof ADMIN>, p: unknown) =>
  as<{ id: string }>(db, actor, `select public.admin_save_experience($1::jsonb) as id`, [JSON.stringify(p)]).then((r) => r[0].id);

const att = (over: Record<string, unknown> = {}) => ({
  slugBase: "new-place",
  name: "New Place",
  summary: "s",
  description: "d",
  locationId,
  address: "Jalan X",
  avgVisitMinutes: 60,
  priceMin: 10,
  priceMax: 20,
  isFree: false,
  tips: "t",
  categories: ["heritage"],
  images: ["/p.jpg"],
  isPublished: true,
  ...over,
});
const saveAtt = (actor: ReturnType<typeof ADMIN>, p: unknown) =>
  as<{ id: string }>(db, actor, `select public.admin_save_attraction($1::jsonb) as id`, [JSON.stringify(p)]).then((r) => r[0].id);

const ven = (over: Record<string, unknown> = {}) => ({
  slugBase: "new-vendor",
  name: "New Vendor",
  description: "d",
  locationName: "Kuching City Centre",
  contactEmail: "hi@vendor.test",
  contactPhone: "+60 82-111",
  avatarUrl: "https://x.test/a.jpg",
  verificationStatus: "pending",
  isPublished: false,
  ...over,
});
const saveVen = (actor: ReturnType<typeof ADMIN>, p: unknown) =>
  as<{ id: string }>(db, actor, `select public.admin_save_vendor($1::jsonb) as id`, [JSON.stringify(p)]).then((r) => r[0].id);

beforeAll(async () => {
  db = await freshDb();
  admin = await createUser(db, "Root", { admin: true });
  tourist = await createUser(db, "Tina");
  vendorId = (await db.query<{ id: string }>(`select id from public.vendors order by slug limit 1`)).rows[0].id;
  locationId = (await db.query<{ id: string }>(`select id from public.locations order by name limit 1`)).rows[0].id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("who may call the admin functions", () => {
  it("only admins: a traveller gets 'admin only', a visitor is refused outright", async () => {
    for (const fn of ["admin_save_experience", "admin_save_attraction", "admin_save_vendor"]) {
      await expect(as(db, TOURIST(), `select public.${fn}('{}'::jsonb)`)).rejects.toThrow(/admin only/);
      await expect(as(db, { role: "anon" }, `select public.${fn}('{}'::jsonb)`)).rejects.toThrow(/permission denied/i);
    }
    await expect(
      as(db, TOURIST(), `select public.admin_set_vendor_verification($1, 'verified')`, [vendorId]),
    ).rejects.toThrow(/admin only/);
    const n = (await db.query<{ n: number }>(`select count(*)::int as n from public.experiences where slug like 'new-tour%'`)).rows[0].n;
    expect(n).toBe(0);
  });

  it("plain table writes are admin-only too (RLS is the second lock)", async () => {
    await as(db, TOURIST(), `update public.experiences set price_per_person = 1`);
    await as(db, TOURIST(), `delete from public.vendors`);
    const p = await db.query<{ n: number }>(`select count(*)::int as n from public.experiences where price_per_person = 1`);
    expect(p.rows[0].n).toBe(0);
    expect((await db.query(`select 1 from public.vendors`)).rows.length).toBeGreaterThan(0);
  });
});

describe("admin_save_experience", () => {
  it("creates the row, category links and ordered photos in one go, owned by the admin", async () => {
    const id = await saveExp(ADMIN(), exp());
    const r = (await db.query<Record<string, unknown>>(`select * from public.experiences where id = $1`, [id])).rows[0];
    expect(r).toMatchObject({
      slug: "new-tour",
      title: "New Tour",
      price_per_person: "99.50",
      languages: ["English", "Malay"],
      includes: ["Guide", "Water"],
      is_published: true,
      is_sample: false,
      created_by: admin,
      booking_leadtime_hours: 12,
      rating: null,
      review_count: 0,
    });
    expect(r.availability).toEqual({ days: ["mon", "tue"], times: ["09:00"], capacity_per_slot: 8 });

    const cats = await db.query<{ slug: string }>(`select c.slug from public.experience_categories x join public.categories c on c.id = x.category_id where x.experience_id = $1 order by 1`, [id]);
    expect(cats.rows.map((c) => c.slug)).toEqual(["culture", "food"]);
    const imgs = await db.query<{ url: string; sort_order: number; is_primary: boolean; alt: string }>(`select url, sort_order, is_primary, alt from public.images where owner_type = 'experience' and owner_id = $1 order by sort_order`, [id]);
    expect(imgs.rows).toEqual([
      { url: "/a.jpg", sort_order: 0, is_primary: true, alt: "New Tour" },
      { url: "/b.jpg", sort_order: 1, is_primary: false, alt: "New Tour" },
      { url: "/c.jpg", sort_order: 2, is_primary: false, alt: "New Tour" },
    ]);
  });

  it("keeps slugs unique (x, x-2, x-3)", async () => {
    const a = await saveExp(ADMIN(), exp({ slugBase: "dup-tour", title: "Dup" }));
    const b = await saveExp(ADMIN(), exp({ slugBase: "dup-tour", title: "Dup" }));
    const c = await saveExp(ADMIN(), exp({ slugBase: "dup-tour", title: "Dup" }));
    const slugs = (await db.query<{ slug: string }>(`select slug from public.experiences where id = any($1) order by slug`, [[a, b, c]])).rows.map((r) => r.slug);
    expect(slugs).toEqual(["dup-tour", "dup-tour-2", "dup-tour-3"]);
  });

  it("editing changes the form's fields but never the slug, rating, review count or sample flag; links and photos are replaced", async () => {
    const seeded = (await db.query<{ id: string; slug: string; rating: string; review_count: number; is_sample: boolean }>(
      `select id, slug, rating::text, review_count, is_sample from public.experiences where slug = 'kuching-heritage-street-food-walk'`)).rows[0];
    const id = await saveExp(ADMIN(), exp({ id: seeded.id, slugBase: "ignored", title: "Renamed Walk", categories: ["adventure"], images: ["/only.jpg"], pricePerPerson: 175, isPublished: false }));
    expect(id).toBe(seeded.id);

    const r = (await db.query<Record<string, unknown>>(`select slug, title, price_per_person::text, rating::text, review_count, is_sample, is_published from public.experiences where id = $1`, [id])).rows[0];
    expect(r).toEqual({ slug: seeded.slug, title: "Renamed Walk", price_per_person: "175.00", rating: seeded.rating, review_count: seeded.review_count, is_sample: seeded.is_sample, is_published: false });

    const cats = await db.query<{ slug: string }>(`select c.slug from public.experience_categories x join public.categories c on c.id = x.category_id where x.experience_id = $1`, [id]);
    expect(cats.rows.map((c) => c.slug)).toEqual(["adventure"]);
    const imgs = await db.query<{ url: string }>(`select url from public.images where owner_type = 'experience' and owner_id = $1`, [id]);
    expect(imgs.rows).toEqual([{ url: "/only.jpg" }]);
  });

  it("a bad vendor or a missing experience is an error and changes nothing", async () => {
    const before = (await db.query<{ n: number }>(`select count(*)::int as n from public.experiences`)).rows[0].n;
    await expect(saveExp(ADMIN(), exp({ slugBase: "ghost", vendorId: "00000000-0000-0000-0000-000000000000" }))).rejects.toThrow(/foreign key|violates/i);
    await expect(saveExp(ADMIN(), exp({ id: "00000000-0000-0000-0000-000000000000" }))).rejects.toThrow(/experience not found/);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.experiences`)).rows[0].n).toBe(before);
    expect((await db.query(`select 1 from public.experiences where slug like 'ghost%'`)).rows).toHaveLength(0);
  });

  it("the database still enforces its own rules (min/max pax)", async () => {
    await expect(saveExp(ADMIN(), exp({ slugBase: "bad-pax", minPax: 9, maxPax: 2 }))).rejects.toThrow(/experiences_pax_valid/);
  });
});

describe("admin_save_attraction", () => {
  it("creates, and editing leaves opening hours / booking flag untouched", async () => {
    const id = await saveAtt(ADMIN(), att());
    expect((await db.query<{ is_sample: boolean; created_by: string }>(`select is_sample, created_by from public.attractions where id = $1`, [id])).rows[0]).toEqual({ is_sample: false, created_by: admin });

    const seeded = (await db.query<{ id: string; opening_hours: unknown; booking_required: boolean; lat: number }>(`select id, opening_hours, booking_required, lat from public.attractions where slug = 'bako-national-park'`)).rows[0];
    await saveAtt(ADMIN(), att({ id: seeded.id, name: "Bako Renamed", categories: ["nature", "wildlife"] }));
    const after = (await db.query<{ name: string; opening_hours: unknown; booking_required: boolean; lat: number }>(`select name, opening_hours, booking_required, lat from public.attractions where id = $1`, [seeded.id])).rows[0];
    expect(after).toEqual({ name: "Bako Renamed", opening_hours: seeded.opening_hours, booking_required: seeded.booking_required, lat: seeded.lat });
    const cats = await db.query<{ slug: string }>(`select c.slug from public.attraction_categories x join public.categories c on c.id = x.category_id where x.attraction_id = $1 order by 1`, [seeded.id]);
    expect(cats.rows.map((c) => c.slug)).toEqual(["nature", "wildlife"]);
  });
});

describe("admin_save_vendor + verification", () => {
  it("stores contact details, resolves the location by name, and stamps verification", async () => {
    const id = await saveVen(ADMIN(), ven({ verificationStatus: "verified" }));
    const v = (await db.query<{ contact: unknown; location_id: string; verified_by: string; verified_at: string | null; avatar_url: string }>(`select contact, location_id, verified_by, verified_at::text, avatar_url from public.vendors where id = $1`, [id])).rows[0];
    expect(v.contact).toEqual({ email: "hi@vendor.test", phone: "+60 82-111" });
    expect(v.verified_by).toBe(admin);
    expect(v.verified_at).not.toBeNull();
    expect(v.avatar_url).toBe("https://x.test/a.jpg");
    expect(v.location_id).toBeTruthy();
  });

  it("clearing a contact field really clears it; other contact keys survive an edit", async () => {
    const id = await saveVen(ADMIN(), ven({ slugBase: "keeps-keys" }));
    await db.query(`update public.vendors set contact = contact || '{"website":"https://v.test"}'::jsonb where id = $1`, [id]);
    await saveVen(ADMIN(), ven({ id, contactPhone: "" }));
    const c = (await db.query<{ contact: unknown }>(`select contact from public.vendors where id = $1`, [id])).rows[0].contact;
    expect(c).toEqual({ email: "hi@vendor.test", website: "https://v.test" });
  });

  it("refuses a location that doesn't exist instead of inventing one", async () => {
    await expect(saveVen(ADMIN(), ven({ slugBase: "nowhere", locationName: "Atlantis" }))).rejects.toThrow(/unknown location/);
    expect((await db.query(`select 1 from public.vendors where slug like 'nowhere%'`)).rows).toHaveLength(0);
  });

  it("verification is stamped once, cleared when it's withdrawn", async () => {
    const id = await saveVen(ADMIN(), ven({ slugBase: "to-verify" }));
    const row = async () => (await db.query<{ verification_status: string; verified_at: string | null; verified_by: string | null }>(`select verification_status, verified_at::text, verified_by from public.vendors where id = $1`, [id])).rows[0];
    expect(await row()).toMatchObject({ verification_status: "pending", verified_at: null, verified_by: null });

    await as(db, ADMIN(), `select public.admin_set_vendor_verification($1, 'verified')`, [id]);
    const first = await row();
    expect(first).toMatchObject({ verification_status: "verified", verified_by: admin });
    expect(first.verified_at).not.toBeNull();

    await as(db, ADMIN(), `select public.admin_set_vendor_verification($1, 'verified')`, [id]);
    expect((await row()).verified_at).toBe(first.verified_at); // not re-stamped

    await as(db, ADMIN(), `select public.admin_set_vendor_verification($1, 'rejected')`, [id]);
    expect(await row()).toMatchObject({ verification_status: "rejected", verified_at: null, verified_by: null });
  });
});

describe("bookings: admins change STATUS only", () => {
  let bookingId: string;
  beforeAll(async () => {
    const experienceId = (await db.query<{ id: string }>(`select id from public.experiences where slug = 'kuching-heritage-street-food-walk'`)).rows[0].id;
    bookingId = (await as<{ id: string }>(db, { role: "service" },
      `insert into public.bookings (user_id, experience_id, booking_date, num_adults, unit_price, subtotal, service_fee, total_amount,
         customer_name, customer_email, experience_title, experience_slug, vendor_name)
       values ($1, $2, '2026-12-02', 2, 150, 300, 18, 318, 'Tina', 't@t.test', 'Walk', 'walk', 'V') returning id`, [tourist, experienceId]))[0].id;
  });

  it("an admin can complete/refund a booking; the history names the admin", async () => {
    await as(db, ADMIN(), `update public.bookings set status = 'confirmed' where id = $1`, [bookingId]);
    await as(db, ADMIN(), `update public.bookings set status = 'refunded', cancellation_reason = 'goodwill' where id = $1`, [bookingId]);
    const r = (await db.query<{ status: string; cancellation_reason: string }>(`select status, cancellation_reason from public.bookings where id = $1`, [bookingId])).rows[0];
    expect(r).toEqual({ status: "refunded", cancellation_reason: "goodwill" });
    const h = await db.query<{ from_status: string; to_status: string; changed_by: string }>(`select from_status, to_status, changed_by from public.booking_status_history where booking_id = $1 order by created_at`, [bookingId]);
    expect(h.rows).toEqual([
      { from_status: "pending", to_status: "confirmed", changed_by: admin },
      { from_status: "confirmed", to_status: "refunded", changed_by: admin },
    ]);
  });

  it("…but never the money, even as an admin", async () => {
    await expect(as(db, ADMIN(), `update public.bookings set total_amount = 1 where id = $1`, [bookingId])).rejects.toThrow(/permission denied/i);
    await expect(as(db, ADMIN(), `update public.bookings set subtotal = 1, unit_price = 1 where id = $1`, [bookingId])).rejects.toThrow(/permission denied/i);
    await expect(as(db, ADMIN(), `insert into public.bookings (user_id, experience_id, booking_date, unit_price, subtotal, total_amount, customer_name, customer_email, experience_title, experience_slug, vendor_name) select user_id, experience_id, booking_date, 0, 0, 0, 'x','x@x.test','t','s','v' from public.bookings limit 1`)).rejects.toThrow(/permission denied/i);
  });

  it("a traveller still can't touch their own booking's status", async () => {
    await as(db, TOURIST(), `update public.bookings set status = 'confirmed' where id = $1`, [bookingId]);
    expect((await db.query<{ status: string }>(`select status from public.bookings where id = $1`, [bookingId])).rows[0].status).toBe("refunded");
  });
});

describe("photos go with what they belong to", () => {
  const photos = async (type: string, id: string) =>
    (await db.query<{ n: number }>(`select count(*)::int as n from public.images where owner_type = $1::public.image_owner and owner_id = $2`, [type, id])).rows[0].n;

  it("deleting an experience or an attraction removes its photos", async () => {
    const e = await saveExp(ADMIN(), exp({ slugBase: "photo-exp" }));
    const a = await saveAtt(ADMIN(), att({ slugBase: "photo-att" }));
    expect(await photos("experience", e)).toBe(3);
    expect(await photos("attraction", a)).toBe(1);
    await as(db, ADMIN(), `delete from public.experiences where id = $1`, [e]);
    await as(db, ADMIN(), `delete from public.attractions where id = $1`, [a]);
    expect(await photos("experience", e)).toBe(0);
    expect(await photos("attraction", a)).toBe(0);
  });

  it("deleting a vendor takes its experiences' photos with it (cascade)", async () => {
    const v = await saveVen(ADMIN(), ven({ slugBase: "photo-vendor" }));
    const e = await saveExp(ADMIN(), exp({ slugBase: "photo-cascade", vendorId: v }));
    await db.query(`insert into public.images (owner_type, owner_id, url) values ('vendor', $1, '/v.jpg')`, [v]);
    expect(await photos("experience", e)).toBe(3);
    expect(await photos("vendor", v)).toBe(1);
    await as(db, ADMIN(), `delete from public.vendors where id = $1`, [v]);
    expect(await photos("experience", e)).toBe(0);
    expect(await photos("vendor", v)).toBe(0);
  });

  it("nothing is orphaned anywhere after all of the above", async () => {
    const n = await db.query<{ n: number }>(
      `select count(*)::int as n from public.images i
       where (i.owner_type = 'experience' and not exists (select 1 from public.experiences e where e.id = i.owner_id))
          or (i.owner_type = 'attraction' and not exists (select 1 from public.attractions a where a.id = i.owner_id))
          or (i.owner_type = 'vendor' and not exists (select 1 from public.vendors v where v.id = i.owner_id))`);
    expect(n.rows[0].n).toBe(0);
  });
});

describe("deleting things that have been sold", () => {
  it("an experience with bookings can't be deleted (unpublish it instead); a vendor with such experiences can't either", async () => {
    const e = (await db.query<{ id: string; vendor_id: string }>(`select id, vendor_id from public.experiences where slug = 'kuching-heritage-street-food-walk'`)).rows[0];
    await expect(as(db, ADMIN(), `delete from public.experiences where id = $1`, [e.id])).rejects.toThrow(/bookings_experience_id_fkey|foreign key/i);
    await expect(as(db, ADMIN(), `delete from public.vendors where id = $1`, [e.vendor_id])).rejects.toThrow(/bookings_experience_id_fkey|foreign key/i);
    // …and an unsold one goes cleanly, taking its links and photos with it
    const id = await saveExp(ADMIN(), exp({ slugBase: "unsold" }));
    await as(db, ADMIN(), `delete from public.experiences where id = $1`, [id]);
    expect((await db.query(`select 1 from public.experience_categories where experience_id = $1`, [id])).rows).toHaveLength(0);
  });
});
