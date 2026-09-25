import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { catalogueStore } from "@/lib/demo/catalogue-store";
import { allDemoBookings, allDemoPayments, demoStores } from "@/lib/demo/store";
import { demoLocations } from "@/lib/demo/fixtures";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ATTRACTION_SELECT,
  EXPERIENCE_SELECT,
  hydrateAttractions,
  hydrateExperiences,
} from "@/lib/domain/catalogue";
import {
  adminVendorFromRow,
  attractionFormToRpc,
  DEFAULT_CANCELLATION,
  DEFAULT_LANGUAGES,
  experienceFormToRpc,
  parseList,
  vendorFormToRpc,
  type AdminVendorRow,
} from "@/lib/domain/mappers/admin";
import { bookingFromRow } from "@/lib/domain/mappers/bookings";
import {
  isUuid,
  type AttractionRow,
  type ExperienceRow,
} from "@/lib/domain/mappers/catalogue";
import { slugify } from "@/lib/validation/admin";
import type {
  ExperienceForm,
  VendorForm,
  AttractionForm,
} from "@/lib/validation/admin";
import type {
  Attraction,
  Experience,
  Vendor,
  VerificationStatus,
} from "@/types/catalogue";
import type { Booking, BookingStatus } from "@/types/booking";

/**
 * Admin reads/writes.
 *
 * Demo mode edits the in-memory catalogue store. Real mode runs under the ADMIN'S
 * OWN session (the cookie client), so RLS `is_admin()` is the authority — a missing
 * `requireAdmin()` in some future action still can't write anything as a non-admin,
 * and every change is attributed to the real admin. The service role is used for
 * exactly one thing: listing users' emails, which live in the auth system.
 */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** An expected, user-facing failure (bad input, "it has bookings"). Anything else is a bug and throws normally. */
export class AdminError extends Error {}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Translate a Postgres/PostgREST error into a message an admin can act on. */
function fail(
  error: { code?: string; message: string },
  what: "save" | "delete" | "update",
): never {
  const m = error.message;
  if (error.code === "42501" || /admin only/i.test(m)) {
    throw new AdminError("Only admins can do that.");
  }
  if (error.code === "23503") {
    throw new AdminError(
      what === "delete"
        ? "It has bookings, so it can't be deleted — unpublish it instead."
        : "Pick a valid vendor and location.",
    );
  }
  if (error.code === "23514" && /experiences_pax_valid/.test(m)) {
    throw new AdminError("Max pax must be at least min pax.");
  }
  if (error.code === "P0002") throw new AdminError(capitalise(m));
  throw new Error(`admin ${what}: ${m}`);
}

/** Every PostgREST page is capped at 1000 rows: read them all, and fail loudly rather than truncate. */
async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  cap = 20_000,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; from < cap; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
  throw new Error(`admin list is over ${cap} rows — it needs real pagination`);
}

const notUuid = (what: string) => new AdminError(`That ${what} isn't valid.`);

// ---------- experiences ----------

export async function adminListExperiences(): Promise<Experience[]> {
  if (DEMO_MODE) return catalogueStore().experiences;
  const db = await createClient();
  const { data, error } = await db
    .from("experiences")
    .select(EXPERIENCE_SELECT)
    .order("title")
    .limit(1000);
  if (error) throw new Error(`admin experiences: ${error.message}`);
  return hydrateExperiences(data as unknown as ExperienceRow[], db);
}

export async function adminGetExperience(id: string): Promise<Experience | null> {
  if (DEMO_MODE)
    return catalogueStore().experiences.find((e) => e.id === id) ?? null;
  if (!isUuid(id)) return null;
  const db = await createClient();
  const { data, error } = await db
    .from("experiences")
    .select(EXPERIENCE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`admin experience: ${error.message}`);
  if (!data) return null;
  return (await hydrateExperiences([data as unknown as ExperienceRow], db))[0];
}

