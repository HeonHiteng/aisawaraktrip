import { describe, expect, it } from "vitest";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";

describe("listExperiences — filtering", () => {
  it("only returns published rows", async () => {
    const all = await listExperiences();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((e) => e.isPublished)).toBe(true);
  });

  it("filters by category and by search term", async () => {
    const food = await listExperiences({ categories: ["food"] });
    expect(food.length).toBeGreaterThan(0);
    expect(food.every((e) => e.categories.includes("food"))).toBe(true);

    const laksa = await listExperiences({ search: "laksa" });
    expect(laksa.some((e) => /laksa/i.test(e.title))).toBe(true);
  });
});

describe("listExperiences — sorting", () => {
  it("price-asc / price-desc order by price per person", async () => {
    const asc = await listExperiences({ sort: "price-asc" });
    const desc = await listExperiences({ sort: "price-desc" });
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].pricePerPerson).toBeGreaterThanOrEqual(
        asc[i - 1].pricePerPerson,
      );
    }
    expect(desc.map((e) => e.pricePerPerson)).toEqual(
      [...asc.map((e) => e.pricePerPerson)].reverse(),
    );
  });

  it("recommended / rating-desc order by rating, highest first", async () => {
    const byRating = await listExperiences({ sort: "rating-desc" });
    for (let i = 1; i < byRating.length; i++) {
      expect(byRating[i].rating ?? 0).toBeLessThanOrEqual(
        byRating[i - 1].rating ?? 0,
      );
    }
  });

  it("does not mutate the underlying catalogue order between calls", async () => {
    const a = (await listExperiences({ sort: "price-asc" })).map((e) => e.id);
    const b = (await listExperiences({ sort: "price-desc" })).map((e) => e.id);
    const c = (await listExperiences({ sort: "price-asc" })).map((e) => e.id);
    expect(a).toEqual(c);
    expect(a).not.toEqual(b);
  });
});

describe("listAttractions — sorting", () => {
  it("price-asc orders by minimum price", async () => {
    const asc = await listAttractions({ sort: "price-asc" });
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].priceMin).toBeGreaterThanOrEqual(asc[i - 1].priceMin);
    }
  });
});
