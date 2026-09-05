import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { catalogueStore } from "@/lib/demo/catalogue-store";
import type {
  Attraction,
  CategorySlug,
  Experience,
} from "@/types/catalogue";

/**
 * Public catalogue reads — only `isPublished` rows. Demo mode serves the
 * in-memory catalogue store (which admin edits mutate); otherwise Supabase.
 * Admin-side reads (all rows) live in `lib/domain/admin`.
 */

export type SortOption = "recommended" | "price-asc" | "price-desc" | "rating-desc";

interface ListOpts {
  categories?: CategorySlug[];
  search?: string;
  sort?: SortOption;
}

function matches(
  item: {
    title?: string;
    name?: string;
    summary: string | null;
    categories: CategorySlug[];
  },
  opts?: ListOpts,
) {
  if (opts?.categories?.length) {
    if (!opts.categories.some((c) => item.categories.includes(c))) return false;
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    const hay = `${item.title ?? item.name ?? ""} ${item.summary ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortExperiences(list: Experience[], sort?: SortOption): Experience[] {
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
    case "price-desc":
      return sorted.sort((a, b) => b.pricePerPerson - a.pricePerPerson);
    case "recommended":
    case "rating-desc":
    default:
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
}

function sortAttractions(list: Attraction[], sort?: SortOption): Attraction[] {
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.priceMin - b.priceMin);
    case "price-desc":
      return sorted.sort((a, b) => b.priceMin - a.priceMin);
    default:
      return sorted; // no rating field on attractions — keep catalogue order
  }
}

export async function listExperiences(opts?: ListOpts): Promise<Experience[]> {
  if (DEMO_MODE) {
    return sortExperiences(
      catalogueStore().experiences.filter((e) => e.isPublished && matches(e, opts)),
      opts?.sort,
    );
  }
  // TODO(phase-3): supabase.from("experiences").select(...).eq("is_published", true)
  return [];
}

export async function getExperience(slug: string): Promise<Experience | null> {
  if (DEMO_MODE) {
    return (
      catalogueStore().experiences.find(
        (e) => e.slug === slug && e.isPublished,
      ) ?? null
    );
  }
  return null;
}

export async function getExperienceById(
  id: string,
): Promise<Experience | null> {
  if (DEMO_MODE) {
    return catalogueStore().experiences.find((e) => e.id === id) ?? null;
  }
  return null;
}

export async function listAttractions(opts?: ListOpts): Promise<Attraction[]> {
  if (DEMO_MODE) {
    return sortAttractions(
      catalogueStore().attractions.filter((a) => a.isPublished && matches(a, opts)),
      opts?.sort,
    );
  }
  return [];
}

export async function getAttraction(slug: string): Promise<Attraction | null> {
  if (DEMO_MODE) {
    return (
      catalogueStore().attractions.find(
        (a) => a.slug === slug && a.isPublished,
      ) ?? null
    );
  }
  return null;
}
