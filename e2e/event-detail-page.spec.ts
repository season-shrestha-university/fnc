import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { goToEvents } from "./helpers/events";

test.describe("Event Check-in Navigation (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("clicking an event card directs volunteer directly to its check-in page", async ({
    page,
  }) => {
    await goToEvents(page);

    const eventCard = page.locator('[data-testid^="event-item-"]').first();
    await expect(eventCard).toBeVisible();

    const testId = await eventCard.getAttribute("data-testid");
    const expectedEventId = testId?.replace("event-item-", "");
    expect(expectedEventId).toBeTruthy();

    const expectedTitle = (
      await eventCard.getByRole("heading", { level: 2 }).textContent()
    )?.trim();
    expect(expectedTitle).toBeTruthy();

    await eventCard.click();

    await expect(page).toHaveURL(
      new RegExp(`/events/${expectedEventId}/check-in$`),
    );

    await expect(
      page.getByRole("button", { name: `Update ${expectedTitle}` }),
    ).toBeVisible();
    await expect(
      page.getByText("Scan a member", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /start camera/i }),
    ).toBeVisible();
  });
});
