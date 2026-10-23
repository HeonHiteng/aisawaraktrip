import { describe, expect, it } from "vitest";
import { isRealPhoto } from "@/lib/photo-credits";

describe("isRealPhoto", () => {
  it("shows uploaded and owned photos", () => {
    expect(
      isRealPhoto("https://x.supabase.co/storage/v1/object/public/catalogue/a.webp"),
    ).toBe(true);
    expect(isRealPhoto("https://example.com/fort-margherita.jpg")).toBe(true);
    // the old bundled demo photos show as the item's own (founder's choice, Oct 2026)
    expect(isRealPhoto("/demo/fort.jpg")).toBe(true);
  });

  it("never shows stock placeholders as a picture of the place", () => {
    expect(isRealPhoto("https://images.unsplash.com/photo-1?w=800")).toBe(false);
    expect(isRealPhoto("")).toBe(false);
    expect(isRealPhoto(null)).toBe(false);
    expect(isRealPhoto(undefined)).toBe(false);
  });
});
