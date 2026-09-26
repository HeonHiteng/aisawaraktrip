import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * The app on the REAL backend, driven like a person would use it.
 * Order matters (serial): the traveller journey creates a booking that the admin test then manages.
 * Everything this file creates is deleted in afterAll.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be provided (CI) */
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SERVICE) throw new Error("tests/e2e-real needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local)");

const svc = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const startedAt = Date.now() - 2000;
const tag = Date.now().toString(36);
const adminEmail = `e2e-admin-${tag}@example.test`;
const adminPassword = `E2e!${tag}-Pw#9`;
const tourTitle = `E2E Real Tour ${tag}`;

let bookingId = "";
let tripUrl = "";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  // users created during this run (guests + the admin) — their trips/bookings/payments cascade
  const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (new Date(u.created_at).getTime() >= startedAt && (u.is_anonymous || u.email?.startsWith("e2e-"))) {
      await svc.auth.admin.deleteUser(u.id);
    }
  }
  await svc.from("experiences").delete().ilike("title", "E2E Real Tour%");
});

async function continueAsGuest(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/); // the app opens at sign-in, not a landing page
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL(/\/home$/);
}

async function expectNoCrash(page: Page) {
  await expect(page.getByText(/Something went wrong|Application error/i)).toHaveCount(0);
}

