export const CITIES = ["Kuching", "Sibu", "Miri", "Bintulu"] as const;
export type City = (typeof CITIES)[number];

/** 1 = "$", 2 = "$$", 3 = "$$$" — the guide's rough tiers, not ringgit amounts. */
export type PriceTier = 1 | 2 | 3;

export interface Eatery {
  id: string;
  slug: string;
  name: string;
  city: City;
  /** dish slugs, see DISH_LABELS */
  dishes: string[];
  priceTier: PriceTier | null;
  /** a special-occasion pick */
  isSplurge: boolean;
  mapsUrl: string | null;
  notes: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export const DISH_LABELS: Record<string, string> = {
  laksa: "Sarawak laksa",
  "kolo-mee": "Kolo mee",
  kampua: "Kampua",
  umai: "Umai",
  "manok-pansoh": "Manok pansoh",
  midin: "Midin",
  kompia: "Kompia",
  "kek-lapis": "Kek lapis",
  "fine-dining": "Fine dining",
};

export const DISH_SLUGS = Object.keys(DISH_LABELS);

export function dishLabel(slug: string): string {
  return DISH_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export const PRICE_TIER_LABEL: Record<PriceTier, string> = { 1: "$", 2: "$$", 3: "$$$" };
export const PRICE_TIER_HINT: Record<PriceTier, string> = {
  1: "budget",
  2: "mid-range",
  3: "higher-end",
};

/**
 * ROUGH per-person cost used only to size a meal in a trip estimate (RM). These are planning
 * estimates, shown as "about" — the guide gives tiers, not prices.
 */
export const TIER_ESTIMATE_PER_PERSON: Record<PriceTier, number> = { 1: 12, 2: 30, 3: 65 };
/** A splurge with no stated tier. */
export const SPLURGE_ESTIMATE_PER_PERSON = 90;

export function isCity(v: string): v is City {
  return (CITIES as readonly string[]).includes(v);
}
