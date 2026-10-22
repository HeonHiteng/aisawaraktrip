import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import {
  allPhotoCredits,
  CATEGORY_PHOTO,
  coverPhoto,
  DEFAULT_PHOTO,
  DISH_PHOTO,
  eateryPhoto,
  isRealPhoto,
  photoCredit,
} from "@/lib/photo-credits";

const onDisk = (url: string) => existsSync(join(process.cwd(), "public", url));

describe("bundled photos", () => {
  it("every demo attraction and experience has a real, credited photo that exists", () => {
    for (const item of [...demoAttractions, ...demoExperiences]) {
      const url = item.images[0]?.url;
      expect(url, item.slug).toBeTruthy();
      expect(isRealPhoto(url), item.slug).toBe(true);
      expect(onDisk(url!), url).toBe(true);
      expect(photoCredit(url), url).not.toBeNull();
    }
  });

  it("every photo the seeds reference exists and is credited", () => {
    for (const file of ["seed.sql", "seed-guide.sql"]) {
      const sql = readFileSync(join(process.cwd(), "supabase", file), "utf8");
      const urls = [...sql.matchAll(/'(\/photos\/[^']+)'/g)].map((m) => m[1]);
      expect(urls.length, file).toBeGreaterThan(0);
      for (const url of urls) {
        expect(onDisk(url), url).toBe(true);
        expect(photoCredit(url), url).not.toBeNull();
      }
    }
  });

  it("every credit names an author, a licence and its source page", () => {
    for (const [url, c] of allPhotoCredits()) {
      expect(onDisk(url), url).toBe(true);
      expect(c.author, url).toBeTruthy();
      expect(c.license, url).toBeTruthy();
      expect(c.source, url).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it("dish photos exist, and an eatery uses its first dish that has one", () => {
    for (const url of Object.values(DISH_PHOTO)) {
      expect(onDisk(url!), url).toBe(true);
      expect(photoCredit(url), url).not.toBeNull();
    }
    expect(eateryPhoto(["umai", "laksa"])).toBe(DISH_PHOTO.umai);
    expect(eateryPhoto(["something-new", "laksa"])).toBe(DISH_PHOTO.laksa);
    expect(eateryPhoto(["something-new"])).toBe(CATEGORY_PHOTO.food);
  });

  it("every card gets a photo: its own, else a stand-in for its category, else the default", () => {
    expect(coverPhoto("/photos/niah-caves.webp", "nature")).toEqual({ src: "/photos/niah-caves.webp", own: true });
    expect(coverPhoto(null, "wildlife")).toEqual({ src: CATEGORY_PHOTO.wildlife, own: false });
    expect(coverPhoto("/demo/fort.jpg", "heritage")).toEqual({ src: CATEGORY_PHOTO.heritage, own: false });
    expect(coverPhoto(undefined)).toEqual({ src: DEFAULT_PHOTO, own: false });
    for (const url of [...Object.values(CATEGORY_PHOTO), DEFAULT_PHOTO]) expect(onDisk(url), url).toBe(true);
  });
});
