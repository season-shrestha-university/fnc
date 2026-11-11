// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

// Pre-provisioned volunteer credentials (created by admin in Supabase, not via the app)
const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "czon.herald75@gmail.com";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "manwithanironnail";

test.describe("Volunteer Authentication Flow", () => {
  test("1. Login screen does not allow self-registration (no sign-up)", async ({
    page,
  }) => {
    // Given the volunteer navigates to the login screen
    await page.goto("/login");

    // Then the email and password fields are visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // And there is NO sign-up or register link/button anywhere on the screen
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
    // Given the volunteer is on the login page
    await page.goto("/login");

    // When they enter an incorrect email or password
    await page.getByLabel(/email/i).fill("wrong@communitycenter.org");
    await page.getByLabel(/password/i).fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Then an error message appears and they remain on /login
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("3. Logs in with accurate credentials and signs out successfully", async ({
    page,
  }) => {
    // Given an unauthenticated user tries to visit the home page, they are redirected to /login
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    // When the volunteer enters their given email and password
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Then they are logged in and redirected to the main dashboard
    await expect(page).toHaveURL("/");
    const signOutButton = page.getByRole("button", {
      name: /sign out|log out/i,
    });
    await expect(signOutButton).toBeVisible();

    // When the volunteer clicks the Sign Out button
    await signOutButton.click();

    // Then they are signed out and redirected back to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("button", { name: /sign in|log in/i }),
    ).toBeEnabled();

    // And trying to navigate back to the protected dashboard redirects them back to /login
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
