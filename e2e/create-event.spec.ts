import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { goToEvents } from "./helpers/events";

test.describe("Event Creation Flow (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("clicks New Event, completes form, and creates active event", async ({
    page,
  }) => {
    const testEventName = `Wednesday Coffee ${Date.now()}`;

    await goToEvents(page);

    await page.getByRole("button", { name: /^new event$/i }).click();

    const eventDialog = page.getByRole("dialog");
    await expect(eventDialog).toBeVisible();
    await expect(
      eventDialog.getByRole("heading", { name: /set up your event/i }),
    ).toBeVisible();

    await eventDialog.getByLabel(/event name/i).fill(testEventName);

    const addressCheckbox = eventDialog.getByLabel(/^address$/i);
    if (await addressCheckbox.isVisible()) {
      await addressCheckbox.check();
      await expect(addressCheckbox).toBeChecked();
    }

    await eventDialog.getByRole("button", { name: /^create event$/i }).click();
    await expect(eventDialog).toBeHidden({ timeout: 15_000 });

    const eventCard = page
      .locator('[data-testid^="event-item-"]')
      .filter({ hasText: testEventName });
    await expect(eventCard).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: /^new event$/i })).toBeVisible();
  });
});
