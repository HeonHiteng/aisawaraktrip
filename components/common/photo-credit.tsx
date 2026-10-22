import { photoCredit } from "@/lib/photo-credits";

/**
 * "Photo: Author · CC BY-SA 4.0" under a hero photo, when the photo is a credited bundled one.
 * The author links to the photo's source page; the full list is on /credits (site footer).
 */
export function PhotoCredit({ url }: { url: string | null | undefined }) {
  const c = photoCredit(url);
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