test("traveller journey: explore → plan → refine → book → pay → review → cancel → profile → sign out", async ({ page }) => {
  await continueAsGuest(page);

  // ---- home ----
  await expect(page.getByRole("link", { name: /Start planning/i })).toBeVisible();
  await expectNoCrash(page);

  // ---- explore: catalogue from the database ----
  await page.goto("/explore");
  await expect(page.getByText("6 experiences")).toBeVisible();
  await page.getByRole("searchbox", { name: /Search experiences/i }).fill("kayak");
  await expect(page.getByText(/^1 experience$/)).toBeVisible();
  await page.getByRole("searchbox", { name: /Search experiences/i }).fill("");
  await expect(page.getByText("6 experiences")).toBeVisible();
  await page.getByRole("tab", { name: "Attractions" }).click();
  await expect(page.getByText("8 attractions")).toBeVisible();

  // ---- an experience page ----
  await page.goto("/explore/experiences/kuching-heritage-street-food-walk");
  await expect(page.getByRole("heading", { name: "Kuching Heritage & Street Food Evening Walk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Traveller reviews" })).toBeVisible();
  await expect(page.getByText("RM 150")).toBeVisible();

  // ---- plan + refine ----
  await page.goto("/plan");
  await page.getByRole("button", { name: "Generate my trip" }).click();
  await page.waitForURL(/\/trips\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  tripUrl = page.url();
  await expect(page.getByText("AI-generated")).toBeVisible();
  await page.getByRole("button", { name: "Add more food" }).click();
  await expect(page.getByText(/Edited by you/)).toBeVisible({ timeout: 30_000 });

  // the saved trip survives a reload (it really is in the database)
  await page.reload();
  await expect(page.getByText(/Edited by you/)).toBeVisible();
  await page.goto("/trips");
  await expect(page.getByRole("link", { name: /Day-by-day plan/ }).first()).toBeVisible();
  await page.goto(tripUrl);

  // ---- book from the trip ----
  await page.getByRole("link", { name: "Book", exact: true }).first().click();
  await page.waitForURL(/\/book\//);
  await page.getByLabel("Email").fill("e2e-traveller@example.test");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  bookingId = page.url().match(/checkout\/([0-9a-f-]{36})/)![1];
  await expect(page.getByText(/Total due/)).toBeVisible();
  await expect(page.getByText(/seats are held for 30 minutes/)).toBeVisible();

  // ---- pay through the (fake) gateway ----
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/checkout\/gateway/, { timeout: 60_000 });
  await page.getByRole("button", { name: "Approve payment" }).click();
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}\/result/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Payment received|trip is all booked/i })).toBeVisible();

  // ---- it shows up everywhere ----
  await page.goto("/bookings");
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await page.goto(`/bookings/${bookingId}`);
  await expect(page.getByText(/Booking confirmed/).first()).toBeVisible();
  await page.goto(tripUrl);
  await expect(page.getByText(/1 of \d+ experiences? booked|Everything's booked/)).toBeVisible();

  // ---- review (only possible because the booking is confirmed) ----
  await page.goto(`/bookings/${bookingId}`);
  await page.getByRole("link", { name: "View experience" }).click();
  await page.waitForURL(/\/explore\/experiences\//);
  await page.getByRole("radio", { name: "5 stars" }).click();
  await page.getByLabel("Your review").fill("Brilliant evening — the guide was fantastic and the food even better.");
  await page.getByRole("button", { name: "Post review" }).click();
  await expect(page.getByText("You've already reviewed this experience.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/the guide was fantastic/)).toBeVisible();

  // ---- cancel the booking (two-step confirm) ----
  await page.goto(`/bookings/${bookingId}`);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible({ timeout: 30_000 });

  // ---- a guest's profile: their real counts + the prompt to save the account ----
  await page.goto("/profile");
  await expect(page.getByText("Save your account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("link", { name: /1\s*Trip/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /1\s*Booking/ })).toBeVisible();

  // ---- sign out really signs out ----
  // two sign-out buttons exist (header icon + the profile page's); use the page's own
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
  await expectNoCrash(page);
});

test("a guest can't get into the admin area", async ({ page }) => {
  await continueAsGuest(page);
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
  await page.goto("/admin/experiences");
  await expect(page).not.toHaveURL(/\/admin/);
});

test("admin: real email login, dashboard, catalogue CRUD, bookings, users", async ({ page }) => {
  // an admin account with a real email + password (created out-of-band, then promoted)
  const { data, error } = await svc.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
  if (error || !data.user) throw new Error(`could not create the admin user: ${error?.message}`);
  await svc.from("profiles").update({ role: "admin" }).eq("id", data.user.id);

  // ---- sign in through the real form ----
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 60_000 });
  await page.goto("/profile");
  await expect(page.getByText(`Signed in with ${adminEmail}`)).toBeVisible();

  // a signed-in account edits its details, and they persist
  await page.getByLabel("Full name").fill("E2E Real Admin");
  await page.getByLabel("Phone").fill("+60 12 345 6789");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("E2E Real Admin");
  await expect(page.getByLabel("Phone")).toHaveValue("+60 12 345 6789");

  // a wrong password is refused with a message, not a crash
  await page.goto("/login");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/login/);
  // a typo in the password must not wipe the email (it used to) — and the password itself clears
  await expect(page.getByLabel("Email")).toHaveValue(adminEmail);
  await expect(page.getByLabel("Password")).toHaveValue("");

  // ---- and now properly ----
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 60_000 });

  // ---- dashboard ----
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText(/Bookings by status/)).toBeVisible();
  await expectNoCrash(page);

  // ---- create an experience through the real form (price with sen!) ----
  await page.goto("/admin/experiences/new");
  await page.getByLabel("Title").fill(tourTitle);
  await page.getByLabel("Summary").fill("Created by the real-mode end-to-end test.");
  await page.getByLabel("Description").fill("Temporary — deleted at the end of the test.");
  await page.getByLabel("Price per person (MYR)").fill("45.50");
  await page.getByLabel("Duration (minutes)").fill("90");
  await page.getByLabel("Min pax").fill("1");
  await page.getByLabel("Max pax").fill("4");
  await page.getByLabel("Meeting point").fill("Test point");
  await page.getByLabel("Start times").fill("09:00");
  await page.getByLabel("Capacity / slot").fill("4");
  await page.getByLabel("Lead time (hours)").fill("12");
  await page.getByLabel("Photos").fill("/demo/kayak.jpg");
  // category / day "chips" are labels around a hidden checkbox — click the chip, like a person would
  await page.locator("label", { hasText: /^Nature$/ }).click();
  await page.locator("label", { hasText: /^Mon$/ }).click();
  // new experiences are published by default (unticking it makes a draft, hidden from travellers)
  await expect(page.getByLabel("Published (visible to travellers)")).toBeChecked();
  await page.getByRole("button", { name: "Create experience" }).click();
  await page.waitForURL(/\/admin\/experiences$/, { timeout: 60_000 });
  await expect(page.getByText(tourTitle)).toBeVisible();

  // ---- it's live for travellers ----
  await page.goto("/explore");
  await page.getByRole("searchbox", { name: /Search experiences/i }).fill("E2E Real Tour");
  await expect(page.getByText("RM 45.50")).toBeVisible({ timeout: 30_000 });

  // ---- sold items can't be deleted, unsold ones can (two-step confirm) ----
  await page.goto("/admin/experiences");
  await page.getByText(tourTitle).click();
  await page.waitForURL(/\/admin\/experiences\/[0-9a-f-]{36}\/edit/);
  await page.getByRole("button", { name: "Delete this experience" }).click();
  await page.getByRole("button", { name: "Delete experience" }).click();
  await page.waitForURL(/\/admin\/experiences$/, { timeout: 60_000 });
  await expect(page.getByText(tourTitle)).toHaveCount(0);

  // ---- the traveller's (now cancelled) booking is visible and manageable ----
  await page.goto("/admin/bookings");
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  await expect(page.getByText(new RegExp(bookingId.slice(0, 8), "i")).first()).toBeVisible();
  await page.goto(`/admin/bookings/${bookingId}`);
  await expect(page.getByText("Update status")).toBeVisible();
  await page.getByRole("button", { name: /Mark awaiting payment/i }).click();
  await expect(page.getByText("Awaiting payment").first()).toBeVisible({ timeout: 30_000 });

  // ---- users + vendors + attractions render ----
  for (const path of ["/admin/users", "/admin/vendors", "/admin/attractions"]) {
    await page.goto(path);
    await expectNoCrash(page);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
});
