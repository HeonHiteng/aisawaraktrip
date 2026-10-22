import { expect, test, type Page } from "@playwright/test";

/** The planner's guided path (demo mode): 4 quick questions → "anything else" box → the form, filled in. */

async function guest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
}

test("guided planner: 4 quick questions, then an extra box, then the filled-in form", async ({ page }) => {
  await guest(page);
  await page.goto("/plan");
  await page.getByRole("button", { name: /Answer 4 quick questions/ }).click();
  const next = page.getByRole("button", { name: "Next", exact: true });

  await expect(page.getByRole("heading", { name: "When are you going?" })).toBeVisible();
  await page.getByRole("button", { name: "4 days" }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Who's coming?" })).toBeVisible();
  await page.getByRole("button", { name: "Family" }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "What are you into?" })).toBeVisible();
  await page.getByRole("button", { name: "Wildlife" }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "How full should your days be?" })).toBeVisible();
  await page.getByRole("button", { name: /Relaxed/ }).click();
  await next.click();

  // the free-text box for anything extra, with one-tap additions
  await expect(page.getByRole("heading", { name: "Anything else we should know?" })).toBeVisible();
  await page.getByRole("button", { name: "No seafood" }).click();
  await expect(page.getByLabel("Anything else for your trip")).toHaveValue("No seafood");
  await page.getByRole("button", { name: "Review my trip" }).click();

  // back on the form: the answers are in the essentials, the extra text is the trip sentence
  await expect(page.getByLabel("Describe your trip")).toHaveValue(/No seafood/);
  await expect(page.getByRole("button", { name: /Dates .*3 nights/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Travellers 2 adults, 1 child · Family/ })).toBeVisible();

  await page.getByRole("button", { name: "Generate my trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9-]+$/, { timeout: 30_000 });
  await expect(page.getByText("AI-generated")).toBeVisible();
});

test("the guided path can be left at any step without losing the form", async ({ page }) => {
  await guest(page);
  await page.goto("/plan");
  await page.getByRole("button", { name: /Answer 4 quick questions/ }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Generate my trip" })).toBeVisible();
});
