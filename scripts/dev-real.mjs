// `npm run dev:real` — dev server with demo mode OFF (real Supabase from .env.local).
// Env set here wins over .env.local, so no file edits are needed to switch modes.
//
// Some antivirus products (e.g. Avast Web Shield) re-sign HTTPS traffic with their own
// root CA and only tell the Node processes they monitor about it. A dev server started
// by another tool then fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. If that's you, set
// DEV_EXTRA_CA_CERTS in .env.local to that root CA's .pem file — verification stays ON,
// Node just also trusts that one CA. (Never use NODE_TLS_REJECT_UNAUTHORIZED=0.)
import { spawn } from "node:child_process";

try {
  process.loadEnvFile(".env.local"); // never overrides variables that are already set
} catch {
  /* no .env.local — fine */
}

const env = { ...process.env, NEXT_PUBLIC_DEMO_MODE: "false" };
if (!env.NODE_EXTRA_CA_CERTS && env.DEV_EXTRA_CA_CERTS) {
  env.NODE_EXTRA_CA_CERTS = env.DEV_EXTRA_CA_CERTS;
}

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
