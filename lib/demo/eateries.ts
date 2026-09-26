import guide from "@/data/eateries.json";
import { isCity, type Eatery, type PriceTier } from "@/types/eatery";

/**
 * The local food guide as demo fixtures. The same file (data/eateries.json) generates the SQL seed
 * (`npm run seed:guide`), so demo mode and the real database show the same eateries.
 */
export const demoEateries: Eatery[] = guide.eateries.map((e, i) => {
  if (!isCity(e.city)) throw new Error(`data/eateries.json: unknown city ${e.city}`);
  return {
    id: `eat-${e.slug}`,
    slug: e.slug,
    name: e.name,
    city: e.city,
    dishes: e.dishes,
    priceTier: ("tier" in e && e.tier ? (e.tier as PriceTier) : null),
    isSplurge: "splurge" in e ? Boolean(e.splurge) : false,
    mapsUrl: e.maps ?? null,
    notes: "notes" in e && e.notes ? String(e.notes) : null,
    sortOrder: i,
    isPublished: true,
  };
});
