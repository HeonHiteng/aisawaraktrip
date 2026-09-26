import { describe, expect, it } from "vitest";
import { pathsToRemove } from "@/lib/domain/photo-cleanup";

const base = "https://x.supabase.co/storage/v1/object/public";
const mine = (p: string) => `${base}/catalogue/${p}`;

describe("pathsToRemove — which stored files are safe to delete", () => {
  it("returns the storage paths of files in our bucket that nothing references any more", () => {
    expect(pathsToRemove([mine("experiences/a.webp"), mine("attractions/b.webp")], new Set())).toEqual([
      "experiences/a.webp",
      "attractions/b.webp",
    ]);
  });

  it("never touches a pasted external link, a bundled path, or another bucket", () => {
    expect(
      pathsToRemove(
        ["https://images.unsplash.com/photo.jpg", "/demo/kayak.jpg", `${base}/avatars/u/me.png`, "not a url"],
        new Set(),
      ),
    ).toEqual([]);
  });

  it("keeps a file another record still points at", () => {
    const shared = mine("experiences/shared.webp");
    expect(pathsToRemove([shared, mine("experiences/gone.webp")], new Set([shared]))).toEqual(["experiences/gone.webp"]);
  });

  it("de-duplicates, and decodes escaped names", () => {
    expect(pathsToRemove([mine("experiences/a%20b.webp"), mine("experiences/a%20b.webp")], new Set())).toEqual(["experiences/a b.webp"]);
  });

  it("nothing to do -> empty", () => {
    expect(pathsToRemove([], new Set())).toEqual([]);
  });
});
