// e2e/delete-active-event-no-fallback.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "password123!";

test.describe("Active Event Deletion & No Fallback Guardrail (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("deleting the active event leaves no active event and prompts to create a new one", async ({
    page,
  }) => {
    // 1. Ensure an active event is loaded on the check-in dashboard
    // If the board is empty, create one first so we have a target to delete
    await expect(
      page.getByText("Loading event data...", { exact: true }),
    ).toBeHidden();

    const newEventBtn = page.getByRole("button", { name: /new event/i });
    if (await newEventBtn.isVisible()) {
      await newEventBtn.click();
      await page.getByLabel(/event name/i).fill("Event to be Deleted");
      await page
        .getByRole("button", { name: /create event|save event/i })
        .click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("dialog")).toBeHidden();
    }

    // Capture the name of the currently active event
    const activeHeading = page.getByRole("heading", { level: 2 });
    await expect(activeHeading).toBeVisible();
    const deletedEventTitle = (await activeHeading.textContent())?.trim();

    // 2. Open the active event editor and request deletion
    await page
      .getByRole("button", { name: "Update event", exact: true })
      .first()
      .click();
    const eventDialog = page.getByRole("dialog");
    await expect(eventDialog).toBeVisible();
    await eventDialog.getByRole("button", { name: /delete event/i }).click();

    // 3. Confirm deletion in the safety dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^delete event$/i }).click();

    // 4. After deletion, navigate to the event list:
    await expect(page).toHaveURL("/events");
    await expect(
      page.getByRole("heading", { name: /^events$/i }),
    ).toBeVisible();

    // 5. Assert that the deleted event's heading is no longer present
    if (deletedEventTitle) {
      await expect(
        page.getByRole("heading", { level: 2, name: deletedEventTitle }),
      ).toHaveCount(0);
    }

    // 6. Strict Guardrail: The screen must not pick another existing event as active.
    // It must render the event list with the "New Event" prompt.
    await expect(
      page.getByRole("button", { name: /new event/i }),
    ).toBeVisible();

    // 7. No active event controls should be visible in the event list.
    await expect(
      page.getByRole("button", { name: /update event/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /scan member qr/i }),
    ).toHaveCount(0);

    // 8. After a hard refresh, the deleted event must remain unavailable.
    await page.reload();
    await expect(
      page.getByRole("button", { name: /new event/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /update event/i }),
    ).toHaveCount(0);
  });
});
