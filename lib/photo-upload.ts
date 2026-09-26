/**
 * Browser-side helpers for admin photo uploads. Phone photos are 3–8 MB; we shrink them
 * before they leave the device (long side ≤ 1600 px, re-encoded) so listings load fast and
 * stay under the bucket's size limit. Pure bits are exported for tests.
 */

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
export const UPLOAD_MAX_SIDE = 1600;
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Size to draw at: never enlarge, keep the aspect ratio, long side ≤ max. */
export function fitWithin(w: number, h: number, max = UPLOAD_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

export function extensionFor(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

/** `<base>/storage/v1/object/public/<bucket>/<path>` -> `<path>`; null for anything else. */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
}

/** Decode, shrink and re-encode an image file. Throws a short, human message on failure. */
export async function resizeForUpload(file: File): Promise<{ blob: Blob; ext: string }> {
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("isn't a JPG, PNG or WebP image");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("couldn't be read as an image");
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("couldn't be processed on this device");
    ctx.drawImage(bitmap, 0, 0, width, height);
    // WebP keeps transparency (logos) and is small; a browser without WebP encoding hands back PNG
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
    const ext = blob ? extensionFor(blob.type) : null;
    if (!blob || !ext) throw new Error("couldn't be converted");
    return { blob, ext };
  } finally {
    bitmap.close();
  }
}
