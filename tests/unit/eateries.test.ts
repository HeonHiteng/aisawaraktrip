import { describe, expect, it } from "vitest";
import { demoEateries } from "@/lib/demo/eateries";
import { demoAttractions, demoExperiences, demoLocations } from "@/lib/demo/fixtures";
import { filterEateries, sortEateries } from "@/lib/domain/eateries";
import { eateryFormToRow, eateryFromRow } from "@/lib/domain/mappers/eateries";
import { buildItinerary } from "@/lib/ai/itinerary";
import { describeEatery, estimateMealPerPerson, mealPool, pickMealEatery } from "@/lib/ai/meals";
import { eateryFormSchema } from "@/lib/validation/admin";
import { CITIES, DISH_LABELS, type Eatery } from "@/types/eatery";
import type { Attraction, LocationRef } from "@/types/catalogue";
import type { ItineraryItem, TripInput } from "@/types/trip";

const by = (slug: string) => demoEateries.find((e) => e.slug === slug)!;

describe("the food guide data", () => {
  it("has every place from the guide, once, with clean links", () => {
    expect(demoEateries).toHaveLength(30);
    expect(new Set(demoEateries.map((e) => e.slug)).size).toBe(30);
    for (const e of demoEateries) {
      expect(CITIES).toContain(e.city);
      expect(e.mapsUrl, e.name).toMatch(/^https:\/\/maps\.app\.goo\.gl\/\w+$/); // no tracking params
      for (const d of e.dishes) expect(DISH_LABELS[d], `${e.name}: ${d}`).toBeDefined();
    }
  });

  it("keeps the guide's tiers and splurges", () => {
    expect(by("mui-xin-laksa")).toMatchObject({ city: "Kuching", priceTier: 1, isSplurge: false });
    expect(by("126-laksa").priceTier).toBe(2);
    expect(by("lepau")).toMatchObject({ priceTier: 3, dishes: ["umai", "manok-pansoh", "midin"] });
    expect(demoEateries.filter((e) => e.isSplurge).map((e) => e.slug).sort()).toEqual([
      "cavakita-rooftop-bar", "mingziang-court", "roots-restaurant", "the-italian-fairfield", "the-meld",
    ]);
    expect(by("mingziang-court").priceTier).toBeNull(); // the guide gives no tier for it
  });
});

describe("filter + sort", () => {
  it("filters by city, dish and a text search; drafts never show", () => {
    expect(filterEateries(demoEateries, { city: "Sibu" })).toHaveLength(7);
    expect(filterEateries(demoEateries, { dish: "laksa" }).map((e) => e.city).sort()).toEqual(
      ["Bintulu", "Bintulu", "Kuching", "Kuching", "Miri", "Miri", "Miri"],
    );
    expect(filterEateries(demoEateries, { search: "  LEPAU " }).map((e) => e.slug)).toEqual(["lepau"]);
    expect(filterEateries(demoEateries, { search: "kompia" }).map((e) => e.city).sort()).toEqual(["Kuching", "Sibu", "Sibu"]);
    expect(filterEateries(demoEateries, { search: "sunset" }).map((e) => e.slug)).toEqual(["cavakita-rooftop-bar"]); // matches the note
    const draft = { ...by("lepau"), isPublished: false };
    expect(filterEateries([draft], {})).toEqual([]);
  });

  it("orders by city (Kuching first), then everyday places cheapest first, splurges last", () => {
    const list = sortEateries(demoEateries);
    expect(list[0].city).toBe("Kuching");
    const kuching = list.filter((e) => e.city === "Kuching");
    expect(kuching[kuching.length - 1].slug).toBe("roots-restaurant");
    expect(kuching[0].priceTier).toBe(1);
    const cities = list.map((e) => e.city);
    expect(cities).toEqual([...cities].sort((a, b) => CITIES.indexOf(a) - CITIES.indexOf(b)));
  });
});

