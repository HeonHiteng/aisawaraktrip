import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

let client: SupabaseClient<Database> | undefined;

/**
 * Anonymous Supabase client for PUBLIC reads (catalogue, reviews). No cookies,
 * no session — RLS applies as `anon`, so it only ever sees published rows.
 * Unlike `createClient()` from ./server it works outside a request (sitemap,
 * static params, tests). Use the cookie client for anything user-specific.
 */
export function createPublicClient(): SupabaseClient<Database> {
  client ??= createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
