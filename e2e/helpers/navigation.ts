import { expect, type Page } from "@playwright/test";

export async function openEventsFromNav(page: Page) {
  const menuToggle = page.getByRole("button", { name: /^open menu$/i });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }

  const eventsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: /^events$/i })
    .first();
  await expect(eventsLink).toBeVisible();
  await eventsLink.click();
  await expect(
    page.getByRole("heading", { level: 1, name: /^events$/i }),
  ).toBeVisible();
}
