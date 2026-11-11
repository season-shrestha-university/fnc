import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import {
  createEventOnEventsPage,
  deleteEventFromCheckIn,
  openEventCheckIn,
} from "./helpers/events";

test.describe("Active Event Deletion & No Fallback Guardrail (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("deleting an event returns to the events list without opening another check-in", async ({
    page,
  }) => {
    const eventName = `Event to be Deleted ${Date.now()}`;
    await createEventOnEventsPage(page, eventName);
    await openEventCheckIn(page, eventName);

    await deleteEventFromCheckIn(page);

    await expect(page).toHaveURL("/events");
    await expect(
      page.getByRole("heading", { level: 1, name: /^events$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: eventName }),
    ).toHaveCount(0);

    await expect(page.getByRole("button", { name: /^new event$/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/check-in/);

    await page.reload();
    await expect(page).toHaveURL("/events");
    await expect(
      page.getByRole("heading", { level: 2, name: eventName }),
    ).toHaveCount(0);
  });
});
