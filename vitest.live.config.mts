import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * LIVE integration tests: the real domain code (DEMO_MODE off) against the real
 * Supabase project in .env.local. Needs network + keys, so it is NOT part of
 * `npm test`. Run with `npm run test:live`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/live/**/*.live.test.ts"],
    setupFiles: ["tests/live/setup.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
