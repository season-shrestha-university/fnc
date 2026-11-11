import { expect, type Page } from "@playwright/test";

import { openEventsFromNav } from "./navigation";

const eventsHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: /^events$/i });

export async function goToEvents(page: Page) {
  if (await eventsHeading(page).isVisible()) {
    return;
  }

  if (await page.getByRole("button", { name: /sign out/i }).isVisible()) {
    await openEventsFromNav(page);
    await expect(eventsHeading(page)).toBeVisible({ timeout: 15_000 });
    return;
  }

  await page.goto("/events");
  await expect(eventsHeading(page)).toBeVisible({ timeout: 15_000 });
}

export async function createEventOnEventsPage(page: Page, eventName: string) {
  await goToEvents(page);
  await page.getByRole("button", { name: /^new event$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: /set up your event/i }),
  ).toBeVisible();
  await dialog.getByLabel(/event name/i).fill(eventName);
  await dialog.getByRole("button", { name: /^create event$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(
    page
      .locator('[data-testid^="event-item-"]')
      .filter({ hasText: eventName })
      .first(),
  ).toBeVisible();
}

export async function openEventCheckIn(page: Page, eventName: string) {
  const card = page
    .locator('[data-testid^="event-item-"]')
    .filter({ hasText: eventName })
    .first();
  await expect(card).toBeVisible();
  const testId = await card.getAttribute("data-testid");
  const eventId = testId?.replace("event-item-", "");
  expect(eventId).toBeTruthy();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/events/${eventId}/check-in$`));
  return eventId!;
}

export async function openFirstEventCheckIn(page: Page) {
  await goToEvents(page);
  const card = page.locator('[data-testid^="event-item-"]').first();
  await expect(card).toBeVisible();
  const testId = await card.getAttribute("data-testid");
  const eventId = testId?.replace("event-item-", "");
  expect(eventId).toBeTruthy();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/events/${eventId}/check-in$`));
  return eventId!;
}

export async function deleteEventFromCheckIn(page: Page) {
  await page.getByRole("button", { name: /^update event$/i }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();
  await editDialog.getByRole("button", { name: /^delete event$/i }).click();
  const confirmDialog = page.getByRole("dialog").last();
  await confirmDialog.getByRole("button", { name: /^delete event$/i }).click();
  await expect(page).toHaveURL("/events", { timeout: 15_000 });
}
