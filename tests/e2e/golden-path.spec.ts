import { expect, test } from "@playwright/test";

/**
 * The V1 definition of done, end to end (demo mode):
 * guest -> plan a trip -> AI itinerary -> refine -> book -> pay ->
 * confirmation -> My Bookings -> admin sees & manages the booking.
 */
test("golden path: plan, book, pay, admin", async ({ page }) => {
  // --- sign in as guest ---
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { name: "AI Trip Planner" })).toBeVisible();

  // --- generate an itinerary (form defaults are valid) ---
  await page.getByRole("button", { name: "Generate my trip" }).click();
  await expect(page).toHaveURL(/\/trips\/[a-z0-9]+$/);
  await expect(page.getByText(/Day 1/)).toBeVisible();
  await expect(page.getByText("AI-generated")).toBeVisible();

  // --- refine it ---
  await page.getByRole("button", { name: "Make it cheaper" }).click();
  await expect(page.getByText(/Edited by you|v2/)).toBeVisible();

  // --- book the first bookable item ---
  await page.getByRole("link", { name: "Book" }).first().click();
  await expect(page).toHaveURL(/\/book\/[a-z-]+/);
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL(/\/checkout\//);

  // --- checkout -> mock gateway -> approve ---
  await expect(page).toHaveURL(/\/checkout\/[a-z0-9]+(\?|$)/);
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/\/checkout\/gateway/);
  await page.getByRole("button", { name: "Approve payment" }).click();

  // --- result -> confirmed ---
  await expect(page).toHaveURL(/\/checkout\/[a-z0-9]+\/result/);
  await expect(
    page.getByRole("heading", { name: "Payment received" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "View booking" }).click();
  await page.waitForURL(/\/bookings\/[a-z0-9]+$/);
  await expect(page.getByText(/Booking confirmed/).first()).toBeVisible();
  const bookingId = page.url().split("/bookings/")[1]!;

  // --- shows in My Bookings ---
  await page.goto("/bookings");
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  // --- admin can see and manage it ---
  await page.getByRole("button", { name: "Admin" }).click();
  await page.waitForURL(/\/admin/);

  await page.goto("/admin/bookings");
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: new RegExp(bookingId, "i") }),
  ).toBeVisible();

  await page.goto(`/admin/bookings/${bookingId}`);
  await expect(page.getByText("Update status")).toBeVisible();
  await page.getByRole("button", { name: /Mark completed/i }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();
});

test("guest cannot reach the admin dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/plan$/);

  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});
