/**
 * Domain types for the catalogue + trips. UI and data modules speak these.
 * Both the demo fixtures and the Supabase mappers produce these shapes,
 * so screens don't care which backend is live.
 */

export type CategorySlug =
  | "nature"
  | "wildlife"
  | "culture"
  | "heritage"
  | "food"
  | "adventure"
  | "shopping";

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
  isSample: boolean;
  isPublished: boolean;
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
