import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { catalogueStore } from "@/lib/demo/catalogue-store";
import { createPublicClient } from "@/lib/supabase/public";
import { eateryFromRow } from "@/lib/domain/mappers/eateries";
import { CITIES, dishLabel, type City, type Eatery } from "@/types/eatery";

/**
 * The local food guide — published eateries only (RLS is the rule in real mode; demo mode serves
 * the mutable catalogue store that admin edits land in).
 */

export interface EateryFilter {
  city?: City;
  dish?: string;
  search?: string;
}

/** Guide order: by city (Kuching first), then everyday places cheapest first, splurges last. Pure, tested. */
export function sortEateries(list: Eatery[]): Eatery[] {
  return [...list].sort(
    (a, b) =>
      CITIES.indexOf(a.city) - CITIES.indexOf(b.city) ||
      Number(a.isSplurge) - Number(b.isSplurge) ||
      (a.priceTier ?? 9) - (b.priceTier ?? 9) ||
      a.sortOrder - b.sortOrder,
  );
}

export function filterEateries(list: Eatery[], f: EateryFilter = {}): Eatery[] {
  const q = f.search?.trim().toLowerCase();
  return list.filter(
    (e) =>
      e.isPublished &&
      (!f.city || e.city === f.city) &&
      (!f.dish || e.dishes.includes(f.dish)) &&
      (!q ||
        [e.name, e.city, e.notes ?? "", ...e.dishes.map(dishLabel)].some((t) => t.toLowerCase().includes(q))),
  );
}

export async function listEateries(f: EateryFilter = {}): Promise<Eatery[]> {
  if (DEMO_MODE) return sortEateries(filterEateries(catalogueStore().eateries, f));

  const { data, error } = await createPublicClient()
    .from("eateries")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .limit(1000);
  if (error) throw new Error(`eateries: ${error.message}`);
  return sortEateries(filterEateries((data ?? []).map(eateryFromRow), f));
}
