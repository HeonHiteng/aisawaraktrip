import Image from "next/image";
import { cn } from "@/lib/utils";
import { coverPhoto } from "@/lib/photo-credits";
import type { CategorySlug } from "@/types/catalogue";

/** Width hint for a card in the app's 1-column (phone) / 2-column (sm+) grids and rails. */
export const CARD_SIZES = "(max-width: 640px) 100vw, 320px";

/**
 * Cover photo for catalogue cards and heroes. Always a photo: the item's own real photo, else a
 * stand-in for its category (`coverPhoto`, decorative, so empty alt text).
 * `sizes`: the rendered width, so phones fetch a small enough variant (default: a full-width hero).
 */
export function CoverImage({
  url,
  alt,
  category,
  priority,
  sizes = "(max-width: 672px) 100vw, 640px",
  className,
}: {
  url?: string | null;
  alt: string;
  category?: CategorySlug;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const photo = coverPhoto(url, category);
  return (
    <Image
      src={photo.src}
      alt={photo.own ? alt : ""}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
      priority={priority}
    />
  );
}
