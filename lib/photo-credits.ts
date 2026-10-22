import credits from "@/data/photo-credits.json";

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

/** A local food photo for each dish slug (see DISH_LABELS); dishes without a true photo have none. */
export const DISH_PHOTO: Partial<Record<string, string>> = {
  laksa: "/photos/dishes/laksa.webp",
  "kolo-mee": "/photos/dishes/kolo-mee.webp",
  kampua: "/photos/dishes/kampua.webp",
  umai: "/photos/dishes/umai.webp",
  "manok-pansoh": "/photos/dishes/manok-pansoh.webp",
  midin: "/photos/dishes/midin.webp",
  kompia: "/photos/dishes/kompia.webp",
  "kek-lapis": "/photos/dishes/kek-lapis.webp",
};

/** The photo for an eatery: its first listed dish that has one. */
export function eateryPhoto(dishes: string[]): string | null {
  for (const d of dishes) {
    const url = DISH_PHOTO[d];
    if (url) return url;
  }
  return null;
}
