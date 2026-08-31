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

const ART: Record<CategorySlug, { icon: LucideIcon; hue: number }> = {
  nature: { icon: TreePalm, hue: 155 },
  wildlife: { icon: Bird, hue: 130 },
  culture: { icon: Drama, hue: 290 },
  heritage: { icon: Landmark, hue: 265 },
  food: { icon: UtensilsCrossed, hue: 25 },
  adventure: { icon: Mountain, hue: 200 },
  shopping: { icon: ShoppingBag, hue: 330 },
};

/**
 * Cover art for catalogue cards. Renders a real photo when one exists
 * (Supabase Storage), otherwise a deterministic branded gradient keyed to
 * the item's main category — so the demo has no image dependencies.
 */
export function CoverImage({
  url,
  alt,
  category,
  seed = "",
  priority,
  className,
}: {
  url?: string | null;
  alt: string;
  category?: CategorySlug;
  seed?: string;
  priority?: boolean;
  className?: string;
}) {
  const isPhoto = !!url && !url.includes("images.unsplash.com");
  if (isPhoto) {
    return (
      <Image
        src={url!}
        alt={alt}
        fill
        sizes="(max-width: 672px) 100vw, 640px"
        className={cn("object-cover", className)}
        priority={priority}
      />
    );
  }

  const art = (category && ART[category]) || ART.adventure;
  const shift = [...seed].reduce((a, c) => (a + c.charCodeAt(0)) % 40, 0);
  const Icon = art.icon;

  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      style={{
        background: `linear-gradient(135deg, hsl(${art.hue + shift} 48% 42%), hsl(${
          (art.hue + shift + 45) % 360
        } 55% 58%))`,
      }}
    >
      <Icon className="size-10 text-white/45" strokeWidth={1.5} />
    </div>
  );
}
