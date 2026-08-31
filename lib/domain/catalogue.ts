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

interface ListOpts {
  categories?: CategorySlug[];
  search?: string;
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

export async function listExperiences(opts?: ListOpts): Promise<Experience[]> {
  if (DEMO_MODE) {
    return catalogueStore()
      .experiences.filter((e) => e.isPublished && matches(e, opts));
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
    return catalogueStore()
      .attractions.filter((a) => a.isPublished && matches(a, opts));
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
