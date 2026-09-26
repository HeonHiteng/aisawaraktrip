import type { Json, Tables } from "@/types/database";
import {
  isCategorySlug,
  type Attraction,
  type CategorySlug,
  type Experience,
  type ExperienceAvailability,
  type ImageRef,
  type LocationRef,
  type VendorRef,
} from "@/types/catalogue";

/**
 * Pure row → domain mappers for the Supabase branch of `lib/domain/catalogue`.
 * The demo fixtures already speak the domain shapes; these make the database
 * rows speak them too, so screens can't tell which backend is live.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from URLs; a non-uuid must be "not found", not a Postgres 22P02. */
export const isUuid = (s: string) => UUID_RE.test(s);

function asObject(j: Json | undefined): Record<string, Json | undefined> {
  return j && typeof j === "object" && !Array.isArray(j) ? j : {};
}

function stringList(j: Json | undefined): string[] {
  return Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : [];
}

export function availabilityFromJson(j: Json): ExperienceAvailability {
  const o = asObject(j);
  const cap = o.capacity_per_slot;
  return {
    days: stringList(o.days),
    times: stringList(o.times),
    capacityPerSlot: typeof cap === "number" && cap > 0 ? cap : 0,
  };
}

/** Inverse of `availabilityFromJson` — what the admin forms write back. */
export function availabilityToJson(a: ExperienceAvailability): Json {
  return { days: a.days, times: a.times, capacity_per_slot: a.capacityPerSlot };
}

export function openingHoursFromJson(j: Json): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(asObject(j))) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

type LocationRow = Pick<Tables<"locations">, "id" | "name" | "area"> | null;
type VendorRow = Pick<
  Tables<"vendors">,
  "id" | "name" | "slug" | "verification_status" | "avatar_url"
>;
type CategoryLink = { categories: { slug: string } | null };

export type ExperienceRow = Tables<"experiences"> & {
  vendor: VendorRow;
  location: LocationRow;
  experience_categories: CategoryLink[];
};

export type AttractionRow = Tables<"attractions"> & {
  location: LocationRow;
  attraction_categories: CategoryLink[];
};

export const locationFromRow = (l: LocationRow): LocationRef | null =>
  l ? { id: l.id, name: l.name, area: l.area } : null;

export const vendorRefFromRow = (v: VendorRow): VendorRef => ({
  id: v.id,
  name: v.name,
  slug: v.slug,
  verificationStatus: v.verification_status,
  avatarUrl: v.avatar_url,
});

function categoriesFrom(links: CategoryLink[]): CategorySlug[] {
  const out: CategorySlug[] = [];
  for (const l of links) {
    const slug = l.categories?.slug;
    if (isCategorySlug(slug) && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/** Group image rows by owner; the primary image first, then by sort order. */
export function groupImages(
  rows: Pick<
    Tables<"images">,
    "owner_id" | "url" | "alt" | "is_primary" | "sort_order"
  >[],
): Map<string, ImageRef[]> {
  const sorted = [...rows].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const map = new Map<string, ImageRef[]>();
  for (const r of sorted) {
    const list = map.get(r.owner_id) ?? [];
    list.push({ url: r.url, alt: r.alt });
    map.set(r.owner_id, list);
  }
  return map;
}

export function experienceFromRow(
  row: ExperienceRow,
  images: ImageRef[] = [],
): Experience {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    vendor: vendorRefFromRow(row.vendor),
    location: locationFromRow(row.location),
    durationMinutes: row.duration_minutes,
    pricePerPerson: Number(row.price_per_person),
    currency: row.currency,
    minPax: row.min_pax,
    maxPax: row.max_pax,
    languages: row.languages,
    includes: row.includes,
    meetingPoint: row.meeting_point,
    cancellationPolicy: row.cancellation_policy,
    availability: availabilityFromJson(row.availability),
    bookingLeadtimeHours: row.booking_leadtime_hours,
    categories: categoriesFrom(row.experience_categories),
    images,
    rating: row.rating === null ? null : Number(row.rating),
    reviewCount: row.review_count,
    isSample: row.is_sample,
    isPublished: row.is_published,
  };
}

export function attractionFromRow(
  row: AttractionRow,
  images: ImageRef[] = [],
): Attraction {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    location: locationFromRow(row.location),
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    avgVisitMinutes: row.avg_visit_minutes,
    priceMin: Number(row.price_min),
    priceMax: Number(row.price_max),
    isFree: row.is_free,
    bookingRequired: row.booking_required,
    openingHours: openingHoursFromJson(row.opening_hours),
    tips: row.tips,
    categories: categoriesFrom(row.attraction_categories),
    images,
    featuredRank: row.featured_rank,
    isSample: row.is_sample,
    isPublished: row.is_published,
  };
}
