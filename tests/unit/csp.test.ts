import { describe, expect, it } from "vitest";
import { buildCsp, newNonce } from "@/lib/csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", isDev: false, supabaseHost: "proj.supabase.co" });

  it("only runs our scripts or ones carrying this request's nonce — never inline", () => {
    const script = directive(prod, "script-src");
    expect(script).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(script).not.toContain("unsafe-eval");
  });

  it("allows eval only in development (React debugging)", () => {
    expect(directive(buildCsp({ nonce: "n", isDev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("connects to this site and Supabase only", () => {
    expect(directive(prod, "connect-src")).toBe("connect-src 'self' https://proj.supabase.co wss://proj.supabase.co");
    expect(directive(buildCsp({ nonce: "n", isDev: false }), "connect-src")).toBe("connect-src 'self'");
  });

  it("blocks framing, plugins, base-tag and cross-site form posts", () => {
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(prod).toContain(d);
    }
  });

  it("upgrades insecure requests in production only", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp({ nonce: "n", isDev: true })).not.toContain("upgrade-insecure-requests");
  });

  it("makes a different nonce every time", () => {
    const seen = new Set(Array.from({ length: 50 }, newNonce));
    expect(seen.size).toBe(50);
    for (const n of seen) expect(n).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
  });
});
