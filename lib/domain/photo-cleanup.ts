import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { storagePathFromUrl } from "@/lib/photo-upload";

/**
 * Uploaded photos live in the `catalogue` Storage bucket, and the database only stores their URLs.
 * A trigger can't delete Storage objects, so when an admin replaces or removes a photo — or deletes
 * the experience / attraction / vendor it belonged to — the app deletes the now-unused file here.
 *
 * Safe by construction: only files in OUR bucket are touched, never a pasted external link, and a
 * file another record still points at is kept. Best-effort: a failure is logged, never thrown, so a
 * leftover file can't block an edit.
 */

const BUCKET = "catalogue";

/** Which of these URLs are files in our bucket and no longer referenced by anything. Pure. */
export function pathsToRemove(candidateUrls: string[], stillReferenced: ReadonlySet<string>): string[] {
  const paths = new Set<string>();
  for (const url of new Set(candidateUrls)) {
    if (stillReferenced.has(url)) continue;
    const path = storagePathFromUrl(url, BUCKET);
    if (path) paths.add(path);
  }
  return [...paths];
}

type Db = SupabaseClient<Database>;

/** The photo URLs currently saved for one experience / attraction. */
export async function photoUrlsOf(db: Db, owner: "experience" | "attraction", id: string): Promise<string[]> {
  const { data } = await db.from("images").select("url").eq("owner_type", owner).eq("owner_id", id);
  return (data ?? []).map((r) => r.url);
}

export async function avatarUrlOf(db: Db, vendorId: string): Promise<string[]> {
  const { data } = await db.from("vendors").select("avatar_url").eq("id", vendorId).maybeSingle();
  return data?.avatar_url ? [data.avatar_url] : [];
}

/** Delete the files behind `urls` that nothing references any more. Call AFTER the database change. */
export async function removeUnusedPhotos(db: Db, urls: string[]): Promise<void> {
  const ours = urls.filter((u) => storagePathFromUrl(u, BUCKET));
  if (ours.length === 0) return;
  try {
    const [imgs, avatars] = await Promise.all([
      db.from("images").select("url").in("url", ours),
      db.from("vendors").select("avatar_url").in("avatar_url", ours),
    ]);
    const used = new Set<string>([
      ...(imgs.data ?? []).map((r) => r.url),
      ...(avatars.data ?? []).map((r) => r.avatar_url as string),
    ]);
    const paths = pathsToRemove(ours, used);
    if (paths.length === 0) return;
    const { error } = await db.storage.from(BUCKET).remove(paths);
    if (error) console.error("[photos] could not remove unused files", paths, error.message);
  } catch (e) {
    console.error("[photos] cleanup failed", e);
  }
}