export async function adminSaveExperience(
  input: ExperienceForm,
): Promise<Experience> {
  if (!DEMO_MODE) {
    for (const [what, v] of [
      ["vendor", input.vendorId],
      ["location", input.locationId],
    ] as const) {
      if (!isUuid(v)) throw notUuid(what);
    }
    if (input.id && !isUuid(input.id)) throw notUuid("experience");
    const db = await createClient();
    const { data: id, error } = await db.rpc("admin_save_experience", {
      p: experienceFormToRpc(input),
    });
    if (error) fail(error, "save");
    const saved = await adminGetExperience(id);
    if (!saved) throw new Error("admin save: saved but could not be read back");
    return saved;
  }

  const store = catalogueStore();
  const existing = input.id
    ? store.experiences.find((e) => e.id === input.id)
    : undefined;
  const vendor = store.vendors.find((v) => v.id === input.vendorId);
  const location = demoLocations.find((l) => l.id === input.locationId) ?? null;
  const times = parseList(input.availabilityTimes);
  const languages = parseList(input.languages);
  const includes = parseList(input.includes);
  const images = parseList(input.images).map((url) => ({
    url,
    alt: input.title || null,
  }));

  const record: Experience = {
    id: existing?.id ?? `exp-${uid()}`,
    slug: existing?.slug ?? slugify(input.title),
    title: input.title,
    summary: input.summary || null,
    description: input.description || null,
    vendor: vendor
      ? {
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          verificationStatus: vendor.verificationStatus,
          avatarUrl: vendor.avatarUrl,
        }
      : {
          id: input.vendorId,
          name: "Unknown vendor",
          slug: "unknown",
          verificationStatus: "unverified",
          avatarUrl: null,
        },
    location,
    durationMinutes: input.durationMinutes,
    pricePerPerson: input.pricePerPerson,
    currency: "MYR",
    minPax: input.minPax,
    maxPax: input.maxPax,
    languages: languages.length ? languages : DEFAULT_LANGUAGES,
    includes,
    meetingPoint: input.meetingPoint || null,
    cancellationPolicy: input.cancellationPolicy || DEFAULT_CANCELLATION,
    availability: {
      days: input.availabilityDays,
      times,
      capacityPerSlot: input.capacityPerSlot,
    },
    bookingLeadtimeHours: input.bookingLeadtimeHours,
    categories: input.categories,
    images,
    rating: existing?.rating ?? null,
    reviewCount: existing?.reviewCount ?? 0,
    isSample: existing?.isSample ?? false,
    isPublished: input.isPublished,
  };

  if (existing) {
    const i = store.experiences.findIndex((e) => e.id === existing.id);
    store.experiences[i] = record;
  } else {
    store.experiences.unshift(record);
  }
  return record;
}

export async function adminDeleteExperience(id: string): Promise<void> {
  if (DEMO_MODE) {
    const store = catalogueStore();
    store.experiences = store.experiences.filter((e) => e.id !== id);
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient())
    .from("experiences")
    .delete()
    .eq("id", id);
  if (error) fail(error, "delete");
}

export async function adminSetExperiencePublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  if (DEMO_MODE) {
    const e = catalogueStore().experiences.find((x) => x.id === id);
    if (e) e.isPublished = isPublished;
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient())
    .from("experiences")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) fail(error, "update");
}

// ---------- vendors ----------

const VENDOR_SELECT = "*, location:locations(name)";

export async function adminListVendors(): Promise<Vendor[]> {
  if (DEMO_MODE) return catalogueStore().vendors;
  const { data, error } = await (await createClient())
    .from("vendors")
    .select(VENDOR_SELECT)
    .order("name")
    .limit(1000);
  if (error) throw new Error(`admin vendors: ${error.message}`);
  return (data as unknown as AdminVendorRow[]).map(adminVendorFromRow);
}

export async function adminGetVendor(id: string): Promise<Vendor | null> {
  if (DEMO_MODE)
    return catalogueStore().vendors.find((v) => v.id === id) ?? null;
  if (!isUuid(id)) return null;
  const { data, error } = await (await createClient())
    .from("vendors")
    .select(VENDOR_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`admin vendor: ${error.message}`);
  return data ? adminVendorFromRow(data as unknown as AdminVendorRow) : null;
}

