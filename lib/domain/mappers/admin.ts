import type { Json, Tables } from "@/types/database";
import type { Vendor } from "@/types/catalogue";
import type {
  AttractionForm,
  ExperienceForm,
  VendorForm,
} from "@/lib/validation/admin";
import { slugify } from "@/lib/validation/admin";
import { availabilityToJson } from "@/lib/domain/mappers/catalogue";

/**
 * Pure admin-form <-> database mappers. The payloads here are exactly what the
 * `admin_save_*` SQL functions read, so the contract is unit-tested.
 */

export const DEFAULT_LANGUAGES = ["English"];
export const DEFAULT_CANCELLATION = "Free cancellation up to 24 hours before start.";

/** Split an admin textarea/input on commas or newlines into a clean list. */
export function parseList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** A slug base that is never empty (a title in another script slugifies to ""). */
const slugBase = (s: string, fallback: string) => slugify(s) || fallback;

export function experienceFormToRpc(input: ExperienceForm): Json {
  const languages = parseList(input.languages);
  return {
    id: input.id || null,
    slugBase: slugBase(input.title, "experience"),
    title: input.title,
    summary: input.summary,
    description: input.description,
    vendorId: input.vendorId,
    locationId: input.locationId,
    durationMinutes: input.durationMinutes,
    pricePerPerson: input.pricePerPerson,
    minPax: input.minPax,
    maxPax: input.maxPax,
    languages: languages.length ? languages : DEFAULT_LANGUAGES,
    includes: parseList(input.includes),
    meetingPoint: input.meetingPoint,
    cancellationPolicy: input.cancellationPolicy || DEFAULT_CANCELLATION,
    availability: availabilityToJson({
      days: input.availabilityDays,
      times: parseList(input.availabilityTimes),
      capacityPerSlot: input.capacityPerSlot,
    }),
    bookingLeadtimeHours: input.bookingLeadtimeHours,
    categories: input.categories,
    images: parseList(input.images),
    isPublished: input.isPublished,
  };
}

export function attractionFormToRpc(input: AttractionForm): Json {
  return {
    id: input.id || null,
    slugBase: slugBase(input.name, "attraction"),
    name: input.name,
    summary: input.summary,
    description: input.description,
    locationId: input.locationId,
    address: input.address,
    avgVisitMinutes: input.avgVisitMinutes,
    // a free attraction has no price, whatever the price fields still say
    priceMin: input.isFree ? 0 : input.priceMin,
    priceMax: input.isFree ? 0 : input.priceMax,
    isFree: input.isFree,
    tips: input.tips,
    categories: input.categories,
    images: parseList(input.images),
    isPublished: input.isPublished,
  };
}

export function vendorFormToRpc(input: VendorForm): Json {
  return {
    id: input.id || null,
    slugBase: slugBase(input.name, "vendor"),
    name: input.name,
    description: input.description,
    locationName: input.locationName,
    contactEmail: input.contactEmail ?? "",
    contactPhone: input.contactPhone,
    avatarUrl: input.avatarUrl ?? "",
    verificationStatus: input.verificationStatus,
    isPublished: input.isPublished,
  };
}

export type AdminVendorRow = Tables<"vendors"> & {
  location: { name: string } | null;
};

export function adminVendorFromRow(r: AdminVendorRow): Vendor {
  const c =
    r.contact && typeof r.contact === "object" && !Array.isArray(r.contact)
      ? r.contact
      : {};
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    locationName: r.location?.name ?? null,
    contactEmail: typeof c.email === "string" ? c.email : null,
    contactPhone: typeof c.phone === "string" ? c.phone : null,
    verificationStatus: r.verification_status,
    avatarUrl: r.avatar_url,
    isSample: r.is_sample,
    isPublished: r.is_published,
  };
}
