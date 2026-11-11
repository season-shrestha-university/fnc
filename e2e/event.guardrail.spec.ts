// e2e/event-guardrail.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Community Center Event Management (BDD)", () => {
  test("enforces single active event guardrail from PRD", async ({ page }) => {
    // 1. Given the volunteer opens the app with no active events
    await page.goto("/");

    const newEventBtn = page.getByRole("button", { name: /new event/i });
    await expect(newEventBtn).toBeVisible();

    // 2. When they click New Event and fill out the form
    await newEventBtn.click();
    await page.fill('input[name="name"]', "Tuesday Social Club");
    await page.click('button[type="submit"]');

    // 3. Then the dashboard loads and the button dynamically switches to "Update Event"
    await page.goto("/");
    const updateEventBtn = page.getByRole("button", { name: /update event/i });
    await expect(updateEventBtn).toBeVisible();
    await expect(
      page.getByRole("button", { name: /new event/i }),
    ).not.toBeVisible();
  });
});
