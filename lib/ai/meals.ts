import {
  dishLabel,
  PRICE_TIER_LABEL,
  SPLURGE_ESTIMATE_PER_PERSON,
  TIER_ESTIMATE_PER_PERSON,
  type Eatery,
} from "@/types/eatery";

/**
 * Choosing a real place for a meal from the local food guide. Pure: the itinerary builder calls
 * these and stays deterministic.
 *
 * Only Kuching places are used (the planner is Kuching-region). Kek lapis and kompia are
 * pastries/snacks, so a place listed ONLY for those isn't offered as a lunch or dinner.
 */

export type MealKind = "lunch" | "dinner";

const MEAL_DISHES = new Set(["laksa", "kolo-mee", "kampua", "umai", "manok-pansoh", "midin"]);
const QUICK_DISHES = new Set(["laksa", "kolo-mee", "kampua"]); // a good lunch
const SIT_DOWN_DISHES = new Set(["umai", "manok-pansoh", "midin"]); // a good dinner

/** Eateries that can be a meal in a Kuching trip, guide order. */
export function mealPool(eateries: Eatery[]): Eatery[] {
  return eateries
    .filter(
      (e) =>
        e.isPublished &&
        e.city === "Kuching" &&
        (e.isSplurge || e.dishes.some((d) => MEAL_DISHES.has(d))),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface PickOptions {
  /** Places already used on this trip: avoided until everything has been used once. */
  used: ReadonlySet<string>;
  /** Tight budget: nothing above "$$". */
  budgetTight: boolean;
  /** The last evening of a longer trip: a splurge, if the budget allows. */
  splurge: boolean;
}

/** The best unused place for this meal, or null when the guide has nothing suitable. */
export function pickMealEatery(pool: Eatery[], kind: MealKind, o: PickOptions): Eatery | null {
  const okBudget = (e: Eatery) => !o.budgetTight || (e.priceTier ?? 2) <= 2;
  let candidates: Eatery[];
  if (kind === "dinner" && o.splurge && !o.budgetTight) {
    candidates = pool.filter((e) => e.isSplurge);
    if (!candidates.length) candidates = pool.filter((e) => !e.isSplurge && okBudget(e));
  } else {
    candidates = pool.filter((e) => !e.isSplurge && okBudget(e));
  }
  if (!candidates.length) return null;

  const fresh = candidates.filter((e) => !o.used.has(e.id));
  const list = fresh.length ? fresh : candidates; // everything used once: allow a repeat
  const want = kind === "lunch" ? QUICK_DISHES : SIT_DOWN_DISHES;
  const score = (e: Eatery) => e.dishes.filter((d) => want.has(d)).length;
  // highest score first; ties keep guide order (the sort is stable)
  return [...list].sort((a, b) => score(b) - score(a))[0];
}

/** Rough per-person cost of a meal at this place (RM). An estimate: the guide gives tiers only. */
export function estimateMealPerPerson(e: Eatery): number {
  if (e.priceTier) return TIER_ESTIMATE_PER_PERSON[e.priceTier];
  return e.isSplurge ? SPLURGE_ESTIMATE_PER_PERSON : TIER_ESTIMATE_PER_PERSON[2];
}

/** The one-line description shown on the meal in the itinerary. */
export function describeEatery(e: Eatery): string {
  const dishes = e.dishes.filter((d) => d !== "fine-dining").map(dishLabel);
  const tier = e.priceTier ? ` (${PRICE_TIER_LABEL[e.priceTier]})` : "";
  const parts = [
    dishes.length ? `Try the ${dishes.join(", ").toLowerCase()}.` : e.isSplurge ? "A special-occasion dinner." : "",
    `About RM${estimateMealPerPerson(e)} per person${tier} — an estimate.`,
    e.notes ?? "",
  ];
  return parts.filter(Boolean).join(" ");
}
