// Force REAL mode before any app module reads its env at import time.
// (process.loadEnvFile never overrides variables that are already set.)
process.env.NEXT_PUBLIC_DEMO_MODE = "false";
try {
  process.loadEnvFile(".env.local");
} catch {
  throw new Error("tests/live needs .env.local with the Supabase URL and keys");
}
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (!process.env[k]) throw new Error(`${k} is not set in .env.local`);
}
