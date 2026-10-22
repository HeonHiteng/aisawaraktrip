import Image from "next/image";
import {
  Bird,
  Drama,
  Landmark,
  type LucideIcon,
  Mountain,
  ShoppingBag,
  TreePalm,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/types/catalogue";

/** Category icon + the oklch hue of its glow (the base is always the brand's dark violet). */
const ART: Record<CategorySlug, { icon: LucideIcon; hue: number }> = {
  nature: { icon: TreePalm, hue: 155 },
  wildlife: { icon: Bird, hue: 125 },
  culture: { icon: Drama, hue: 340 },
  heritage: { icon: Landmark, hue: 280 },
  food: { icon: UtensilsCrossed, hue: 50 },
  adventure: { icon: Mountain, hue: 225 },
  shopping: { icon: ShoppingBag, hue: 0 },
};

/**
 * Placeholder stock photos (Unsplash links, the bundled /public/demo set) are not pictures of
 * the actual place, so they never show as one. Real photos come from the admin upload
 * (Storage) or an owned link.
 */
export function isRealPhoto(url: string | null | undefined): url is string {
  return (
    !!url && !url.includes("images.unsplash.com") && !url.startsWith("/demo/")
  );
}

/** Width hint for a card in the app's 1-column (phone) / 2-column (sm+) grids and rails. */
export const CARD_SIZES = "(max-width: 640px) 100vw, 320px";

/**
 * Cover art for catalogue cards. Renders a real photo when one exists (`isRealPhoto`),
 * otherwise branded art: the dark-violet hero base, a glow in the category's hue (its
 * position seeded by the item, so neighbours differ) and the category icon, large and faint.
 * `sizes`: the rendered width, so phones fetch a small enough variant (default: a full-width hero).
 */
export function CoverImage({
  url,
  alt,
  category,
  seed = "",
  priority,
  sizes = "(max-width: 672px) 100vw, 640px",
  className,
}: {
  url?: string | null;
  alt: string;
  category?: CategorySlug;
  seed?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (isRealPhoto(url)) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
        priority={priority}
      />
    );
  }

  const art = (category && ART[category]) || ART.adventure;
  const shift = [...seed].reduce((a, c) => (a + c.charCodeAt(0)) % 60, 0);
  const Icon = art.icon;

  return (
    <div
      aria-hidden
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `radial-gradient(110% 85% at ${20 + shift}% 0%, oklch(0.66 0.16 ${art.hue} / 0.9), transparent 62%), linear-gradient(160deg, oklch(0.34 0.13 293), oklch(0.22 0.09 305))`,
      }}
    >
      <Icon
        className="absolute -right-4 -bottom-5 size-32 -rotate-12 text-white/15"
        strokeWidth={1.25}
      />
    </div>
  );
}