export async function adminSaveVendor(input: VendorForm): Promise<Vendor> {
  if (!DEMO_MODE) {
    if (input.id && !isUuid(input.id)) throw notUuid("vendor");
    const { data: id, error } = await (await createClient()).rpc(
      "admin_save_vendor",
      { p: vendorFormToRpc(input) },
    );
    if (error) fail(error, "save");
    const saved = await adminGetVendor(id);
    if (!saved) throw new Error("admin save: saved but could not be read back");
    return saved;
  }

  const store = catalogueStore();
  const existing = input.id
    ? store.vendors.find((v) => v.id === input.id)
    : undefined;

  const record: Vendor = {
    id: existing?.id ?? `ven-${uid()}`,
    slug: existing?.slug ?? slugify(input.name),
    name: input.name,
    description: input.description || null,
    locationName: input.locationName || null,
    contactEmail: input.contactEmail || null,
    contactPhone: input.contactPhone || null,
    verificationStatus: input.verificationStatus,
    avatarUrl: input.avatarUrl || null,
    isSample: existing?.isSample ?? false,
    isPublished: input.isPublished,
  };

  if (existing) {
    const i = store.vendors.findIndex((v) => v.id === existing.id);
    store.vendors[i] = record;
    syncVendorRefs(record);
  } else {
    store.vendors.unshift(record);
  }
  return record;
}

export async function adminDeleteVendor(id: string): Promise<void> {
  if (DEMO_MODE) {
    const store = catalogueStore();
    store.vendors = store.vendors.filter((v) => v.id !== id);
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient())
    .from("vendors")
    .delete()
    .eq("id", id);
  if (error) fail(error, "delete");
}

export async function adminSetVendorVerification(
  id: string,
  status: VerificationStatus,
): Promise<void> {
  if (DEMO_MODE) {
    const v = catalogueStore().vendors.find((x) => x.id === id);
    if (v) {
      v.verificationStatus = status;
      syncVendorRefs(v);
    }
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient()).rpc(
    "admin_set_vendor_verification",
    { p_id: id, p_status: status },
  );
  if (error) fail(error, "update");
}

function syncVendorRefs(v: Vendor) {
  for (const e of catalogueStore().experiences) {
    if (e.vendor.id === v.id) {
      e.vendor = {
        id: v.id,
        name: v.name,
        slug: v.slug,
        verificationStatus: v.verificationStatus,
        avatarUrl: v.avatarUrl,
      };
    }
  }
}

// ---------- attractions ----------

export async function adminListAttractions(): Promise<Attraction[]> {
  if (DEMO_MODE) return catalogueStore().attractions;
  const db = await createClient();
  const { data, error } = await db
    .from("attractions")
    .select(ATTRACTION_SELECT)
    .order("name")
    .limit(1000);
  if (error) throw new Error(`admin attractions: ${error.message}`);
  return hydrateAttractions(data as unknown as AttractionRow[], db);
}

export async function adminGetAttraction(id: string): Promise<Attraction | null> {
  if (DEMO_MODE)
    return catalogueStore().attractions.find((a) => a.id === id) ?? null;
  if (!isUuid(id)) return null;
  const db = await createClient();
  const { data, error } = await db
    .from("attractions")
    .select(ATTRACTION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`admin attraction: ${error.message}`);
  if (!data) return null;
  return (await hydrateAttractions([data as unknown as AttractionRow], db))[0];
}

