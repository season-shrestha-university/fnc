// e2e/create-event.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "password123!";

test.describe("Event Creation Flow (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByText("Loading event data...", { exact: true }),
    ).toBeHidden();

    // 2. Ensure clean state: open the active event editor before deleting it
    const updateEventBtn = page.getByRole("button", {
      name: /update event/i,
    });
    if (await updateEventBtn.isVisible()) {
      await updateEventBtn.click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /delete event/i })
        .click();
      const confirmDeleteBtn = page.getByRole("button", {
        name: "Delete event",
        exact: true,
      }).last();
      await expect(confirmDeleteBtn).toBeVisible();
      await confirmDeleteBtn.click();
      await expect(
        page.getByRole("button", { name: /new event/i }),
      ).toBeVisible();
      await expect(
        page.getByText("Loading event data...", { exact: true }),
      ).toBeHidden();
    }
  });

  test("clicks New Event, completes form, and creates active event", async ({
    page,
  }) => {
    const testEventName = "Wednesday Coffee Morning";

    // 1. Given the volunteer is on the empty dashboard
    const newEventBtn = page.getByRole("button", { name: /new event/i });
    await expect(newEventBtn).toBeVisible();
    await expect(
      page.getByText("Loading event data...", { exact: true }),
    ).toBeHidden();

    // 2. When they click "New Event"
    await newEventBtn.click();

    // 3. Then the event creation dialog should open
    const eventDialog = page.getByRole("dialog");
    await expect(eventDialog).toBeVisible();
    await expect(
      eventDialog.getByRole("heading", { name: /set up your event/i }),
    ).toBeVisible();

    // 4. When they enter the event name and pick tracking options
    await eventDialog.getByLabel(/event name/i).fill(testEventName);

    // Select custom fields to track if available
    const addressCheckbox = eventDialog.getByLabel(/address/i);
    if (await addressCheckbox.isVisible()) {
      await addressCheckbox.check();
      await expect(addressCheckbox).toBeChecked();
    }

    // 5. Submit the event creation form
    await eventDialog
      .getByRole("button", { name: /create event|save event/i })
      .click();

    // 6. Then they are redirected to the dashboard
    await expect(page).toHaveURL("/");

    // 7. Verify the newly created event name is displayed as active
    await expect(
      page.getByText(testEventName, { exact: true }),
    ).toBeVisible();

    // 8. Assert single-event guardrail: "Update Event" is now shown and "New Event" is gone
    await expect(
      page.getByRole("button", {
        name: new RegExp(`Update ${testEventName}`, "i"),
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /new event/i })).toHaveCount(
      0,
    );
  });
});
