import "server-only";
import { cache } from "react";
import { DEMO_MODE } from "@/lib/demo/mode";
import { catalogueStore } from "@/lib/demo/catalogue-store";
import { createPublicClient } from "@/lib/supabase/public";
import { demoLocations } from "@/lib/demo/fixtures";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  attractionFromRow,
  experienceFromRow,
  groupImages,
  isUuid,
  type AttractionRow,
  type ExperienceRow,
} from "@/lib/domain/mappers/catalogue";
import type {
  Attraction,
  CategorySlug,
  Experience,
  ImageRef,
  LocationRef,
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

// ---------- Supabase branch ----------
// Reads go through the anon client, so RLS is the visibility rule: only published
// rows come back (and, via `vendors!inner`, only experiences whose vendor is
// published too). The catalogue is small, so filtering/sorting reuses the same
// in-memory `matches` / `sort*` as demo mode — one behaviour, two backends. Move
// filtering into SQL if it ever outgrows PostgREST's 1000-row page.

export const EXPERIENCE_SELECT =
  "*, vendor:vendors!inner(id, name, slug, verification_status, avatar_url), location:locations(id, name, area), experience_categories(categories(slug))";
export const ATTRACTION_SELECT =
  "*, location:locations(id, name, area), attraction_categories(categories(slug))";

/** Photos for a set of owners. Pass the admin's own client to see unpublished owners' photos. */
export async function loadImages(
  db: SupabaseClient<Database>,
  owner: "experience" | "attraction",
  ids: string[],
): Promise<Map<string, ImageRef[]>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("images")
    .select("owner_id, url, alt, is_primary, sort_order")
    .eq("owner_type", owner)
    .in("owner_id", ids);
  if (error) throw new Error(`catalogue images: ${error.message}`);
  return groupImages(data);
}

export async function hydrateExperiences(
  rows: ExperienceRow[],
  db: SupabaseClient<Database> = createPublicClient(),
): Promise<Experience[]> {
  const images = await loadImages(db, "experience", rows.map((r) => r.id));
  return rows.map((r) => experienceFromRow(r, images.get(r.id)));
}

export async function hydrateAttractions(
  rows: AttractionRow[],
  db: SupabaseClient<Database> = createPublicClient(),
): Promise<Attraction[]> {
  const images = await loadImages(db, "attraction", rows.map((r) => r.id));
  return rows.map((r) => attractionFromRow(r, images.get(r.id)));
}

// `cache` dedupes within one request (home, rating summary and the AI all ask for the list).
const dbPublishedExperiences = cache(async (): Promise<Experience[]> => {
  const { data, error } = await createPublicClient()
    .from("experiences")
    .select(EXPERIENCE_SELECT)
    .eq("is_published", true)
    .order("title")
    .limit(1000);
  if (error) throw new Error(`catalogue experiences: ${error.message}`);
  return hydrateExperiences(data as unknown as ExperienceRow[]);
});

const dbPublishedAttractions = cache(async (): Promise<Attraction[]> => {
  const { data, error } = await createPublicClient()
    .from("attractions")
    .select(ATTRACTION_SELECT)
    .eq("is_published", true)
    .order("name")
    .limit(1000);
  if (error) throw new Error(`catalogue attractions: ${error.message}`);
  return hydrateAttractions(data as unknown as AttractionRow[]);
});

const dbExperienceBy = cache(
  async (column: "slug" | "id", value: string): Promise<Experience | null> => {
    const { data, error } = await createPublicClient()
      .from("experiences")
      .select(EXPERIENCE_SELECT)
      .eq("is_published", true)
      .eq(column, value)
      .maybeSingle();
    if (error) throw new Error(`catalogue experience: ${error.message}`);
    if (!data) return null;
    return (await hydrateExperiences([data as unknown as ExperienceRow]))[0];
  },
);

const dbAttractionBySlug = cache(
  async (slug: string): Promise<Attraction | null> => {
    const { data, error } = await createPublicClient()
      .from("attractions")
      .select(ATTRACTION_SELECT)
      .eq("is_published", true)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`catalogue attraction: ${error.message}`);
    if (!data) return null;
    return (await hydrateAttractions([data as unknown as AttractionRow]))[0];
  },
);

export async function listExperiences(opts?: ListOpts): Promise<Experience[]> {
  if (DEMO_MODE) {
    return sortExperiences(
      catalogueStore().experiences.filter((e) => e.isPublished && matches(e, opts)),
      opts?.sort,
    );
  }
  return sortExperiences(
    (await dbPublishedExperiences()).filter((e) => matches(e, opts)),
    opts?.sort,
  );
}

export async function getExperience(slug: string): Promise<Experience | null> {
  if (DEMO_MODE) {
    return (
      catalogueStore().experiences.find(
        (e) => e.slug === slug && e.isPublished,
      ) ?? null
    );
  }
  return dbExperienceBy("slug", slug);
}

/**
 * Real mode only returns PUBLISHED experiences (anon RLS), so a booking can't
 * be started against something an admin has since unpublished. Demo mode keeps
 * returning any id, as before.
 */
export async function getExperienceById(
  id: string,
): Promise<Experience | null> {
  if (DEMO_MODE) {
    return catalogueStore().experiences.find((e) => e.id === id) ?? null;
  }
  if (!isUuid(id)) return null; // ids come from URLs — never let junk reach Postgres
  return dbExperienceBy("id", id);
}

export async function listAttractions(opts?: ListOpts): Promise<Attraction[]> {
  if (DEMO_MODE) {
    return sortAttractions(
      catalogueStore().attractions.filter((a) => a.isPublished && matches(a, opts)),
      opts?.sort,
    );
  }
  return sortAttractions(
    (await dbPublishedAttractions()).filter((a) => matches(a, opts)),
    opts?.sort,
  );
}

export async function getAttraction(slug: string): Promise<Attraction | null> {
  if (DEMO_MODE) {
    return (
      catalogueStore().attractions.find(
        (a) => a.slug === slug && a.isPublished,
      ) ?? null
    );
  }
  return dbAttractionBySlug(slug);
}

/** Places an experience / attraction / vendor can be located at (public reference data). */
export async function listLocations(): Promise<LocationRef[]> {
  if (DEMO_MODE) return demoLocations;
  const { data, error } = await createPublicClient()
    .from("locations")
    .select("id, name, area")
    .order("name");
  if (error) throw new Error(`locations: ${error.message}`);
  return data;
}
