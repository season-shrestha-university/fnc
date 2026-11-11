import { test, expect } from "@playwright/test";

import { getVolunteerCredentials } from "./helpers/auth";

test.describe("Volunteer Authentication Flow", () => {
  test("1. Login screen does not allow self-registration (no sign-up)", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    await expect(
      page.getByRole("link", { name: /sign up|register|create account/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /sign up|register|create account/i }),
    ).toHaveCount(0);
  });

  test("2. Rejects invalid credentials and keeps user on login screen", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("wrong@communitycenter.org");
    await page.getByLabel(/password/i).fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("3. Logs in with accurate credentials and signs out successfully", async ({
    page,
  }) => {
    const { email, password } = getVolunteerCredentials();

    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL("/");
    const signOutButton = page.getByRole("button", {
      name: /sign out|log out/i,
    });
    await expect(signOutButton).toBeVisible();

    await signOutButton.click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("button", { name: /sign in|log in/i }),
    ).toBeEnabled();

    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
