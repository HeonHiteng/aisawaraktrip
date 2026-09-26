/**
 * Domain types for the catalogue + trips. UI and data modules speak these.
 * Both the demo fixtures and the Supabase mappers produce these shapes,
 * so screens don't care which backend is live.
 */

export const CATEGORY_SLUGS = [
  "nature",
  "wildlife",
  "culture",
  "heritage",
  "food",
  "adventure",
  "shopping",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function isCategorySlug(s: unknown): s is CategorySlug {
  return typeof s === "string" && (CATEGORY_SLUGS as readonly string[]).includes(s);
}

export interface Category {
  slug: CategorySlug;
  name: string;
  icon: string;
}

export interface ImageRef {
  url: string;
  alt: string | null;
}

export interface LocationRef {
  id: string;
  name: string;
  area: string | null;
}

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export interface VendorRef {
  id: string;
  name: string;
  slug: string;
  verificationStatus: VerificationStatus;
  avatarUrl: string | null;
}

export interface Vendor extends VendorRef {
  description: string | null;
  locationName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isSample: boolean;
  isPublished: boolean;
}

export interface Attraction {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  location: LocationRef | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  avgVisitMinutes: number;
  priceMin: number;
  priceMax: number;
  isFree: boolean;
  bookingRequired: boolean;
  openingHours: Record<string, string>;
  tips: string | null;
  categories: CategorySlug[];
  images: ImageRef[];
  /** 1-5 = "must-see", 6+ = "also great", null = unranked. */
  featuredRank: number | null;
  isSample: boolean;
  isPublished: boolean;
}

/** The must-see list is the top five; the rest of the ranked places are "also great". */
export const MUST_SEE_MAX_RANK = 5;

export function isMustSee(rank: number | null | undefined): boolean {
  return rank != null && rank <= MUST_SEE_MAX_RANK;
}

export interface ExperienceAvailability {
  days: string[];
  times: string[];
  capacityPerSlot: number;
}

export interface Experience {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  vendor: VendorRef;
  location: LocationRef | null;
  durationMinutes: number;
  pricePerPerson: number;
  currency: string;
  minPax: number;
  maxPax: number;
  languages: string[];
  includes: string[];
  meetingPoint: string | null;
  cancellationPolicy: string | null;
  availability: ExperienceAvailability;
  bookingLeadtimeHours: number;
  categories: CategorySlug[];
  images: ImageRef[];
  rating: number | null;
  reviewCount: number;
  isSample: boolean;
  isPublished: boolean;
}

export type CatalogueKind = "experience" | "attraction";
