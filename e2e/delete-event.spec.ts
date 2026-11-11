// e2e/delete-event.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "czon.herald75@gmail.com";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "manwithanironnail";

test.describe("Event Deletion Flow (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in with provisioned credentials
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Loading event data...")).toBeHidden();

    // 2. Ensure an active event exists; create one if dashboard is empty
    const newEventBtn = page.getByRole("button", { name: /^new event$/i });
    if (await newEventBtn.isVisible()) {
      await newEventBtn.click();
      await page.getByLabel(/event name/i).fill("Test Event to Delete");
      await page.getByRole("button", { name: /create event/i }).click();
      await expect(page).toHaveURL("/");
    }
  });

  test("confirms deletion, sends DELETE request, and returns to New Event screen", async ({
    page,
  }) => {
    // 1. Given an active event is displayed on the dashboard
    await expect(
      page.getByRole("button", { name: /update event/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /update event/i }).click();
    const deleteBtn = page.getByRole("button", { name: /delete event/i });
    await expect(deleteBtn).toBeVisible();

    // 2. When the volunteer clicks "Delete Event"
    await deleteBtn.click();

    // 3. Then the confirmation dialog warning of data loss appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/permanently remove the event/i),
    ).toBeVisible();

    // 4. When the user confirms the action inside the dialog
    await dialog.getByRole("button", { name: /^delete event$/i }).click();

    // 5. And the dashboard resets back to the initial "New Event" screen
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /new event/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /update event/i }),
    ).toHaveCount(0);
  });
});
