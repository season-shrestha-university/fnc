// e2e/events-list.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL = process.env.TEST_VOLUNTEER_EMAIL;
const VOLUNTEER_PASSWORD = process.env.TEST_VOLUNTEER_PASSWORD;

if (!VOLUNTEER_EMAIL || !VOLUNTEER_PASSWORD) {
  throw new Error(
    "Missing TEST_VOLUNTEER_EMAIL or TEST_VOLUNTEER_PASSWORD in .env.local",
  );
}

test.describe("Events Overview from Sidebar (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("opens sidebar, navigates to Events, and displays event metrics", async ({
    page,
  }) => {
    // 1. If mobile hamburger button is visible, click it to expand the sidebar menu
    const menuToggle = page.getByRole("button", { name: /open menu/i });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }

    // 2. Click "Events" inside the sidebar navigation
    const eventsNavLink = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: /^events/i });
    await expect(eventsNavLink).toBeVisible();
    await eventsNavLink.click();

    // 3. Confirm the Events overview is visible.
    await expect(
      page.getByRole("heading", { level: 1, name: /^events$/i }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /search events/i })).toBeVisible();

    const eventCard = page.locator('[data-testid^="event-item-"]').first();
    if (await eventCard.count()) {
      await expect(eventCard.getByRole("heading", { level: 2 })).not.toBeEmpty();
      await expect(eventCard.locator('[data-testid="event-date"]')).toBeVisible();
      await expect(
        eventCard.locator('[data-testid="event-participants"]'),
      ).toHaveText(/\d+\s*\/\s*\d+\s*participants/i);
      await expect(
        eventCard.locator('[data-testid="event-percentage"]'),
      ).toHaveText(/\d+%/);
    } else {
      await expect(page.getByRole("heading", { name: /no events yet/i })).toBeVisible();
    }
  });
});
