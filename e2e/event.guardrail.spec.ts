import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { createEventOnEventsPage, goToEvents } from "./helpers/events";

test.describe("Community Center Event Management (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("can create an event and still start another from the events page", async ({
    page,
  }) => {
    const firstEvent = `Tuesday Social Club ${Date.now()}`;
    await createEventOnEventsPage(page, firstEvent);

    await goToEvents(page);
    await expect(page.getByRole("button", { name: /^new event$/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: firstEvent }),
    ).toBeVisible();
  });
});
