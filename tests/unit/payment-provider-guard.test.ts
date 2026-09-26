import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The mock gateway lets the traveller pick "approve", so it must never sit in
 * front of a real database in production unless someone opted in explicitly.
 */

async function provider(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, "");
    else vi.stubEnv(k, v);
  }
  const { getPaymentProvider } = await import("@/lib/payments");
  return getPaymentProvider();
}

beforeEach(() => {
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const REAL_DB = {
  NEXT_PUBLIC_DEMO_MODE: "false",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "k",
};

// Each case re-imports the payment modules from cold (vi.resetModules), which is fast alone
// (~1s) but can exceed the 5s default when the whole suite is transforming in parallel.
describe("mock payment provider guard", { timeout: 30_000 }, () => {
  it("refuses to run in production against a real database", async () => {
    await expect(provider({ ...REAL_DB, NODE_ENV: "production", PAYMENT_PROVIDER: "mock" })).rejects.toThrow(/not allowed in production/);
    await expect(provider({ ...REAL_DB, NODE_ENV: "production", PAYMENT_PROVIDER: "" })).rejects.toThrow(/not allowed in production/);
  });

  it("can be allowed explicitly (staging soft-launch)", async () => {
    const p = await provider({ ...REAL_DB, NODE_ENV: "production", PAYMENT_PROVIDER: "mock", ALLOW_MOCK_PAYMENTS: "true" });
    expect(p.name).toBe("mock");
  });

  it("is fine for a demo deployment (no real data behind it) and for dev/test", async () => {
    expect((await provider({ NEXT_PUBLIC_DEMO_MODE: "true", NODE_ENV: "production", PAYMENT_PROVIDER: "mock" })).name).toBe("mock");
    expect((await provider({ ...REAL_DB, NODE_ENV: "development", PAYMENT_PROVIDER: "mock" })).name).toBe("mock");
  });
});
