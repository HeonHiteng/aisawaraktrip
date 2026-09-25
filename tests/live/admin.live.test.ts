import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import type { ExperienceForm } from "@/lib/validation/admin";

/**
 * Admin, for real: a real (anonymous-auth) user promoted to admin, acting through
 * the same domain code the admin screens call, against the real project. The
 * traveller side is a second real guest. Everything created is deleted afterwards.
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));

import {
  AdminError,
  adminAnalytics,
  adminDeleteAttraction,
  adminDeleteExperience,
  adminDeleteVendor,
  adminGetBooking,
  adminGetExperience,
  adminListAttractions,
  adminListBookings,
  adminListExperiences,
  adminListUsers,
  adminListVendors,
  adminSaveAttraction,
  adminSaveExperience,
  adminSaveVendor,
  adminSetBookingStatus,
  adminSetExperiencePublished,
  adminSetVendorVerification,
} from "@/lib/domain/admin";
import { getExperience, listExperiences, listLocations } from "@/lib/domain/catalogue";
import { createBooking } from "@/lib/domain/bookings";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

const users: string[] = [];
const made = { experiences: [] as string[], vendors: [] as string[], attractions: [] as string[] };

async function guest(): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  return { id: data.user.id, client };
}

let root: Awaited<ReturnType<typeof guest>>;
let traveller: Awaited<ReturnType<typeof guest>>;
let vendorId: string;
let locationId: string;
let locationName: string;
const as = (u: typeof root) => (state.current = u.client);
const tag = `live-${Date.now().toString(36)}`;

const expForm = (over: Partial<ExperienceForm> = {}): ExperienceForm => ({
  title: `Live Test Tour ${tag}`,
  summary: "A tour created by the live admin test.",
  description: "Only exists while the test runs.",
  vendorId,
  locationId,
  durationMinutes: 120,
  pricePerPerson: 120,
  minPax: 1,
  maxPax: 6,
  categories: ["food", "culture"],
  meetingPoint: "Test jetty",
  availabilityDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  availabilityTimes: "10:00",
  capacityPerSlot: 6,
  bookingLeadtimeHours: 24,
  languages: "English, Malay",
  includes: "Guide, Water",
  cancellationPolicy: "",
  images: "/demo/kayak.jpg, /demo/cooking.jpg",
  isPublished: true,
  ...over,
});

beforeAll(async () => {
  root = await guest();
  traveller = await guest();
  const { error } = await svc.from("profiles").update({ role: "admin" }).eq("id", root.id);
  if (error) throw new Error(`promote failed: ${error.message}`);

  as(root);
  vendorId = (await adminListVendors())[0].id;
  const loc = (await listLocations())[0];
  locationId = loc.id;
  locationName = loc.name;
});

afterAll(async () => {
  // users first: their bookings cascade, which un-blocks deleting the catalogue rows
  for (const id of users) await svc.auth.admin.deleteUser(id);
  if (made.experiences.length) await svc.from("experiences").delete().in("id", made.experiences);
  if (made.vendors.length) await svc.from("vendors").delete().in("id", made.vendors);
  if (made.attractions.length) await svc.from("attractions").delete().in("id", made.attractions);
});

describe("admin catalogue (live, as a real admin)", () => {
  it("a traveller can't use any admin function", async () => {
    as(traveller);
    await expect(adminSaveExperience(expForm({ title: `Nope ${tag}` }))).rejects.toThrow(/Only admins/);
    await expect(adminSaveVendor({ name: `Nope ${tag}`, description: "", locationName: "", contactPhone: "", verificationStatus: "verified", isPublished: true })).rejects.toThrow(/Only admins/);
    const { data } = await svc.from("experiences").select("id").ilike("title", `Nope ${tag}%`);
    expect(data).toEqual([]);
  });

  it("creates an experience (row + categories + ordered photos), edits it, hides and shows it", async () => {
    as(root);
    const created = await adminSaveExperience(expForm());
    made.experiences.push(created.id);
    expect(created).toMatchObject({
      title: `Live Test Tour ${tag}`,
      pricePerPerson: 120,
      languages: ["English", "Malay"],
      includes: ["Guide", "Water"],
      cancellationPolicy: "Free cancellation up to 24 hours before start.",
      isSample: false,
      isPublished: true,
      rating: null,
      reviewCount: 0,
      vendor: { id: vendorId },
      location: { id: locationId },
    });
    expect(created.categories.sort()).toEqual(["culture", "food"]);
    expect(created.images.map((i) => i.url)).toEqual(["/demo/kayak.jpg", "/demo/cooking.jpg"]);
    expect(created.availability).toEqual({ days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], times: ["10:00"], capacityPerSlot: 6 });

    // published -> visible to the public (anonymous) catalogue
    expect((await listExperiences()).map((e) => e.id)).toContain(created.id);

    // edit: slug/rating stay, everything else changes, links + photos are replaced
    const edited = await adminSaveExperience(expForm({ id: created.id, title: `Live Test Tour ${tag} v2`, pricePerPerson: 175, categories: ["adventure"], images: "/demo/fort.jpg" }));
    expect(edited).toMatchObject({ id: created.id, slug: created.slug, pricePerPerson: 175, title: `Live Test Tour ${tag} v2` });
    expect(edited.categories).toEqual(["adventure"]);
    expect(edited.images.map((i) => i.url)).toEqual(["/demo/fort.jpg"]);

    // unpublish: gone for the public, still there for the admin
    await adminSetExperiencePublished(created.id, false);
    expect((await listExperiences()).map((e) => e.id)).not.toContain(created.id);
    expect(await getExperience(created.slug)).toBeNull();
    expect((await adminListExperiences()).map((e) => e.id)).toContain(created.id);
    expect((await adminGetExperience(created.id))?.isPublished).toBe(false);
    await adminSetExperiencePublished(created.id, true);
    expect((await getExperience(created.slug))?.pricePerPerson).toBe(175);
  });

  it("two experiences with the same title get distinct slugs", async () => {
    as(root);
    const a = await adminSaveExperience(expForm({ title: `Twin ${tag}`, isPublished: false }));
    const b = await adminSaveExperience(expForm({ title: `Twin ${tag}`, isPublished: false }));
    made.experiences.push(a.id, b.id);
    expect(a.slug).not.toBe(b.slug);
    expect(b.slug).toBe(`${a.slug}-2`);
  });

  it("bad input becomes a readable AdminError, never a crash or a half-saved row", async () => {
    as(root);
    await expect(adminSaveExperience(expForm({ vendorId: "not-a-uuid" }))).rejects.toThrow(AdminError);
    await expect(adminSaveExperience(expForm({ vendorId: "00000000-0000-0000-0000-000000000000", title: `Ghost ${tag}` }))).rejects.toThrow(/valid vendor and location/);
    await expect(adminSaveExperience(expForm({ minPax: 9, maxPax: 2, title: `Ghost2 ${tag}` }))).rejects.toThrow(/Max pax must be at least min pax/);
    await expect(adminSaveExperience(expForm({ id: "00000000-0000-0000-0000-000000000000" }))).rejects.toThrow(/Experience not found/);
    const { data } = await svc.from("experiences").select("id").ilike("title", `Ghost%${tag}%`);
    expect(data).toEqual([]);
    expect(await adminGetExperience("nope")).toBeNull();
  });

  it("deleting an unsold experience takes its photos and category links with it (no orphans)", async () => {
    as(root);
    const e = await adminSaveExperience(expForm({ title: `Doomed ${tag}`, isPublished: false }));
    const count = async (table: "images" | "experience_categories", col: string) =>
      (await svc.from(table).select("*", { count: "exact", head: true }).eq(col, e.id)).count;
    expect(await count("images", "owner_id")).toBe(2);
    expect(await count("experience_categories", "experience_id")).toBe(2);

    await adminDeleteExperience(e.id);
    expect(await adminGetExperience(e.id)).toBeNull();
    expect(await count("images", "owner_id")).toBe(0);
    expect(await count("experience_categories", "experience_id")).toBe(0);
  });

  it("vendors: contact details, location by name, verification; unknown location refused", async () => {
    as(root);
    const v = await adminSaveVendor({ name: `Live Vendor ${tag}`, description: "d", locationName, contactEmail: "v@vendor.test", contactPhone: "+60 82-999", verificationStatus: "pending", isPublished: false });
    made.vendors.push(v.id);
    expect(v).toMatchObject({ name: `Live Vendor ${tag}`, locationName, contactEmail: "v@vendor.test", contactPhone: "+60 82-999", verificationStatus: "pending", isSample: false });

    await adminSetVendorVerification(v.id, "verified");
    expect((await adminListVendors()).find((x) => x.id === v.id)?.verificationStatus).toBe("verified");

    await expect(adminSaveVendor({ name: `Nowhere ${tag}`, description: "", locationName: "Atlantis", contactPhone: "", verificationStatus: "pending", isPublished: false })).rejects.toThrow(/Unknown location: Atlantis/);
    await adminDeleteVendor(v.id);
    expect((await adminListVendors()).find((x) => x.id === v.id)).toBeUndefined();
  });

  it("attractions: create with categories/photos, edit, delete", async () => {
    as(root);
    const a = await adminSaveAttraction({ name: `Live Place ${tag}`, summary: "s", description: "d", locationId, address: "Jalan Test", avgVisitMinutes: 45, priceMin: 10, priceMax: 25, isFree: false, categories: ["heritage", "culture"], tips: "t", images: "/demo/temple.jpg", isPublished: true });
    made.attractions.push(a.id);
    expect(a).toMatchObject({ name: `Live Place ${tag}`, priceMin: 10, priceMax: 25, isSample: false, address: "Jalan Test" });
    expect(a.categories.sort()).toEqual(["culture", "heritage"]);

    const free = await adminSaveAttraction({ id: a.id, name: a.name, summary: "s", description: "d", locationId, address: "Jalan Test", avgVisitMinutes: 45, priceMin: 10, priceMax: 25, isFree: true, categories: ["heritage"], tips: "t", images: "", isPublished: true });
    expect(free).toMatchObject({ isFree: true, priceMin: 0, priceMax: 0 });
    expect(free.images).toEqual([]);

    await adminDeleteAttraction(a.id);
    expect((await adminListAttractions()).find((x) => x.id === a.id)).toBeUndefined();
  });
});

describe("admin bookings, analytics and users (live)", () => {
  it("something that has been sold can't be deleted — only unpublished; the admin then manages the booking", async () => {
    as(root);
    const exp = await adminSaveExperience(expForm({ title: `Sold Tour ${tag}` }));
    made.experiences.push(exp.id);

    as(traveller);
    const date = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
    const booking = await createBooking(traveller.id, {
      experienceId: exp.id, tripId: null, bookingDate: date, startTime: "10:00",
      numAdults: 2, numChildren: 0, customerName: "Tess Traveller", customerEmail: "tess@example.test",
      customerPhone: null, specialRequests: null,
    });
    if ("error" in booking) throw new Error(booking.error);
    expect(booking).toMatchObject({ totalAmount: 254.4, experienceTitle: `Sold Tour ${tag}` }); // 2 x 120 + 6%

    as(root);
    await expect(adminDeleteExperience(exp.id)).rejects.toThrow(/has bookings.*unpublish/);
    await adminSetExperiencePublished(exp.id, false); // the supported way out
    expect((await adminGetExperience(exp.id))?.isPublished).toBe(false);

    // admin sees it, changes status; the history names the admin
    expect((await adminListBookings()).map((b) => b.id)).toContain(booking.id);
    await adminSetBookingStatus(booking.id, "confirmed");
    await adminSetBookingStatus(booking.id, "completed");
    expect((await adminGetBooking(booking.id))?.status).toBe("completed");
    const { data: hist } = await svc.from("booking_status_history").select("from_status,to_status,changed_by").eq("booking_id", booking.id).order("created_at");
    expect(hist).toEqual([
      { from_status: "pending", to_status: "confirmed", changed_by: root.id },
      { from_status: "confirmed", to_status: "completed", changed_by: root.id },
    ]);
    // money is untouched by any of it
    expect((await adminGetBooking(booking.id))?.totalAmount).toBe(254.4);

    // a traveller (non-admin) can't change status: nothing matches, so it's "not found"
    as(traveller);
    await expect(adminSetBookingStatus(booking.id, "refunded")).rejects.toThrow(/Booking not found/);
    as(root);
    expect((await adminGetBooking(booking.id))?.status).toBe("completed");
    expect(await adminGetBooking("nope")).toBeNull();
  });

  it("the dashboard adds up and matches the catalogue", async () => {
    as(root);
    const a = await adminAnalytics();
    const [experiences, vendors, attractions, bookings] = await Promise.all([
      adminListExperiences(), adminListVendors(), adminListAttractions(), adminListBookings(),
    ]);
    expect(a.catalogue).toEqual({
      experiences: experiences.length,
      publishedExperiences: experiences.filter((e) => e.isPublished).length,
      vendors: vendors.length,
      unverifiedVendors: vendors.filter((v) => v.verificationStatus !== "verified").length,
      attractions: attractions.length,
    });
    expect(a.kpis.bookings).toBe(bookings.length);
    expect(a.byStatus.reduce((n, s) => n + s.count, 0)).toBe(bookings.length);
    expect(a.byStatus.find((s) => s.status === "completed")!.count).toBeGreaterThanOrEqual(1);
    expect(a.weekly).toHaveLength(10);
    expect(a.weekly.reduce((n, w) => n + w.bookings, 0)).toBeGreaterThanOrEqual(1);
  });

  it("lists users with roles and booking counts (emails come from the auth system)", async () => {
    as(root);
    const list = await adminListUsers();
    const me = list.find((u) => u.id === root.id)!;
    const tess = list.find((u) => u.id === traveller.id)!;
    expect(me).toMatchObject({ role: "admin", email: null });
    expect(me.note).toMatch(/^administrator · 0 bookings$/);
    expect(tess).toMatchObject({ role: "tourist", email: null });
    expect(tess.note).toBe("anonymous · 1 booking");
  });
});
