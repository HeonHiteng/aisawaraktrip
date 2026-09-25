import { describe, expect, it } from "vitest";
import {
  getAttraction,
  getExperience,
  getExperienceById,
  listAttractions,
  listExperiences,
} from "@/lib/domain/catalogue";
import { listReviews, ratingSummary } from "@/lib/domain/reviews";
import { DEMO_MODE } from "@/lib/demo/mode";

describe("catalogue (live Supabase, real mode)", () => {
  it("runs in real mode", () => {
    expect(DEMO_MODE).toBe(false);
  });

  it("lists the 6 published experiences with vendor, categories, photo and rating", async () => {
    const list = await listExperiences();
    expect(list).toHaveLength(6);
    for (const e of list) {
      expect(e.isPublished).toBe(true);
      expect(e.vendor.name).toBeTruthy();
      expect(e.vendor.verificationStatus).toBe("verified");
      expect(e.categories.length).toBeGreaterThan(0);
      expect(e.images).toHaveLength(1);
      expect(e.images[0].url).toMatch(/^\/demo\//);
      expect(e.rating).toBeGreaterThan(4);
      expect(e.availability.times.length).toBeGreaterThan(0);
      expect(e.pricePerPerson).toBeGreaterThan(0);
    }
  });

  it("lists the 8 published attractions", async () => {
    const list = await listAttractions();
    expect(list).toHaveLength(8);
    expect(list.every((a) => a.images.length === 1 && a.categories.length > 0)).toBe(true);
  });

  it("filters, searches and sorts exactly like demo mode", async () => {
    const food = await listExperiences({ categories: ["food"] });
    expect(food.map((e) => e.slug).sort()).toEqual([
      "kuching-heritage-street-food-walk",
      "sarawak-laksa-kolo-mee-cooking-class",
    ]);
    expect((await listExperiences({ search: "kayak" })).map((e) => e.slug)).toEqual([
      "sarawak-kiri-river-kayaking-semadang",
    ]);
    const asc = (await listExperiences({ sort: "price-asc" })).map((e) => e.pricePerPerson);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const shops = await listAttractions({ categories: ["shopping"] });
    expect(shops.map((a) => a.slug)).toEqual(["main-bazaar-carpenter-street"]);
  });

  it("fetches one by slug and by id; junk ids are 'not found', not errors", async () => {
    const bySlug = await getExperience("bako-national-park-full-day-trek");
    expect(bySlug?.title).toContain("Bako");
    expect(bySlug?.pricePerPerson).toBe(320);
    expect((await getExperienceById(bySlug!.id))?.slug).toBe(bySlug!.slug);
    expect(await getExperience("nope")).toBeNull();
    expect(await getExperienceById("exp-cruise")).toBeNull();
    expect(await getExperienceById("' or 1=1 --")).toBeNull();
    expect((await getAttraction("fort-margherita"))?.openingHours.mon).toBe("closed");
    expect(await getAttraction("nope")).toBeNull();
  });

  it("rating summary falls back to the catalogue baseline when there are no live reviews", async () => {
    const e = (await getExperience("kuching-heritage-street-food-walk"))!;
    expect(await listReviews(e.id)).toEqual([]);
    expect(await ratingSummary(e.id)).toEqual({ average: 4.9, count: 128 });
    expect(await listReviews("not-a-uuid")).toEqual([]);
  });
});