describe("mappers + form", () => {
  it("row -> domain, tolerating a hand-edited row", () => {
    const row = {
      id: "i", slug: "s", name: "N", city: "Nowhere", dishes: ["laksa"], price_tier: 9, is_splurge: false,
      maps_url: null, notes: null, sort_order: 3, is_published: true, created_at: "", updated_at: "",
    };
    expect(eateryFromRow(row)).toMatchObject({ city: "Kuching", priceTier: null, dishes: ["laksa"], sortOrder: 3 });
    expect(eateryFromRow({ ...row, city: "Miri", price_tier: 2 })).toMatchObject({ city: "Miri", priceTier: 2 });
  });

  it("form -> row: blanks become null", () => {
    const form = eateryFormSchema.parse({
      name: "  New Place ", city: "Kuching", dishes: ["laksa"], priceTier: "", isSplurge: "", mapsUrl: "", notes: "", isPublished: "on",
    });
    expect(eateryFormToRow(form)).toMatchObject({ name: "New Place", city: "Kuching", price_tier: null, maps_url: null, notes: null, is_published: true });
  });

  it("the form schema refuses bad input", () => {
    const ok = { name: "Place", city: "Kuching", dishes: [], priceTier: "2", isSplurge: "", mapsUrl: "https://maps.app.goo.gl/x", notes: "", isPublished: "on" };
    expect(eateryFormSchema.safeParse(ok).success).toBe(true);
    for (const bad of [
      { ...ok, name: "x" },
      { ...ok, city: "Kapit" },
      { ...ok, priceTier: "4" },
      { ...ok, dishes: ["pizza"] },
      { ...ok, mapsUrl: "http://maps.example" },
      { ...ok, mapsUrl: "javascript:alert(1)" },
      { ...ok, notes: "x".repeat(301) },
    ]) {
      expect(eateryFormSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("meal picking", () => {
  const pool = mealPool(demoEateries);
  const none = new Set<string>();

  it("only Kuching places that are an actual meal (not a cake or bread shop)", () => {
    expect(pool.every((e) => e.city === "Kuching")).toBe(true);
    const slugs = pool.map((e) => e.slug);
    expect(slugs).toContain("mui-xin-laksa");
    expect(slugs).toContain("roots-restaurant");
    for (const snack of ["kompia-house", "dayang-salhah", "kek-lapis-mama-su", "kek-lapis-warisan"]) expect(slugs).not.toContain(snack);
  });

  it("lunch favours a noodle/laksa place, dinner a sit-down Sarawak dish", () => {
    const lunch = pickMealEatery(pool, "lunch", { used: none, budgetTight: false, splurge: false })!;
    expect(lunch.dishes.some((d) => ["laksa", "kolo-mee"].includes(d))).toBe(true);
    const dinner = pickMealEatery(pool, "dinner", { used: none, budgetTight: false, splurge: false })!;
    expect(dinner.dishes.some((d) => ["umai", "manok-pansoh", "midin"].includes(d))).toBe(true);
    expect(lunch.isSplurge || dinner.isSplurge).toBe(false);
  });

  it("uses each place once before repeating", () => {
    const used = new Set<string>();
    const seen: string[] = [];
    const nonSplurge = pool.filter((e) => !e.isSplurge).length;
    for (let i = 0; i < nonSplurge; i++) {
      const e = pickMealEatery(pool, i % 2 ? "dinner" : "lunch", { used, budgetTight: false, splurge: false })!;
      expect(used.has(e.id)).toBe(false);
      used.add(e.id);
      seen.push(e.slug);
    }
    expect(new Set(seen).size).toBe(nonSplurge);
    // everything used: it repeats rather than returning nothing
    expect(pickMealEatery(pool, "lunch", { used, budgetTight: false, splurge: false })).not.toBeNull();
  });

  it("a tight budget never gets a $$$ place; a splurge is only for the special dinner", () => {
    const tight = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const e = pickMealEatery(pool, i % 2 ? "dinner" : "lunch", { used: tight, budgetTight: true, splurge: true })!;
      tight.add(e.id);
      expect((e.priceTier ?? 2) <= 2 && !e.isSplurge, e.name).toBe(true);
    }
    const special = pickMealEatery(pool, "dinner", { used: none, budgetTight: false, splurge: true })!;
    expect(special.isSplurge).toBe(true);
    expect(pickMealEatery(pool, "lunch", { used: none, budgetTight: false, splurge: true })!.isSplurge).toBe(false);
  });

  it("nothing in the guide -> null (the builder keeps its generic meal)", () => {
    expect(pickMealEatery([], "lunch", { used: none, budgetTight: false, splurge: false })).toBeNull();
  });

  it("describes a place honestly: tier and an estimate, no invented price", () => {
    expect(describeEatery(by("mui-xin-laksa"))).toBe("Try the sarawak laksa. About RM12 per person ($) — an estimate.");
    expect(describeEatery(by("cavakita-rooftop-bar"))).toContain("Go for the sunset.");
    expect(estimateMealPerPerson(by("roots-restaurant"))).toBe(65);
    expect(estimateMealPerPerson({ ...by("roots-restaurant"), priceTier: null })).toBe(90);
  });
});

// ---- the planner with the guide ----

const trip = (over: Partial<TripInput> = {}): TripInput => ({
  title: "t", startDate: "2026-10-20", endDate: "2026-10-23", budgetPerPerson: 2000, groupType: "couple",
  numAdults: 2, numChildren: 0, interests: ["food", "culture"], pace: "moderate", notes: null, ...over,
});
type Catalogue = { experiences: typeof demoExperiences; attractions: typeof demoAttractions; eateries?: Eatery[] };
const catalogue: Catalogue = { experiences: demoExperiences, attractions: demoAttractions, eateries: demoEateries };
const meals = (t: TripInput, c: Catalogue = catalogue): ItineraryItem[] =>
  buildItinerary(t, c).days.flatMap((d) => d.items).filter((i) => i.type === "meal");

describe("itinerary meals from the guide", () => {
  it("meals name real places from the guide, priced as an estimate for the whole party", () => {
    const list = meals(trip());
    const named = list.filter((m) => /^(Lunch|Dinner) at /.test(m.title));
    expect(named.length).toBeGreaterThan(0);
    const names = new Set(demoEateries.map((e) => e.name));
    for (const m of named) {
      const place = m.title.replace(/^(Lunch|Dinner) at /, "");
      expect(names.has(place), place).toBe(true);
      const e = demoEateries.find((x) => x.name === place)!;
      expect(m.estimatedCost).toBe(estimateMealPerPerson(e) * 2);
      expect(m.whyRecommended).toBe("From our local food guide.");
    }
  });

  it("doesn't send you to the same place twice in one trip", () => {
    const places = meals(trip()).map((m) => m.title.replace(/^(Lunch|Dinner) at /, ""));
    expect(new Set(places).size).toBe(places.length);
  });

  it("the last evening of a longer trip is the splurge (when the budget allows)", () => {
    const it4 = buildItinerary(trip(), catalogue);
    const dinners = it4.days[it4.days.length - 2].items.filter((i) => i.type === "meal" && i.title.startsWith("Dinner"));
    expect(dinners.some((m) => demoEateries.find((e) => m.title.endsWith(e.name))?.isSplurge)).toBe(true);
  });

  it("a tight budget never gets a splurge", () => {
    for (const m of meals(trip({ budgetPerPerson: 600 }))) {
      expect(demoEateries.filter((e) => e.isSplurge).some((e) => m.title.endsWith(e.name))).toBe(false);
    }
  });

  it("with no guide (or none in Kuching) meals stay the generic ones", () => {
    for (const c of [{ ...catalogue, eateries: undefined }, { ...catalogue, eateries: [] }]) {
      for (const m of meals(trip(), c)) expect(m.title).not.toMatch(/^(Lunch|Dinner) at /);
    }
  });
});

describe("Kuching-region guard and must-see ranking", () => {
  const miri: LocationRef = { id: "loc-miri", name: "Miri", area: "Miri" };
  const mulu: Attraction = {
    ...demoAttractions[0], id: "att-mulu", slug: "gunung-mulu-national-park", name: "Gunung Mulu National Park",
    location: miri, categories: ["nature", "adventure", "wildlife"], featuredRank: 2, isPublished: true,
  };

  it("never puts a place outside the Kuching region into a Kuching itinerary", () => {
    const it = buildItinerary(trip({ interests: ["nature", "adventure", "wildlife"] }), {
      ...catalogue,
      attractions: [mulu, ...demoAttractions],
    });
    expect(it.days.flatMap((d) => d.items).some((i) => i.attractionSlug === mulu.slug)).toBe(false);
  });

  it("the demo locations are all Kuching-region (so nothing local is dropped)", () => {
    expect(demoLocations.every((l) => l.area === "Kuching")).toBe(true);
  });

  it("between two otherwise equal places, the must-see one is chosen first", () => {
    const [a, b] = demoAttractions.filter((x) => x.location?.name === "Kuching City Centre" && x.isFree).slice(0, 2);
    const t = trip({ interests: [], startDate: "2026-10-20", endDate: "2026-10-21", pace: "relaxed" });
    const firstAtt = (list: Attraction[]) =>
      buildItinerary(t, { experiences: [], attractions: list, eateries: [] })
        .days.flatMap((d) => d.items)
        .find((x) => x.attractionSlug)?.attractionSlug;
    const plain = (x: Attraction) => ({ ...x, featuredRank: null });
    // same two places, listed [a, b]; only b carries a must-see rank
    expect(firstAtt([plain(a), plain(b)])).toBe(a.slug);
    expect(firstAtt([plain(a), { ...b, featuredRank: 1 }])).toBe(b.slug);
    // "also great" (6+) is not a must-see: no nudge
    expect(firstAtt([plain(a), { ...b, featuredRank: 6 }])).toBe(a.slug);
  });
});

