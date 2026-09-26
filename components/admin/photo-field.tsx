"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { resizeForUpload, storagePathFromUrl, UPLOAD_MAX_BYTES } from "@/lib/photo-upload";

const BUCKET = "catalogue";

/**
 * Photos for an admin form: upload from the device (resized in the browser, stored in the
 * `catalogue` Storage bucket — admins only, enforced by RLS) or paste a URL.
 *
 * The form still submits plain text: a hidden input named `name` carries the URLs, one per
 * line (or just the one URL when `max` is 1), exactly what the existing Server Actions parse.
 * The first photo is the cover.
 *
 * `canUpload` is false in demo mode (there is no Storage) — the URL box still works.
 */
export function PhotoField({
  name,
  initial,
  folder,
  max = 8,
  canUpload,
}: {
  name: string;
  initial: string[];
  /** Storage folder inside the bucket, e.g. "experiences". */
  folder: string;
  max?: number;
  canUpload: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // files uploaded during this visit and not yet saved: safe to delete if the admin removes them
  const fresh = useRef(new Set<string>());
  const single = max === 1;

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage(null);
    setBusy(true);
    const supabase = createClient();
    const added: string[] = [];
    const errors: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, max - urls.length))) {
        try {
          const { blob, ext } = await resizeForUpload(file);
          if (blob.size > UPLOAD_MAX_BYTES) throw new Error("is too large even after shrinking");
          const path = `${folder}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
          if (error) throw new Error(error.message);
          fresh.current.add(path);
          added.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        } catch (e) {
          errors.push(`${file.name} ${e instanceof Error ? e.message : "failed"}`);
        }
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    if (added.length) setUrls((cur) => (single ? added.slice(-1) : [...cur, ...added]).slice(0, max));
    const skipped = files.length - added.length - errors.length;
    if (skipped > 0) errors.push(`Only ${max} photo${max === 1 ? "" : "s"} allowed — ${skipped} skipped`);
    if (errors.length) setMessage(errors.join(". ") + ".");
  }

  async function remove(i: number) {
    const url = urls[i];
    setUrls((cur) => cur.filter((_, j) => j !== i));
    const path = storagePathFromUrl(url, BUCKET);
    if (path && fresh.current.has(path)) {
      fresh.current.delete(path);
      await createClient().storage.from(BUCKET).remove([path]); // never saved anywhere: best-effort tidy
    }
  }

  function makeCover(i: number) {
    setUrls((cur) => [cur[i], ...cur.filter((_, j) => j !== i)]);
  }

  function addUrl() {
    const v = draft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v) && !v.startsWith("/")) {
      setMessage("Enter a full https:// link.");
      return;
    }
    setMessage(null);
    setUrls((cur) => (single ? [v] : cur.includes(v) ? cur : [...cur, v]).slice(0, max));
    setDraft("");
  }

  const full = urls.length >= max && !single;

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((u, i) => (
            <li
              key={u}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              {!single && i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
                  <Star className="size-3" /> Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                {!single && i > 0 ? (
                  <button
                    type="button"
                    onClick={() => makeCover(i)}
                    className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-black hover:bg-white"
                  >
                    Make cover
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => void remove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="grid size-6 place-items-center rounded-full bg-white/90 text-black hover:bg-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={!single}
              className="sr-only"
              id={`${name}-file`}
              onChange={(e) => void upload(e.target.files)}
              disabled={busy || full}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || full}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {busy ? "Uploading…" : single && urls.length ? "Replace photo" : "Upload photo"}
            </Button>
          </>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // Enter here must not submit the whole form
                addUrl();
              }
            }}
            placeholder="…or paste an image link"
            aria-label="Image link"
            className="min-w-40"
            disabled={full}
          />
          <Button type="button" variant="ghost" size="sm" onClick={addUrl} disabled={!draft.trim() || full}>
            Add
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-4 text-xs text-destructive">
        {message}
      </p>
      {!canUpload && (
        <p className="text-xs text-muted-foreground">
          Uploads are off in demo mode — paste a link, or a bundled path like /demo/rainforest.jpg.
        </p>
      )}
    </div>
  );
}
