import { expect, type Page } from "@playwright/test";

export function getVolunteerCredentials() {
  const email =
    process.env.TEST_VOLUNTEER_EMAIL || "czon.herald75@gmail.com";
  const password =
    process.env.TEST_VOLUNTEER_PASSWORD || "manwithanironnail";
  return { email, password };
}

export async function signInAsVolunteer(page: Page) {
  const { email, password } = getVolunteerCredentials();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  // App shell + Supabase session (needed before hard navigations to server routes).
  await expect(
    page.getByRole("button", { name: /sign out/i }),
  ).toBeVisible({ timeout: 15_000 });
}
