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

export async function adminStats() {
  if (DEMO_MODE) {
    const cs = catalogueStore();
    const bookings = allDemoBookings();
    const paidRevenue = allDemoPayments()
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);

    const byStatus: Record<string, number> = {};
    for (const b of bookings) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

    return {
      experiences: cs.experiences.length,
      publishedExperiences: cs.experiences.filter((e) => e.isPublished).length,
      vendors: cs.vendors.length,
      unverifiedVendors: cs.vendors.filter(
        (v) => v.verificationStatus !== "verified",
      ).length,
      attractions: cs.attractions.length,
      bookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === "confirmed").length,
      revenue: paidRevenue,
      byStatus,
    };
  }
  return {
    experiences: 0,
    publishedExperiences: 0,
    vendors: 0,
    unverifiedVendors: 0,
    attractions: 0,
    bookings: 0,
    confirmedBookings: 0,
    revenue: 0,
    byStatus: {} as Record<string, number>,
  };
}
