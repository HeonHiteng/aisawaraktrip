import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";

/**
 * The local food guide and the must-see ranking on the REAL database: public reads, admin
 * writes (slug clashes included), and a real itinerary that names guide places for its meals.
 * Everything created here is removed afterwards.
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));

import {
  adminDeleteAttraction,
  adminDeleteEatery,
  adminGetEatery,
  adminListEateries,
  adminSaveAttraction,
  adminSaveEatery,
} from "@/lib/domain/admin";
import { listAttractions, listLocations } from "@/lib/domain/catalogue";
import { listEateries } from "@/lib/domain/eateries";
import { generateItinerary } from "@/lib/ai/generate";
import type { TripInput } from "@/types/trip";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

const users: string[] = [];
const eateryIds: string[] = [];
const attractionIds: string[] = [];
let adminClient: SupabaseClient<Database>;
const tag = Date.now().toString(36);

beforeAll(async () => {
  adminClient = createClient<Database>(url, anon, opts);
  const { data, error } = await adminClient.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  await svc.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  state.current = adminClient;
});

afterAll(async () => {
  state.current = adminClient;
  for (const id of eateryIds) await adminDeleteEatery(id).catch(() => {});
  for (const id of attractionIds) await adminDeleteAttraction(id).catch(() => {});
  for (const id of users) await svc.auth.admin.deleteUser(id);
});

describe("food guide (live)", () => {
  it("travellers see the whole published guide, Kuching first", async () => {
    const all = await listEateries();
    expect(all.length).toBeGreaterThanOrEqual(30);
    expect(all[0].city).toBe("Kuching");
    expect(new Set(all.map((e) => e.city))).toEqual(new Set(["Kuching", "Sibu", "Miri", "Bintulu"]));
    expect((await listEateries({ city: "Miri", dish: "laksa" })).map((e) => e.name).sort()).toEqual(["A Ma's Laksa", "Kebaya Story", "Laksa Lolita"]);
  });

  it("an admin can add, edit and remove an eatery; a clashing name gets its own web address", async () => {
    const form = { name: `Live Test Kopitiam ${tag}`, city: "Kuching" as const, dishes: ["kolo-mee"], priceTier: 1 as const, isSplurge: false, mapsUrl: "https://maps.app.goo.gl/livetest", notes: "", isPublished: true };
    const a = await adminSaveEatery(form);
    const b = await adminSaveEatery(form); // same name -> slug -2
    eateryIds.push(a.id, b.id);
    expect(b.slug).toBe(`${a.slug}-2`);

    const edited = await adminSaveEatery({ ...form, id: a.id, priceTier: 2, notes: "Cash only." });
    expect(edited).toMatchObject({ id: a.id, priceTier: 2, notes: "Cash only." });

    // a draft is hidden from travellers but not from the admin
    await adminSaveEatery({ ...form, id: b.id, isPublished: false });
    expect((await listEateries()).some((e) => e.id === b.id)).toBe(false);
    expect((await adminListEateries()).some((e) => e.id === b.id)).toBe(true);

    await adminDeleteEatery(a.id);
    expect(await adminGetEatery(a.id)).toBeNull();
  });

  it("a traveller (non-admin) cannot write to the guide", async () => {
    const guest = createClient<Database>(url, anon, opts);
    const { data } = await guest.auth.signInAnonymously();
    users.push(data.user!.id);
    const ins = await guest.from("eateries").insert({ slug: `nope-${tag}`, name: "Nope", city: "Kuching" });
    expect(ins.error).not.toBeNull();
    const del = await guest.from("eateries").delete().eq("slug", "lepau");
    expect(del.error).toBeNull(); // RLS hides the row: deletes nothing
    expect((await listEateries({ search: "lepau" })).length).toBe(1);
  });
});

describe("must-see ranking (live)", () => {
  it("published attractions come back must-see first; the draft places stay hidden from travellers", async () => {
    const list = await listAttractions();
    const ranked = list.filter((a) => a.featuredRank != null);
    expect(ranked.map((a) => a.slug)).toEqual(expect.arrayContaining(["semenggoh-nature-reserve", "sarawak-cultural-village", "bako-national-park"]));
    expect(list[0].featuredRank).not.toBeNull();
    expect(list.map((a) => a.slug)).not.toContain("gunung-mulu-national-park"); // unpublished draft
    // ranked places precede the unranked
    const firstUnranked = list.findIndex((a) => a.featuredRank == null);
    expect(list.slice(firstUnranked).every((a) => a.featuredRank == null)).toBe(true);
  });

  it("an admin can rank an attraction, and clear it again", async () => {
    const loc = (await listLocations())[0];
    const base = {
      name: `Live Rank ${tag}`, summary: "", description: "", locationId: loc.id, address: "", avgVisitMinutes: 60,
      priceMin: 0, priceMax: 0, isFree: true, categories: ["heritage" as const], tips: "", images: "", isPublished: false,
    };
    const a = await adminSaveAttraction({ ...base, featuredRank: 4 });
    attractionIds.push(a.id);
    expect(a.featuredRank).toBe(4);
    expect((await adminSaveAttraction({ ...base, id: a.id, featuredRank: null })).featuredRank).toBeNull();
  });
});

describe("planner uses the guide (live)", () => {
  it("a real itinerary names places from the guide for its meals, and skips places outside Kuching", async () => {
    const trip: TripInput = {
      title: "t", startDate: "2027-03-02", endDate: "2027-03-05", budgetPerPerson: 2000, groupType: "couple",
      numAdults: 2, numChildren: 0, interests: ["food", "culture", "nature"], pace: "moderate", notes: null,
    };
    const it = await generateItinerary(trip);
    const meals = it.days.flatMap((d) => d.items).filter((i) => i.type === "meal");
    const guide = new Set((await listEateries({ city: "Kuching" })).map((e) => e.name));
    const named = meals.filter((m) => /^(Lunch|Dinner) at /.test(m.title));
    expect(named.length).toBeGreaterThan(0);
    for (const m of named) expect(guide.has(m.title.replace(/^(Lunch|Dinner) at /, ""))).toBe(true);
    const slugs = it.days.flatMap((d) => d.items).map((i) => i.attractionSlug).filter(Boolean);
    expect(slugs).not.toContain("gunung-mulu-national-park");
    expect(slugs).not.toContain("niah-caves");
  });
});
