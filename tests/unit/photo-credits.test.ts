import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { allPhotoCredits, DISH_PHOTO, eateryPhoto, photoCredit } from "@/lib/photo-credits";
import { isRealPhoto } from "@/components/explore/cover-image";

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
    expect(eateryPhoto(["fine-dining", "laksa"])).toBe(DISH_PHOTO.laksa);
    expect(eateryPhoto(["fine-dining"])).toBeNull();
  });
});
