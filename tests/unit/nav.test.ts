import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/nav";

describe("safeNextPath", () => {
  it("keeps a normal same-site path", () => {
    expect(safeNextPath("/plan")).toBe("/plan");
    expect(safeNextPath("/trips/abc123")).toBe("/trips/abc123");
    expect(safeNextPath("/book/exp-cruise?trip=t1")).toBe(
      "/book/exp-cruise?trip=t1",
    );
  });

  it("falls back for missing / empty input", () => {
    expect(safeNextPath(null)).toBe("/home");
    expect(safeNextPath(undefined)).toBe("/home");
    expect(safeNextPath("")).toBe("/home");
    expect(safeNextPath("  ", "/x")).toBe("/x");
  });

  it("rejects off-site and protocol-relative targets (open redirect)", () => {
    expect(safeNextPath("//evil.com")).toBe("/home");
    expect(safeNextPath("https://evil.com")).toBe("/home");
    expect(safeNextPath("http://evil.com")).toBe("/home");
    expect(safeNextPath("/\\evil.com")).toBe("/home");
    expect(safeNextPath("evil.com")).toBe("/home");
    expect(safeNextPath("javascript:alert(1)")).toBe("/home");
  });

  it("never bounces back into the auth screens", () => {
    expect(safeNextPath("/login")).toBe("/home");
    expect(safeNextPath("/register")).toBe("/home");
    expect(safeNextPath("/login?next=/plan")).toBe("/home");
  });
});
