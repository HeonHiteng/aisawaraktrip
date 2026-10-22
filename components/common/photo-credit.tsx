import { coverPhoto, photoCredit } from "@/lib/photo-credits";
import type { CategorySlug } from "@/types/catalogue";

/**
 * "Photo: Author · CC BY-SA 4.0" under a hero photo, when the photo shown (same resolution as
 * `CoverImage`) is a credited bundled one. The author links to the photo's source page; the
 * full list is on /credits (site footer).
 */
export function PhotoCredit({
  url,
  category,
}: {
  url: string | null | undefined;
  category?: CategorySlug;
}) {
  const c = photoCredit(coverPhoto(url, category).src);
  if (!c) return null;
  return (
    <p className="-mt-3 text-right text-[11px] text-muted-foreground">
      Photo:{" "}
      <a
        href={c.source}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {c.author}
      </a>{" "}
      · {c.license}
    </p>
  );
}
