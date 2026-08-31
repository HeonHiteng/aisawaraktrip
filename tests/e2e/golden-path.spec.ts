import { expect, test } from "@playwright/test";

/**
 * The V1 definition of done, end to end (demo mode):
 * guest -> plan a trip -> AI itinerary -> refine -> book -> pay ->
 * confirmation -> My Bookings -> admin sees & manages the booking.
 */
test("golden path: plan, book, pay, admin", async ({ page }) => {
  // --- sign in as guest -> home ---
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/, { timeout: 15_000 });

  // --- open the planner ---
  await page.getByRole("link", { name: /Start planning/i }).click();
  await page.waitForURL(/\/plan$/);
  await expect(page.getByRole("heading", { name: "AI Trip Planner" })).toBeVisible();

  // --- generate an itinerary (form defaults are valid) ---
  await page.getByRole("button", { name: "Generate my trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9]+$/, { timeout: 20_000 });
  await expect(page.getByText("AI-generated")).toBeVisible();
  await expect(page.getByText("Refine with AI")).toBeVisible();

  // --- refine it ---
  await page.getByRole("button", { name: "Make it cheaper" }).click();
  await expect(page.getByText(/Edited by you|v2/)).toBeVisible({
    timeout: 15_000,
  });

  // --- book the first bookable item ---
  await page.getByRole("link", { name: "Book" }).first().click();
  await page.waitForURL(/\/book\/[a-z-]+/);
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL(/\/checkout\//, { timeout: 15_000 });

  // --- checkout -> mock gateway -> approve ---
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/checkout\/gateway/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Approve payment" }).click();

  // --- result -> confirmed ---
  await page.waitForURL(/\/checkout\/[a-z0-9]+\/result/, { timeout: 15_000 });
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
  await page.waitForURL(/\/admin/, { timeout: 15_000 });

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
  await page.waitForURL(/\/home$/, { timeout: 15_000 });

  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});
