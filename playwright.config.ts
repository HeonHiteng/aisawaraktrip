import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the app in demo mode (no Supabase / API keys needed).
 * `npm run test:e2e`
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Never reuse: a server already on :3000 may be `dev:real`, and this suite would then
    // create guests and trips in the REAL Supabase project. Stop it first (fails loudly if busy).
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_DEMO_MODE: "true" },
  },
});
