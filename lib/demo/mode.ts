import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Demo mode: the whole app runs on local fixture data with a fake session,
 * no Supabase, nothing persisted. Useful for building/reviewing UI before
 * the backend is wired up.
 *
 * ON when NEXT_PUBLIC_DEMO_MODE=true, OR whenever Supabase isn't configured.
 * Force it OFF with NEXT_PUBLIC_DEMO_MODE=false.
 */
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  (process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && !isSupabaseConfigured);
