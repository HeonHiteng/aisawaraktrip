import credits from "@/data/photo-credits.json";
import type { CategorySlug } from "@/types/catalogue";

/** Attribution for a bundled photo (Wikimedia Commons; CC licences need the author + licence shown). */
export interface PhotoCredit {
  alt: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  source: string;
}

const CREDITS = credits as Record<string, PhotoCredit>;

/** The credit for a bundled `/photos/...` path, or null (uploads and owned links need none). */
export function photoCredit(url: string | null | undefined): PhotoCredit | null {
  return (url && CREDITS[url]) || null;
}

/** Every bundled photo with its credit, for the /credits page. */
export function allPhotoCredits(): [string, PhotoCredit][] {
  return Object.entries(CREDITS);
}

/**
 * Placeholder stock photos (Unsplash links, the old /public/demo set) are not pictures of the
 * actual place, so they never show as one. Real photos are bundled (`/photos`), uploaded by an
 * admin (Storage) or an owned link.
 */
export function isRealPhoto(url: string | null | undefined): url is string {
  return (
    !!url && !url.includes("images.unsplash.com") && !url.startsWith("/demo/")
  );
}

/** A local food photo for each dish slug (see DISH_LABELS). */
export const DISH_PHOTO: Partial<Record<string, string>> = {
  laksa: "/photos/dishes/laksa.webp",
  "kolo-mee": "/photos/dishes/kolo-mee.webp",
  kampua: "/photos/dishes/kampua.webp",
  umai: "/photos/dishes/umai.webp",
  "manok-pansoh": "/photos/dishes/manok-pansoh.webp",
  midin: "/photos/dishes/midin.webp",
  kompia: "/photos/dishes/kompia.webp",
  "kek-lapis": "/photos/dishes/kek-lapis.webp",
  "fine-dining": "/photos/dishes/fine-dining.webp",
};

/**
 * Stand-in photo per interest category, for a card whose item has no photo of its own yet
 * (e.g. a place an admin just added), so every card shows a photo. These are generic mood
 * shots from the old /public/demo set — deliberately NOT photos of another real landmark, so a
 * stand-in never passes as the wrong place — and are shown without alt text.
 * (The demo files that show famous elsewhere-landmarks are never used.)
 */
export const CATEGORY_PHOTO: Record<CategorySlug, string> = {
  nature: "/demo/rainforest.jpg",
  wildlife: "/demo/hornbill.jpg",
  culture: "/demo/museum.jpg",
  heritage: "/demo/chinatown.jpg",
  food: "/demo/streetfood.jpg",
  adventure: "/demo/jungle-trail.jpg",
  shopping: "/demo/market.jpg",
};

/** The stand-in when nothing else is known: Kuching's riverfront. */
export const DEFAULT_PHOTO = "/photos/kuching-waterfront.webp";

/**
 * The photo a card shows: the item's own real photo, else its category's stand-in, else the
 * default. `own` says whether it is the item's own photo (stand-ins get empty alt text).
 */
export function coverPhoto(
  url: string | null | undefined,
  category?: CategorySlug | null,
): { src: string; own: boolean } {
  if (isRealPhoto(url)) return { src: url, own: true };
  return { src: (category && CATEGORY_PHOTO[category]) || DEFAULT_PHOTO, own: false };
}

/** The photo for an eatery: its first listed dish that has one, else a local dish. */
export function eateryPhoto(dishes: string[]): string {
  for (const d of dishes) {
    const url = DISH_PHOTO[d];
    if (url) return url;
  }
  return CATEGORY_PHOTO.food;
}
