import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { openEventsFromNav } from "./helpers/navigation";

test.describe("Events Overview from Sidebar (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("opens sidebar, navigates to Events, and displays event metrics", async ({
    page,
  }) => {
    await openEventsFromNav(page);

    await expect(page.getByRole("searchbox", { name: /search events/i })).toBeVisible();

    const eventCard = page.locator('[data-testid^="event-item-"]').first();
    const emptyState = page.getByRole("heading", { name: /^no events yet$/i });

    await expect(eventCard.or(emptyState).first()).toBeVisible({
      timeout: 15_000,
    });

    if (await eventCard.isVisible()) {
      await expect(eventCard.getByRole("heading", { level: 2 })).not.toBeEmpty();
      await expect(eventCard.locator('[data-testid="event-date"]')).toBeVisible();
      await expect(
        eventCard.locator('[data-testid="event-participants"]'),
      ).toHaveText(/\d+\s*\/\s*\d+\s*participants/i);
      await expect(
        eventCard.locator('[data-testid="event-percentage"]'),
      ).toHaveText(/\d+%/);
    } else {
      await expect(emptyState).toBeVisible();
      await expect(
        page.getByRole("button", { name: /create an event/i }),
      ).toBeVisible();
    }
  });
});