export async function adminSaveAttraction(
  input: AttractionForm,
): Promise<Attraction> {
  if (!DEMO_MODE) {
    if (!isUuid(input.locationId)) throw notUuid("location");
    if (input.id && !isUuid(input.id)) throw notUuid("attraction");
    const { data: id, error } = await (await createClient()).rpc(
      "admin_save_attraction",
      { p: attractionFormToRpc(input) },
    );
    if (error) fail(error, "save");
    const saved = await adminGetAttraction(id);
    if (!saved) throw new Error("admin save: saved but could not be read back");
    return saved;
  }

  const store = catalogueStore();
  const existing = input.id
    ? store.attractions.find((a) => a.id === input.id)
    : undefined;
  const location = demoLocations.find((l) => l.id === input.locationId) ?? null;

  const record: Attraction = {
    id: existing?.id ?? `att-${uid()}`,
    slug: existing?.slug ?? slugify(input.name),
    name: input.name,
    summary: input.summary || null,
    description: input.description || null,
    location,
    address: input.address || null,
    lat: existing?.lat ?? null,
    lng: existing?.lng ?? null,
    avgVisitMinutes: input.avgVisitMinutes,
    priceMin: input.isFree ? 0 : input.priceMin,
    priceMax: input.isFree ? 0 : input.priceMax,
    isFree: input.isFree,
    bookingRequired: existing?.bookingRequired ?? false,
    openingHours: existing?.openingHours ?? {},
    tips: input.tips || null,
    categories: input.categories,
    images: parseList(input.images).map((url) => ({
      url,
      alt: input.name || null,
    })),
    isSample: existing?.isSample ?? false,
    isPublished: input.isPublished,
  };

  if (existing) {
    const i = store.attractions.findIndex((a) => a.id === existing.id);
    store.attractions[i] = record;
  } else {
    store.attractions.unshift(record);
  }
  return record;
}

export async function adminDeleteAttraction(id: string): Promise<void> {
  if (DEMO_MODE) {
    const store = catalogueStore();
    store.attractions = store.attractions.filter((a) => a.id !== id);
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient())
    .from("attractions")
    .delete()
    .eq("id", id);
  if (error) fail(error, "delete");
}

export async function adminSetAttractionPublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  if (DEMO_MODE) {
    const a = catalogueStore().attractions.find((x) => x.id === id);
    if (a) a.isPublished = isPublished;
    return;
  }
  if (!isUuid(id)) return;
  const { error } = await (await createClient())
    .from("attractions")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) fail(error, "update");
}

// ---------- bookings ----------

export async function adminListBookings(): Promise<Booking[]> {
  if (DEMO_MODE)
    return [...allDemoBookings()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  const db = await createClient();
  const rows = await fetchAll((from, to) =>
    db
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map(bookingFromRow);
}

export async function adminGetBooking(id: string): Promise<Booking | null> {
  if (DEMO_MODE) return allDemoBookings().find((b) => b.id === id) ?? null;
  if (!isUuid(id)) return null;
  const { data, error } = await (await createClient())
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`admin booking: ${error.message}`);
  return data ? bookingFromRow(data) : null;
}

/**
 * Admins can make any status transition (no tourist-side guard). In real mode this
 * is the admin's own session: the database allows admins to change `status` (and the
 * cancellation reason) but never the money, and logs the admin in the booking history.
 */
export async function adminSetBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  if (DEMO_MODE) {
    for (const store of demoStores()) {
      const b = store.bookings.find((x) => x.id === id);
      if (b) {
        b.status = status;
        return;
      }
    }
    return;
  }
  if (!isUuid(id)) return;
  const { data, error } = await (await createClient())
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) fail(error, "update");
  if (!data?.length) throw new AdminError("Booking not found.");
}

