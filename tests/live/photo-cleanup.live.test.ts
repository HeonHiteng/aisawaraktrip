import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";

/**
 * Photos uploaded to Storage are deleted when nothing uses them any more — on the REAL bucket:
 * replaced or removed on save, deleted with their listing, but never while another record still
 * points at the file, and never for a pasted external link.
 */

const state = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.current }));

import { adminDeleteAttraction, adminSaveAttraction } from "@/lib/domain/admin";
import { listLocations } from "@/lib/domain/catalogue";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);
const PNG = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
);

const tag = Date.now().toString(36);
const users: string[] = [];
const attractionIds: string[] = [];
const uploaded: string[] = [];
let admin: SupabaseClient<Database>;
let locationId = "";

async function upload(name: string): Promise<{ path: string; url: string }> {
  const path = `live-test/${tag}-${name}.png`;
  const { error } = await admin.storage.from("catalogue").upload(path, PNG, { contentType: "image/png" });
  if (error) throw new Error(error.message);
  uploaded.push(path);
  return { path, url: admin.storage.from("catalogue").getPublicUrl(path).data.publicUrl };
}
const exists = async (path: string) => {
  const { data } = await svc.storage.from("catalogue").list("live-test", { search: path.split("/")[1] });
  return (data ?? []).some((f) => path.endsWith(f.name));
};
const form = (name: string, images: string[], id?: string) => ({
  id, name, summary: "", description: "", locationId, address: "", avgVisitMinutes: 60, priceMin: 0, priceMax: 0,
  isFree: true, categories: ["heritage" as const], tips: "", images: images.join("\n"), isPublished: false,
});
async function makeAttraction(name: string, images: string[]) {
  const a = await adminSaveAttraction(form(name, images));
  attractionIds.push(a.id);
  return a;
}

beforeAll(async () => {
  admin = createClient<Database>(url, anon, opts);
  const { data, error } = await admin.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  await svc.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  state.current = admin;
  locationId = (await listLocations())[0].id;
});

afterAll(async () => {
  state.current = admin;
  for (const id of attractionIds) await adminDeleteAttraction(id).catch(() => {});
  if (uploaded.length) await svc.storage.from("catalogue").remove(uploaded);
  for (const id of users) await svc.auth.admin.deleteUser(id);
});

describe("unused photos are removed from storage (live)", () => {
  it("removing or replacing a photo on save deletes the old file, keeps the new one", async () => {
    const a1 = await upload("a1");
    const a2 = await upload("a2");
    const item = await makeAttraction(`Photo Test ${tag}`, [a1.url, a2.url]);
    expect(await exists(a1.path)).toBe(true);

    // drop a1, keep a2
    await adminSaveAttraction(form(item.name, [a2.url], item.id));
    expect(await exists(a1.path)).toBe(false);
    expect(await exists(a2.path)).toBe(true);

    // replace a2 with an external link: a2 goes, the link is never touched
    await adminSaveAttraction(form(item.name, ["https://images.unsplash.com/photo-x.jpg"], item.id));
    expect(await exists(a2.path)).toBe(false);
  });

  it("deleting the listing deletes its photos", async () => {
    const p = await upload("gone");
    const item = await makeAttraction(`Photo Delete ${tag}`, [p.url]);
    await adminDeleteAttraction(item.id);
    expect(await exists(p.path)).toBe(false);
  });

  it("a file another listing still uses is kept", async () => {
    const shared = await upload("shared");
    const one = await makeAttraction(`Photo Shared A ${tag}`, [shared.url]);
    const two = await makeAttraction(`Photo Shared B ${tag}`, [shared.url]);

    await adminSaveAttraction(form(one.name, [], one.id)); // A lets go of it...
    expect(await exists(shared.path)).toBe(true); // ...B still shows it
    await adminDeleteAttraction(two.id); // B goes: now nothing uses it
    expect(await exists(shared.path)).toBe(false);
  });
});
