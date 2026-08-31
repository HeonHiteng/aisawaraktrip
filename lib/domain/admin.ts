import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { catalogueStore } from "@/lib/demo/catalogue-store";
import { allDemoBookings, allDemoPayments, demoStores } from "@/lib/demo/store";
import { demoLocations } from "@/lib/demo/fixtures";
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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- experiences ----------

export async function adminListExperiences(): Promise<Experience[]> {
  if (DEMO_MODE) return catalogueStore().experiences;
  return []; // TODO(phase-8): supabase (service role) — all rows
}

export async function adminGetExperience(id: string): Promise<Experience | null> {
  if (DEMO_MODE)
    return catalogueStore().experiences.find((e) => e.id === id) ?? null;
  return null;
}

export async function adminSaveExperience(
  input: ExperienceForm,
): Promise<Experience> {
  const store = catalogueStore();
  const existing = input.id
    ? store.experiences.find((e) => e.id === input.id)
    : undefined;
  const vendor = store.vendors.find((v) => v.id === input.vendorId);
  const location = demoLocations.find((l) => l.id === input.locationId) ?? null;
  const times = input.availabilityTimes
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

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
    languages: existing?.languages ?? ["English"],
    includes: existing?.includes ?? [],
    meetingPoint: input.meetingPoint || null,
    cancellationPolicy:
      existing?.cancellationPolicy ??
      "Free cancellation up to 24 hours before start.",
    availability: {
      days: input.availabilityDays,
      times,
      capacityPerSlot: input.capacityPerSlot,
    },
    bookingLeadtimeHours: input.bookingLeadtimeHours,
    categories: input.categories,
    images: existing?.images ?? [],
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
  }
}

export async function adminSetExperiencePublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  if (DEMO_MODE) {
    const e = catalogueStore().experiences.find((x) => x.id === id);
    if (e) e.isPublished = isPublished;
  }
}

// ---------- vendors ----------

export async function adminListVendors(): Promise<Vendor[]> {
  if (DEMO_MODE) return catalogueStore().vendors;
  return [];
}

export async function adminGetVendor(id: string): Promise<Vendor | null> {
  if (DEMO_MODE)
    return catalogueStore().vendors.find((v) => v.id === id) ?? null;
  return null;
}

export async function adminSaveVendor(input: VendorForm): Promise<Vendor> {
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
    avatarUrl: existing?.avatarUrl ?? null,
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
  }
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
  }
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
  return [];
}

export async function adminGetAttraction(id: string): Promise<Attraction | null> {
  if (DEMO_MODE)
    return catalogueStore().attractions.find((a) => a.id === id) ?? null;
  return null;
}

export async function adminSaveAttraction(
  input: AttractionForm,
): Promise<Attraction> {
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
    images: existing?.images ?? [],
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
  }
}

export async function adminSetAttractionPublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  if (DEMO_MODE) {
    const a = catalogueStore().attractions.find((x) => x.id === id);
    if (a) a.isPublished = isPublished;
  }
}

// ---------- bookings ----------

export async function adminListBookings(): Promise<Booking[]> {
  if (DEMO_MODE)
    return [...allDemoBookings()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  return [];
}

export async function adminGetBooking(id: string): Promise<Booking | null> {
  if (DEMO_MODE) return allDemoBookings().find((b) => b.id === id) ?? null;
  return null;
}

/** Admins can make any status transition (no tourist-side guard). */
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
  }
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
  return [];
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

const EMPTY_ANALYTICS: AdminAnalytics = {
  catalogue: {
    experiences: 0,
    publishedExperiences: 0,
    vendors: 0,
    unverifiedVendors: 0,
    attractions: 0,
  },
  kpis: {
    revenue: 0,
    revenue4w: 0,
    revenuePrev4w: 0,
    bookings: 0,
    bookings4w: 0,
    bookingsPrev4w: 0,
    confirmedRate: 0,
    avgBookingValue: 0,
  },
  weekly: [],
  byStatus: STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: 0,
  })),
  topExperiences: [],
};

const WEEKS = 10;

export async function adminAnalytics(): Promise<AdminAnalytics> {
  if (!DEMO_MODE) return EMPTY_ANALYTICS;

  const cs = catalogueStore();
  const bookings = allDemoBookings();
  const paidPayments = allDemoPayments().filter((p) => p.status === "paid");

  const now = new Date();
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

  const revenue = paidPayments.reduce((s, p) => s + p.amount, 0);
  const revenue4w = paidPayments
    .filter((p) => inRange(p.paidAt, fourWeeksAgo, Date.now()))
    .reduce((s, p) => s + p.amount, 0);
  const revenuePrev4w = paidPayments
    .filter((p) => inRange(p.paidAt, eightWeeksAgo, fourWeeksAgo))
    .reduce((s, p) => s + p.amount, 0);

  const bookings4w = bookings.filter((b) =>
    inRange(b.createdAt, fourWeeksAgo, Date.now()),
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
    catalogue: {
      experiences: cs.experiences.length,
      publishedExperiences: cs.experiences.filter((e) => e.isPublished).length,
      vendors: cs.vendors.length,
      unverifiedVendors: cs.vendors.filter(
        (v) => v.verificationStatus !== "verified",
      ).length,
      attractions: cs.attractions.length,
    },
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