// ---------- users ----------

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: "tourist" | "admin";
  note: string;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  if (DEMO_MODE) {
    const bookingsByUser = new Map<string, number>();
    for (const store of demoStores())
      for (const b of store.bookings)
        bookingsByUser.set(b.userId, (bookingsByUser.get(b.userId) ?? 0) + 1);

    return [
      {
        id: "demo-guest",
        name: "Guest session",
        email: null,
        role: "tourist",
        note: `anonymous · ${bookingsByUser.get("demo-guest") ?? 0} bookings`,
      },
      {
        id: "demo-tourist",
        name: "Demo Traveller",
        email: "demo@sarawaktrips.test",
        role: "tourist",
        note: `${bookingsByUser.get("demo-tourist") ?? 0} bookings`,
      },
      {
        id: "demo-admin",
        name: "Demo Admin",
        email: "admin@sarawaktrips.test",
        role: "admin",
        note: "catalogue + bookings management",
      },
    ];
  }

  // Emails live in the auth system, which only the service role can read.
  // (The caller has already passed requireAdmin().)
  const svc = createAdminClient();
  const authUsers: { id: string; email: string | null; isAnonymous: boolean; createdAt: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`admin users: ${error.message}`);
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: u.email || null, // anonymous users come back as "" not null
        isAnonymous: u.is_anonymous ?? false,
        createdAt: u.created_at,
      });
    }
    if (data.users.length < 1000) break;
  }

  const [profiles, bookings] = await Promise.all([
    fetchAll((from, to) =>
      svc.from("profiles").select("id, full_name, role").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      svc.from("bookings").select("id, user_id").order("id").range(from, to),
    ),
  ]);
  const profile = new Map(profiles.map((p) => [p.id, p]));
  const bookingCount = new Map<string, number>();
  for (const b of bookings) {
    bookingCount.set(b.user_id, (bookingCount.get(b.user_id) ?? 0) + 1);
  }

  return authUsers
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => {
      const p = profile.get(u.id);
      const n = bookingCount.get(u.id) ?? 0;
      const role = p?.role ?? "tourist";
      const count = `${n} booking${n === 1 ? "" : "s"}`;
      return {
        id: u.id,
        name: p?.full_name || (u.isAnonymous ? "Guest session" : (u.email ?? "Traveller")),
        email: u.email,
        role,
        note: role === "admin" ? `administrator · ${count}` : u.isAnonymous ? `anonymous · ${count}` : count,
      };
    });
}

// ---------- analytics ----------

const STATUS_ORDER: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Monday 00:00 of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

export interface AdminAnalytics {
  catalogue: {
    experiences: number;
    publishedExperiences: number;
    vendors: number;
    unverifiedVendors: number;
    attractions: number;
  };
  kpis: {
    revenue: number;
    revenue4w: number;
    revenuePrev4w: number;
    bookings: number;
    bookings4w: number;
    bookingsPrev4w: number;
    confirmedRate: number;
    avgBookingValue: number;
  };
  weekly: {
    weekStart: string;
    label: string;
    bookings: number;
    revenue: number;
  }[];
  byStatus: { status: BookingStatus; label: string; count: number }[];
  topExperiences: { title: string; bookings: number; revenue: number }[];
}

const WEEKS = 10;

export interface AnalyticsInput {
  bookings: {
    id: string;
    experienceId: string;
    experienceTitle: string;
    status: BookingStatus;
    createdAt: string;
  }[];
  paidPayments: { bookingId: string; amount: number; paidAt: string | null }[];
  catalogue: AdminAnalytics["catalogue"];
  now?: Date;
}

/**
 * The dashboard maths, pure: the same function feeds demo data and real rows, so
 * the two modes can't drift. (Weeks start Monday in the server's local time.)
 */
