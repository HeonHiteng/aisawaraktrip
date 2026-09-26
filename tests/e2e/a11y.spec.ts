import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility check (axe, WCAG 2 A/AA) on the main screens, in demo mode.
 * axe catches roughly a third of real issues (contrast, missing names, bad ARIA, landmarks);
 * it doesn't replace trying the app with a screen reader.
 */

/** Scan a screen; returns a readable list of problems (empty = clean). */
async function scan(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations.map(
    (v) =>
      `${path}: ${v.id} (${v.impact}) — ${v.help}` +
      v.nodes
        .slice(0, 3)
        .map((n) => "\n    " + n.target.join(" ") + "\n      " + (n.failureSummary?.split("\n")[1] ?? ""))
        .join(""),
  );
}

async function scanAll(page: Page, paths: string[]) {
  const problems: string[] = [];
  for (const path of paths) problems.push(...(await scan(page, path)));
  expect(problems, problems.join("\n")).toEqual([]);
}

test("public and sign-in screens have no detectable accessibility violations", async ({ page }) => {
  await scanAll(page, ["/login", "/register", "/privacy", "/terms", "/delete-account"]);
});

test("the traveller app's main screens have no detectable accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
  await scanAll(page, [
    "/home",
    "/explore",
    "/explore?tab=attractions",
    "/explore?tab=food",
    "/explore/experiences/kuching-heritage-street-food-walk",
    "/plan",
    "/trips",
    "/bookings",
    "/profile",
  ]);
});

test("the admin screens have no detectable accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
  await page.getByRole("button", { name: "Admin" }).click(); // demo persona switch
  await page.waitForURL(/\/admin/);
  await scanAll(page, [
    "/admin",
    "/admin/experiences",
    "/admin/experiences/new",
    "/admin/attractions",
    "/admin/eateries",
    "/admin/eateries/new",
    "/admin/vendors",
    "/admin/vendors/new",
    "/admin/bookings",
    "/admin/users",
  ]);
});
