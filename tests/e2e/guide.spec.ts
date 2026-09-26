import { expect, test, type Page } from "@playwright/test";

/** The local food guide, the must-see badge, guide meals in a plan, and food-guide admin (demo mode). */

async function guest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
}

test("Explore → Food: filter by city and dish, and open a place in Maps", async ({ page }) => {
  await guest(page);
  await page.goto("/explore");
  await page.getByRole("tab", { name: "Food" }).click();
  await expect(page.getByText("30 places to eat")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mui Xin Laksa" })).toBeVisible();

  await page.getByRole("group", { name: "City" }).getByRole("button", { name: "Miri" }).click();
  await expect(page.getByText("7 places to eat")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mui Xin Laksa" })).toHaveCount(0);

  await page.getByRole("group", { name: "Dish" }).getByRole("button", { name: "Sarawak laksa" }).click();
  await expect(page.getByText("3 places to eat")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kebaya Story" })).toBeVisible();

  // the Maps link is a real external link in a new tab, safely
  const link = page.getByRole("link", { name: /Open in Maps.*Kebaya Story/ });
  await expect(link).toHaveAttribute("href", /^https:\/\/maps\.app\.goo\.gl\//);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  // search works on this tab too
  await page.getByRole("group", { name: "City" }).getByRole("button", { name: "All cities" }).click();
  await expect(page.getByText("7 places to eat")).toBeVisible(); // laksa in every city
  await page.getByRole("group", { name: "Dish" }).getByRole("button", { name: "Sarawak laksa" }).click(); // off
  await expect(page.getByText("30 places to eat")).toBeVisible();
  await page.getByRole("searchbox", { name: /Search/ }).fill("lepau");
  await expect(page.getByText("1 place to eat")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lepau" })).toBeVisible();
});

test("must-see attractions carry a badge and come first", async ({ page }) => {
  await guest(page);
  await page.goto("/explore?tab=attractions");
  const cards = page.locator("a[href^='/explore/attractions/']");
  await expect(cards.first()).toContainText("Must-see");
  await expect(cards.first()).toContainText("Semenggoh");
  await page.goto("/explore/attractions/semenggoh-nature-reserve");
  await expect(page.getByText("Must-see")).toBeVisible();
  // a regular place has no badge
  await page.goto("/explore/attractions/fort-margherita");
  await expect(page.getByText("Must-see")).toHaveCount(0);
});

test("a generated plan names real places from the guide for meals", async ({ page }) => {
  await guest(page);
  await page.goto("/plan");
  await page.getByRole("button", { name: "Generate my trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9]+$/, { timeout: 30_000 });
  await expect(page.getByText(/(Lunch|Dinner) at /).first()).toBeVisible();
  await expect(page.getByText("From our local food guide.").first()).toBeVisible();
});

test("admin: add an eatery to the food guide, see it on Explore, then unpublish and delete it", async ({ page }) => {
  await guest(page);
  await page.getByRole("button", { name: "Admin" }).click(); // demo persona switch
  await page.waitForURL(/\/admin/);
  await page.goto("/admin/eateries");
  await expect(page.getByRole("heading", { name: "Food guide" })).toBeVisible();
  await expect(page.getByText("Mui Xin Laksa")).toBeVisible();

  await page.getByRole("link", { name: "New" }).click();
  await page.getByLabel("Name").fill("E2E Kopitiam");
  await page.getByLabel("City").selectOption("Sibu");
  await page.getByLabel("Price").selectOption("1");
  await page.locator("label", { hasText: /^Kolo mee$/ }).click();
  await page.getByLabel("Google Maps link").fill("https://maps.app.goo.gl/e2e");
  await page.getByLabel("Note").fill("Added by the e2e test.");
  await page.getByRole("button", { name: "Create eatery" }).click();
  await page.waitForURL(/\/admin\/eateries$/);
  await expect(page.getByText("E2E Kopitiam")).toBeVisible();

  await page.goto("/explore?tab=food&city=Sibu");
  await expect(page.getByRole("heading", { name: "E2E Kopitiam" })).toBeVisible();
  await expect(page.getByText("Added by the e2e test.")).toBeVisible();

  // unpublish -> hidden from travellers
  await page.goto("/admin/eateries");
  await page.getByRole("row", { name: /E2E Kopitiam/ }).getByRole("button", { name: "Live" }).click();
  await expect(page.getByRole("row", { name: /E2E Kopitiam/ }).getByRole("button", { name: "Draft" })).toBeVisible();
  await page.goto("/explore?tab=food&city=Sibu");
  await expect(page.getByRole("heading", { name: "E2E Kopitiam" })).toHaveCount(0);

  // delete (two-step)
  await page.goto("/admin/eateries");
  await page.getByRole("link", { name: "Edit E2E Kopitiam" }).click();
  await page.getByRole("button", { name: "Delete this eatery" }).click();
  await page.getByRole("button", { name: "Delete eatery" }).click();
  await page.waitForURL(/\/admin\/eateries$/);
  await expect(page.getByText("E2E Kopitiam")).toHaveCount(0);
});

test("admin: an attraction can be given a must-see rank", async ({ page }) => {
  await guest(page);
  await page.getByRole("button", { name: "Admin" }).click();
  await page.waitForURL(/\/admin/);
  await page.goto("/admin/attractions");
  await page.getByRole("link", { name: "Edit Fort Margherita" }).first().click();
  await page.getByLabel("Must-see rank").fill("2");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(/\/admin\/attractions$/);
  await page.goto("/explore/attractions/fort-margherita");
  await expect(page.getByText("Must-see")).toBeVisible();
});