export function computeAnalytics(input: AnalyticsInput): AdminAnalytics {
  const { bookings, paidPayments, catalogue } = input;
  const now = input.now ?? new Date();
  const currentWeek = startOfWeek(now);

  // --- weekly buckets (last WEEKS weeks, oldest first) ---
  const weekly = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (WEEKS - 1 - i) * 7);
    return {
      weekStart: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
      }),
      bookings: 0,
      revenue: 0,
      _start: start.getTime(),
      _end: start.getTime() + 7 * 86_400_000,
    };
  });
  const bucketFor = (iso: string | null) => {
    if (!iso) return undefined;
    const t = new Date(iso).getTime();
    return weekly.find((w) => t >= w._start && t < w._end);
  };
  for (const b of bookings) {
    const w = bucketFor(b.createdAt);
    if (w) w.bookings += 1;
  }
  for (const p of paidPayments) {
    const w = bucketFor(p.paidAt);
    if (w) w.revenue += p.amount;
  }

  // --- KPIs ---
  const fourWeeksAgo = currentWeek.getTime() - 4 * 7 * 86_400_000;
  const eightWeeksAgo = currentWeek.getTime() - 8 * 7 * 86_400_000;
  const inRange = (iso: string | null, from: number, to: number) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= from && t < to;
  };
  const nowMs = now.getTime();

  const revenue = paidPayments.reduce((s, p) => s + p.amount, 0);
  const revenue4w = paidPayments
    .filter((p) => inRange(p.paidAt, fourWeeksAgo, nowMs))
    .reduce((s, p) => s + p.amount, 0);
  const revenuePrev4w = paidPayments
    .filter((p) => inRange(p.paidAt, eightWeeksAgo, fourWeeksAgo))
    .reduce((s, p) => s + p.amount, 0);

  const bookings4w = bookings.filter((b) =>
    inRange(b.createdAt, fourWeeksAgo, nowMs),
  ).length;
  const bookingsPrev4w = bookings.filter((b) =>
    inRange(b.createdAt, eightWeeksAgo, fourWeeksAgo),
  ).length;

  const settled = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  ).length;
  const confirmedRate = bookings.length ? settled / bookings.length : 0;
  const avgBookingValue = paidPayments.length
    ? revenue / paidPayments.length
    : 0;

  // --- by status ---
  const statusCount = new Map<BookingStatus, number>();
  for (const b of bookings)
    statusCount.set(b.status, (statusCount.get(b.status) ?? 0) + 1);
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: statusCount.get(s) ?? 0,
  }));

  // --- top experiences by paid revenue ---
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const perExp = new Map<string, { title: string; bookings: number; revenue: number }>();
  for (const b of bookings) {
    const e = perExp.get(b.experienceId) ?? {
      title: b.experienceTitle,
      bookings: 0,
      revenue: 0,
    };
    e.bookings += 1;
    perExp.set(b.experienceId, e);
  }
  for (const p of paidPayments) {
    const b = bookingById.get(p.bookingId);
    if (!b) continue;
    const e = perExp.get(b.experienceId);
    if (e) e.revenue += p.amount;
  }
  const topExperiences = [...perExp.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return {
    catalogue,
    kpis: {
      revenue,
      revenue4w,
      revenuePrev4w,
      bookings: bookings.length,
      bookings4w,
      bookingsPrev4w,
      confirmedRate,
      avgBookingValue,
    },
    weekly: weekly.map((w) => ({
      weekStart: w.weekStart,
      label: w.label,
      bookings: w.bookings,
      revenue: w.revenue,
    })),
    byStatus,
    topExperiences,
  };
}

export async function adminAnalytics(): Promise<AdminAnalytics> {
  if (DEMO_MODE) {
    const cs = catalogueStore();
    return computeAnalytics({
      bookings: allDemoBookings(),
      paidPayments: allDemoPayments().filter((p) => p.status === "paid"),
      catalogue: {
        experiences: cs.experiences.length,
        publishedExperiences: cs.experiences.filter((e) => e.isPublished).length,
        vendors: cs.vendors.length,
        unverifiedVendors: cs.vendors.filter(
          (v) => v.verificationStatus !== "verified",
        ).length,
        attractions: cs.attractions.length,
      },
    });
  }

  const db = await createClient();
  const count = async (
    q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
  ) => {
    const { count: n, error } = await q;
    if (error) throw new Error(`admin analytics: ${error.message}`);
    return n ?? 0;
  };
  const head = { count: "exact", head: true } as const;

  const [bookings, payments, experiences, published, vendors, unverified, attractions] =
    await Promise.all([
      fetchAll((from, to) =>
        db
          .from("bookings")
          .select("id, experience_id, experience_title, status, created_at")
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        db
          .from("payments")
          .select("id, booking_id, amount, paid_at")
          .eq("status", "paid")
          .order("id")
          .range(from, to),
      ),
      count(db.from("experiences").select("id", head)),
      count(db.from("experiences").select("id", head).eq("is_published", true)),
      count(db.from("vendors").select("id", head)),
      count(db.from("vendors").select("id", head).neq("verification_status", "verified")),
      count(db.from("attractions").select("id", head)),
    ]);

  return computeAnalytics({
    bookings: bookings.map((b) => ({
      id: b.id,
      experienceId: b.experience_id,
      experienceTitle: b.experience_title,
      status: b.status,
      createdAt: b.created_at,
    })),
    paidPayments: payments.map((p) => ({
      bookingId: p.booking_id,
      amount: Number(p.amount),
      paidAt: p.paid_at,
    })),
    catalogue: {
      experiences,
      publishedExperiences: published,
      vendors,
      unverifiedVendors: unverified,
      attractions,
    },
  });
}
