import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database";

/**
 * Photo uploads on the REAL Storage bucket: admins can upload images, nobody else can, and
 * the bucket refuses non-images and oversized files. Everything uploaded is deleted afterwards.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

// a valid 1x1 PNG
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const users: string[] = [];
const uploaded: string[] = [];
let admin: SupabaseClient<Database>;
let tourist: SupabaseClient<Database>;
const name = (ext: string) => `live-test/${crypto.randomUUID()}.${ext}`;

async function guest() {
  const client = createClient<Database>(url, anon, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`guest sign-in failed: ${error?.message}`);
  users.push(data.user.id);
  return { id: data.user.id, client };
}

beforeAll(async () => {
  const a = await guest();
  await svc.from("profiles").update({ role: "admin" }).eq("id", a.id);
  admin = a.client;
  tourist = (await guest()).client;
});

afterAll(async () => {
  if (uploaded.length) await svc.storage.from("catalogue").remove(uploaded);
  for (const id of users) await svc.auth.admin.deleteUser(id);
});

describe("catalogue photo uploads (live)", () => {
  it("an admin can upload an image, and it is publicly readable", async () => {
    const path = name("png");
    const { error } = await admin.storage.from("catalogue").upload(path, PNG, { contentType: "image/png" });
    expect(error).toBeNull();
    uploaded.push(path);

    const publicUrl = admin.storage.from("catalogue").getPublicUrl(path).data.publicUrl;
    const res = await fetch(publicUrl); // no auth header: public
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("a tourist cannot upload to the catalogue", async () => {
    const { error } = await tourist.storage.from("catalogue").upload(name("png"), PNG, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("an anonymous visitor cannot upload either", async () => {
    const nobody = createClient<Database>(url, anon, opts);
    const { error } = await nobody.storage.from("catalogue").upload(name("png"), PNG, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("the bucket refuses SVG and other non-images, even from an admin", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const a = await admin.storage.from("catalogue").upload(name("svg"), svg, { contentType: "image/svg+xml" });
    expect(a.error).not.toBeNull();
    const b = await admin.storage.from("catalogue").upload(name("html"), svg, { contentType: "text/html" });
    expect(b.error).not.toBeNull();
  });

  it("the bucket refuses a file over 5 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    const path = name("png");
    const { error } = await admin.storage.from("catalogue").upload(path, big, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("a tourist cannot delete an admin's photo", async () => {
    const path = name("png");
    await admin.storage.from("catalogue").upload(path, PNG, { contentType: "image/png" });
    uploaded.push(path);
    await tourist.storage.from("catalogue").remove([path]); // RLS hides the object: removes nothing
    const { data } = await svc.storage.from("catalogue").list("live-test");
    expect(data?.some((f) => path.endsWith(f.name))).toBe(true);
  });
});
