import { describe, expect, it } from "vitest";
import { extensionFor, fitWithin, storagePathFromUrl } from "@/lib/photo-upload";

describe("fitWithin", () => {
  it("shrinks the long side to the limit and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
  it("never enlarges a small image", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("never returns a zero side", () => {
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 });
  });
});

describe("extensionFor", () => {
  it("maps the accepted types and nothing else", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/svg+xml")).toBeNull();
    expect(extensionFor("text/html")).toBeNull();
  });
});

describe("storagePathFromUrl", () => {
  const base = "https://x.supabase.co/storage/v1/object/public";
  it("extracts the object path for our bucket", () => {
    expect(storagePathFromUrl(`${base}/catalogue/experiences/a.webp`, "catalogue")).toBe("experiences/a.webp");
    expect(storagePathFromUrl(`${base}/catalogue/experiences/a%20b.webp?v=2`, "catalogue")).toBe("experiences/a b.webp");
  });
  it("returns null for other buckets and outside links", () => {
    expect(storagePathFromUrl(`${base}/avatars/a.png`, "catalogue")).toBeNull();
    expect(storagePathFromUrl("https://images.unsplash.com/photo.jpg", "catalogue")).toBeNull();
    expect(storagePathFromUrl("/demo/rainforest.jpg", "catalogue")).toBeNull();
  });
});
