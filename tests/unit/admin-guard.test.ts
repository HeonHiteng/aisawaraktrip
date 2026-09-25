import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Admin writes run under the admin's own session, so the database is the real
 * lock — but the app-level check must never silently disappear either. This is
 * a static guard: every exported Server Action under app/admin calls
 * requireAdmin() first, and the admin layout does too.
 */

const ROOT = join(__dirname, "..", "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const actionFiles = walk(join(ROOT, "app", "admin")).filter((f) => /actions\.ts$/.test(f));

describe("admin server actions", () => {
  it("finds the action files (so this guard can't pass vacuously)", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of actionFiles) {
    const rel = file.slice(ROOT.length + 1);
    it(`${rel}: every exported action calls requireAdmin() before anything else`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/^"use server";/m);
      const chunks = src.split(/^export async function /m).slice(1);
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        const name = chunk.slice(0, chunk.indexOf("("));
        // the first statement of the body
        const body = chunk.slice(chunk.indexOf("{") + 1).trimStart();
        expect(body.startsWith("await requireAdmin();"), `${name} must start with await requireAdmin()`).toBe(true);
      }
    });
  }

  it("the admin layout itself requires an admin", () => {
    const layout = readFileSync(join(ROOT, "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toMatch(/requireAdmin\(\)/);
  });
});
