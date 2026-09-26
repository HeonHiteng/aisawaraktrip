import { defineConfig, devices } from "@playwright/test";

/**
 * "Does the app actually work?" — a browser drives the app on the REAL Supabase backend
 * (demo mode OFF): real guest sessions, real database, real SQL functions.
 *
 *   npm run test:e2e:real                       # starts its own real-mode dev server on :3100
 *   E2E_BASE_URL=https://… npm run test:e2e:real  # or point it at a deployment
 *
 * Needs .env.local (Supabase URL + keys). It creates users / bookings / a catalogue item
 * and deletes them afterwards. Not part of `npm test` (network + real data).
 */
const base = process.env.E2E_BASE_URL;
const local = "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e-real",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: base ?? local,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: base
    ? undefined
    : {
        command: "npm run dev:real -- -p 3100",
        url: local,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
