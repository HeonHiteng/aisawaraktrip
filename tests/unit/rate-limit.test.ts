import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    }
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });

  it("frees up capacity once the window passes", async () => {
    const key = `win:${Math.random()}`;
    expect((await rateLimit(key, 1, 20)).ok).toBe(true);
    expect((await rateLimit(key, 1, 20)).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect((await rateLimit(key, 1, 20)).ok).toBe(true);
  });
});
