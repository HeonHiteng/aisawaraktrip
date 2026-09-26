import type { Tables, TablesInsert } from "@/types/database";
import { isCity, type Eatery, type PriceTier } from "@/types/eatery";
import type { EateryForm } from "@/lib/validation/admin";

/** Pure eatery <-> database mappers (unit-tested). */

export function eateryFromRow(r: Tables<"eateries">): Eatery {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    // the column is CHECK-constrained; fall back rather than crash on a hand-edited row
    city: isCity(r.city) ? r.city : "Kuching",
    dishes: r.dishes ?? [],
    priceTier: r.price_tier === 1 || r.price_tier === 2 || r.price_tier === 3 ? (r.price_tier as PriceTier) : null,
    isSplurge: r.is_splurge,
    mapsUrl: r.maps_url,
    notes: r.notes,
    sortOrder: r.sort_order,
    isPublished: r.is_published,
  };
}

/** Admin form -> the columns to write. The slug is decided by the caller. */
export function eateryFormToRow(input: EateryForm): Omit<TablesInsert<"eateries">, "slug"> {
  return {
    name: input.name,
    city: input.city,
    dishes: input.dishes,
    price_tier: input.priceTier ?? null,
    is_splurge: input.isSplurge,
    maps_url: input.mapsUrl || null,
    notes: input.notes || null,
    is_published: input.isPublished,
  };
}
