import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { openEventsFromNav } from "./helpers/navigation";

test.describe("Switch Active Event from Events Tab (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("clicking an event card in Events tab opens its check-in page", async ({
    page,
  }) => {
    await openEventsFromNav(page);

    const targetCard = page.locator('[data-testid^="event-item-"]').first();
    await expect(targetCard).toBeVisible();

    const targetTitle = (
      await targetCard.getByRole("heading", { level: 2 }).textContent()
    )?.trim();
    expect(targetTitle).toBeTruthy();

    const targetId = (await targetCard.getAttribute("data-testid"))?.replace(
      "event-item-",
      "",
    );
    expect(targetId).toBeTruthy();

    await targetCard.click();

    await expect(page).toHaveURL(`/events/${targetId}/check-in`);

    await expect(
      page.getByRole("heading", { level: 2, name: targetTitle! }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /start camera/i }),
    ).toBeVisible();
  });
});
