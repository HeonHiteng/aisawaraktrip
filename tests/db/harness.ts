import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Runs the REAL migrations + seed on an in-process Postgres (PGlite, WASM) so
 * schema and RLS are tested without Docker or a Supabase project.
 *
 * Supabase-provided pieces (roles, `auth`, `storage`) are stubbed to match how
 * Supabase behaves: `auth.uid()` reads the JWT sub from a request setting, and
 * new tables in `public` are granted to anon/authenticated/service_role by
 * default — so a policy or REVOKE that only *looks* right fails here.
 *
 * This is not a substitute for a smoke test on the real project (GoTrue,
 * PostgREST, and Storage are not exercised).
 */

const ROOT = join(__dirname, "..", "..", "supabase");

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    is_anonymous boolean not null default false
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
  $$;

  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
`;

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);

  const files = readdirSync(join(ROOT, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(ROOT, "migrations", f), "utf8"));
    } catch (e) {
      throw new Error(`migration ${f} failed: ${(e as Error).message}`);
    }
  }
  await db.exec(readFileSync(join(ROOT, "seed.sql"), "utf8"));
  return db;
}

export type Actor =
  | { role: "anon" }
  | { role: "authenticated"; sub: string }
  | { role: "service" };

/**
 * Run one statement as a Supabase request would: inside a transaction, as the
 * given DB role, with the JWT `sub` set. `service` = service-role key (bypasses
 * RLS, `auth.uid()` is null). Always rolls the role back afterwards.
 */
export async function as<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db.transaction(async (tx) => {
    const role = actor.role === "service" ? "service_role" : actor.role;
    await tx.exec(`set local role ${role}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      actor.role === "authenticated" ? actor.sub : "",
    ]);
    const res = await tx.query<T>(sql, params);
    return res.rows;
  });
}

/** Insert an auth user as the superuser; the on_auth_user_created trigger makes the profile. */
export async function createUser(
  db: PGlite,
  name: string,
  opts: { admin?: boolean; anonymous?: boolean } = {},
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data, is_anonymous)
     values ($1, $2::jsonb, $3) returning id`,
    [
      opts.anonymous ? null : `${name.toLowerCase()}@example.test`,
      JSON.stringify({ full_name: name }),
      !!opts.anonymous,
    ],
  );
  const id = r.rows[0].id;
  if (opts.admin) {
    await db.query(`update public.profiles set role = 'admin' where id = $1`, [id]);
  }
  return id;
}
