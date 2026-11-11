// e2e/event-detail-page.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "password123!";

test.describe("Event Check-in Navigation (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("clicking an event card directs volunteer directly to its check-in page", async ({
    page,
  }) => {
    // 1. Open the Events list page
    await page.goto("/events");
    await expect(page).toHaveURL("/events");

    // 2. Select an event card and extract its identifier and title
    const eventCard = page.locator('[data-testid^="event-item-"]').first();
    await expect(eventCard).toBeVisible();

    const testId = await eventCard.getAttribute("data-testid");
    const expectedEventId = testId?.replace("event-item-", "");
    expect(expectedEventId).toBeTruthy();

    const expectedTitle = (
      await eventCard.getByRole("heading", { level: 2 }).textContent()
    )?.trim();
    expect(expectedTitle).toBeTruthy();

    // 3. Click the card to navigate directly to check-in
    await eventCard.click();

    // 4. Verify the URL matches the event check-in route pattern /events/[id]/check-in
    await expect(page).toHaveURL(
      new RegExp(`/events/${expectedEventId}/check-in$`),
    );

    // 5. Verify check-in is loaded for the selected event
    await expect(
      page.getByRole("button", { name: `Update ${expectedTitle}` }),
    ).toBeVisible();
    await expect(
      page.getByText("Scan a member", { exact: true }),
    ).toBeVisible();

    // 6. Verify the check-in scanner action is available
    await expect(
      page.getByRole("button", { name: /start camera/i }),
    ).toBeVisible();
  });
});
