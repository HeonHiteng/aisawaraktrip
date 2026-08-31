import "server-only";
import { headers } from "next/headers";

/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * Good enough for a single-instance MVP. For production / multi-instance,
 * swap the body for `@upstash/ratelimit` when UPSTASH_REDIS_REST_URL is set
 * (same signature) — see the TODO below.
 */
const buckets = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  // TODO(phase-9): if process.env.UPSTASH_REDIS_REST_URL -> use @upstash/ratelimit

  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client identifier for per-IP limits (falls back to a constant). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}
