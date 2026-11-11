import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import {
  createEventOnEventsPage,
  deleteEventFromCheckIn,
  openEventCheckIn,
} from "./helpers/events";

test.describe("Event Deletion Flow (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("confirms deletion, sends DELETE request, and returns to events list", async ({
    page,
  }) => {
    const eventName = `Test Event to Delete ${Date.now()}`;
    await createEventOnEventsPage(page, eventName);
    await openEventCheckIn(page, eventName);

    await expect(
      page.getByRole("button", { name: /^update event$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: eventName }),
    ).toBeVisible();

    await deleteEventFromCheckIn(page);

    await expect(
      page.getByRole("heading", { level: 1, name: /^events$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: eventName }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^new event$/i })).toBeVisible();
  });
});
