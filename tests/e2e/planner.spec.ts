import { expect, test, type Page } from "@playwright/test";

/**
 * The planner flow (demo mode): it opens on 4 quick questions → an "anything else" box → a summary
 * of the answers (each editable) → Generate, which hands everything to the AI planner.
 */

async function guest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
}

/** One line of the summary, found by its label ("When", "Who", ...). */
const summaryRow = (page: Page, label: string) =>
  page.locator("dl > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) });

test("plan a trip: questions, the extra box, a summary of the answers, then generate", async ({ page }) => {
  await guest(page);
  // "Plan your trip with AI" on Home opens straight on the first question
  await page.getByRole("link", { name: /Start planning/ }).click();
  await page.waitForURL(/\/plan$/);
  const next = page.getByRole("button", { name: "Next", exact: true });

  await expect(page.getByRole("heading", { name: "When are you going?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
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

  await expect(page.getByRole("heading", { name: "Anything else we should know?" })).toBeVisible();
  await page.getByRole("button", { name: "No seafood" }).click();
  await expect(page.getByLabel("Anything else for your trip")).toHaveValue("No seafood");
  await page.getByRole("button", { name: "Review my trip" }).click();

  // the summary shows every answer
  await expect(page.getByRole("heading", { name: "Ready to plan?" })).toBeVisible();
  await expect(summaryRow(page, "When")).toContainText("3 nights");
  await expect(summaryRow(page, "Who")).toContainText("2 adults, 1 child · Family");
  await expect(summaryRow(page, "Into")).toContainText("Wildlife");
  await expect(summaryRow(page, "Pace and budget")).toContainText("Relaxed pace");
  await expect(summaryRow(page, "Anything else")).toContainText("No seafood");

  // editing one answer returns straight to the summary
  await page.getByRole("button", { name: "Edit who" }).click();
  await expect(page.getByRole("heading", { name: "Who's coming?" })).toBeVisible();
  await page.getByRole("button", { name: "Couple" }).click();
  await page.getByRole("button", { name: "Back to summary" }).click();
  await expect(summaryRow(page, "Who")).toContainText("2 adults · Couple");

  await page.getByRole("button", { name: "Generate my trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9-]+$/, { timeout: 30_000 });
  await expect(page.getByText("AI-generated")).toBeVisible();
});

test("a Home quick start lands on the summary, already filled in; More options opens the full form", async ({ page }) => {
  await guest(page);
  await page.getByRole("link", { name: "Nature with kids" }).click();
  await page.waitForURL(/\/plan\?q=/);
  await expect(page.getByRole("heading", { name: "Ready to plan?" })).toBeVisible();
  await expect(summaryRow(page, "Anything else")).toContainText("Weekend nature escape with kids");
  await expect(page.getByRole("button", { name: "Generate my trip" })).toBeVisible();

  await page.getByRole("button", { name: /More options/ }).click();
  await expect(page.getByLabel("Describe your trip")).toHaveValue("Weekend nature escape with kids");
  await page.getByRole("button", { name: "Back to summary" }).click();
  await expect(page.getByRole("heading", { name: "Ready to plan?" })).toBeVisible();
});
