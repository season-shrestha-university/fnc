import { expect, test, type Page } from "@playwright/test";

const testEmail = process.env.TEST_VOLUNTEER_EMAIL;
const testPassword = process.env.TEST_VOLUNTEER_PASSWORD;

function getCredentials() {
  if (!testEmail || !testPassword) {
    throw new Error(
      "TEST_VOLUNTEER_EMAIL and TEST_VOLUNTEER_PASSWORD must be set in .env.local to run authentication e2e tests.",
    );
  }
  return { email: testEmail, password: testPassword };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to check in" }),
  ).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("user authentication", () => {
  test("redirects unauthenticated visitors on protected routes to /login", async ({
    page,
  }) => {
    for (const route of ["/", "/dashboard", "/events", "/members"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Sign in to check in" }),
      ).toBeVisible();
    }
  });

  test("shows an error alert when signing in with invalid credentials", async ({
    page,
  }) => {
    await signIn(page, "invalid-user@example.com", "wrong-password-123");

    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/invalid login credentials/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signs in, persists session, redirects /login when authenticated, and signs out", async ({
    page,
  }) => {
    const { email, password } = getCredentials();

    await signIn(page, email, password);

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Session remains active across page reloads and protected routes.
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    await page.goto("/events");
    await expect(page).toHaveURL(/\/events$/);

    // Authenticated users visiting /login are redirected to /.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Open mobile navigation drawer when present before clicking Sign out.
    const openMenuButton = page.getByRole("button", { name: "Open menu" });
    if (await openMenuButton.isVisible()) {
      await openMenuButton.click();
    }
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to check in" }),
    ).toBeVisible();

    // Protected routes require authentication again after sign-out.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
