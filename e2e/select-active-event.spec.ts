// e2e/select-active-event.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "password123!";

test.describe("Switch Active Event from Events Tab (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("clicking an event card in Events tab opens its check-in page", async ({
    page,
  }) => {
    // 1. Open sidebar if on mobile viewport
    const menuToggle = page.getByRole("button", {
      name: /toggle sidebar|open menu|menu/i,
    });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }

    // 2. Navigate to the Events tab from the sidebar
    const sidebar = page.locator(
      'aside, [data-sidebar="sidebar"], [role="navigation"]',
    );
    const eventsNavLink = sidebar.getByRole("link", { name: /^events$/i }).first();
    await expect(eventsNavLink).toBeVisible();
    await eventsNavLink.click();
    await expect(
      page.getByRole("heading", { level: 1, name: /^events$/i }),
    ).toBeVisible();

    // 3. Select a specific target event card from the list
    const targetCard = page.locator('[data-testid^="event-item-"]').nth(1);
    await expect(targetCard).toBeVisible();

    const targetTitle = (
      await targetCard.getByRole("heading", { level: 2 }).textContent()
    )?.trim();
    expect(targetTitle).toBeTruthy();

    // 4. Click the event card to open check-in
    await targetCard.click();

    // 5. Verify redirect to the selected event's check-in page
    const targetId = (await targetCard.getAttribute("data-testid"))?.replace(
      "event-item-",
      "",
    );
    expect(targetId).toBeTruthy();
    await expect(page).toHaveURL(`/events/${targetId}/check-in`);

    // 6. Assert that check-in reflects the clicked event
    await expect(page.getByText(targetTitle!, { exact: true })).toBeVisible();

    // 7. Verify the check-in scanner is present for the selected event
    await expect(
      page.getByRole("button", { name: /start camera/i }),
    ).toBeVisible();
  });
});
