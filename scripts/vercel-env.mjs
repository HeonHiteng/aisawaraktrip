// Push the production environment variables to Vercel from .env.local without ever
// printing a value: `node scripts/vercel-env.mjs` (needs `vercel login` + `vercel link`).
//
// Deliberately NOT sent: dev-only settings (DEV_EXTRA_CA_CERTS, ALLOWED_DEV_ORIGINS,
// CAP_SERVER_URL) and VERCEL_OIDC_TOKEN (Vercel provides its own at runtime).
import { spawnSync } from "node:child_process";

process.loadEnvFile(".env.local");
const env = process.env;

// name -> [value, sensitive?]. Public values are inlined into the browser bundle anyway.
const vars = {
  NEXT_PUBLIC_DEMO_MODE: ["false", false],
  NEXT_PUBLIC_SUPABASE_URL: [env.NEXT_PUBLIC_SUPABASE_URL, false],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: [env.NEXT_PUBLIC_SUPABASE_ANON_KEY, false],
  SUPABASE_SERVICE_ROLE_KEY: [env.SUPABASE_SERVICE_ROLE_KEY, true],
  // Staging: there is no real payment provider yet. The mock gateway lets the traveller pick
  // "approve", so lib/payments refuses to run it in production unless this is set explicitly.
  PAYMENT_PROVIDER: ["mock", false],
  ALLOW_MOCK_PAYMENTS: ["true", false],
};

let failed = 0;
for (const [name, [value, sensitive]] of Object.entries(vars)) {
  if (!value) {
    console.error(`✗ ${name}: not set in .env.local`);
    failed++;
    continue;
  }
  const args = ["--yes", "vercel@latest", "env", "add", name, "production", "--force", "--yes"];
  if (sensitive) args.push("--sensitive");
  // value goes through stdin, never the command line (which other processes can read)
  const r = spawnSync("npx", args, {
    input: value,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const ok = r.status === 0;
  console.log(`${ok ? "✓" : "✗"} ${name}${sensitive ? " (sensitive)" : ""}`);
  if (!ok) {
    failed++;
    console.error((r.stderr || r.stdout || "").split("\n").filter((l) => !/npm warn/.test(l)).slice(-4).join("\n"));
  }
}
process.exit(failed ? 1 : 0);
