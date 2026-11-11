import { test, expect } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";

test.describe("Check-in dashboard (BDD)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsVolunteer(page);
  });

  test("displays dashboard KPIs and the participants chart", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /^dashboard$/i }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-total-events"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-total-participants"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-avg-attendance"]'),
    ).toBeVisible();

    const chartContainer = page.locator(
      '[data-testid="events-participants-chart"]',
    );
    await expect(chartContainer).toBeVisible();
    await expect(chartContainer.getByText(/overview/i)).toBeVisible();
    await expect(
      chartContainer.getByText(/participants per event/i),
    ).toBeVisible();
    await expect(chartContainer.locator("svg.recharts-surface")).toBeVisible();
    await expect(
      chartContainer.locator(".recharts-bar-rectangle").first(),
    ).toBeVisible();
  });
});
