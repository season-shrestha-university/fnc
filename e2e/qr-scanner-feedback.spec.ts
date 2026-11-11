// e2e/qr-scanner-feedback.spec.ts
import { test, expect } from "@playwright/test";

const VOLUNTEER_EMAIL =
  process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
const VOLUNTEER_PASSWORD =
  process.env.TEST_VOLUNTEER_PASSWORD || "password123!";

// Extend window type for test audio tracking
declare global {
  interface Window {
    __playedSounds: string[];
  }
}

test.describe("QR Scanner Audio & Top Toast Feedback (BDD)", () => {
  test.beforeEach(async ({ page, context }) => {
    // 1. Grant camera permissions for the QR scanner
    await context.grantPermissions(["camera"]);

    // 2. Spy on browser audio playback before page scripts run
    await page.addInitScript(() => {
      window.__playedSounds = [];

      // Intercept HTML5 <audio> / new Audio().play()
      const originalPlay = window.HTMLMediaElement.prototype.play;
      window.HTMLMediaElement.prototype.play = function () {
        const src = this.currentSrc || this.src || "audio-element";
        window.__playedSounds.push(src);
        return Promise.resolve();
      };

      // Intercept Web Audio API OscillatorNode (if generating beep tones via AudioContext)
      if (window.OscillatorNode) {
        const originalStart = window.OscillatorNode.prototype.start;
        window.OscillatorNode.prototype.start = function (when?: number) {
          const freq = this.frequency?.value || 0;
          // High frequency (>= 600Hz) = success beep, Low frequency (< 600Hz) = error beep
          const soundType = freq >= 600 ? "beep-success" : "beep-failure";
          window.__playedSounds.push(soundType);
          return originalStart.call(this, when);
        };
      }
    });

    // 3. Log in as volunteer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
    await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("plays success beep and shows top toast with Member Name & ID on valid QR scan", async ({
    page,
  }) => {
    const memberSuffix = Date.now();
    const memberName = `QR Test Member ${memberSuffix}`;
    const memberId = `QR-${memberSuffix}`;

    await page.goto("/members");
    await page.getByRole("button", { name: /add member/i }).click();
    const memberDialog = page.getByRole("heading", {
      name: /create a member qr/i,
    }).locator("..");
    await memberDialog.getByLabel("Name *").fill(memberName);
    await memberDialog.getByLabel("Member ID").fill(memberId);
    await memberDialog
      .getByRole("button", { name: /create & generate qr/i })
      .click();
    await expect(page.getByText(memberName, { exact: true })).toBeVisible();
    await page.goto("/");

    // 1. Given the volunteer is on the event's QR scanner screen
    await expect(page.locator("#qr-reader")).toBeVisible();

    // 2. When a valid member QR code is scanned
    await page.evaluate((id) => {
      window.dispatchEvent(
        new CustomEvent("TEST_QR_SCAN", { detail: id }),
      );
    }, memberId);

    // 3. Then the device must play the success beep sound
    await expect
      .poll(async () => {
        return await page.evaluate(() => window.__playedSounds);
      })
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(/success|beep-success/i),
        ]),
      );

    // 4. And a toast notification must appear at the top of the screen
    const toast = page
      .locator(
        '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
      )
      .first();
    await expect(toast).toBeVisible();

    // Verify toast is positioned at the top of the viewport (y < 150px)
    const boundingBox = await toast.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.y).toBeLessThan(150);

    // 5. And the toast must display both the Member Name and Member ID
    await expect(toast).toContainText(memberName);
    await expect(toast).toContainText(memberId);
  });

  test("plays failure beep sound and shows error state on invalid QR scan", async ({
    page,
  }) => {
    // 1. Given the volunteer is on the event's QR scanner screen
    await expect(page.locator("#qr-reader")).toBeVisible();

    // 2. When an unrecognized/invalid QR code is scanned
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("TEST_QR_SCAN", { detail: "INVALID-QR-999" }),
      );
    });

    // 3. Then the device must play the failure beep sound
    await expect
      .poll(async () => {
        return await page.evaluate(() => window.__playedSounds);
      })
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(/failure|error|beep-failure/i),
        ]),
      );

    // 4. And an error toast appears at the top of the screen
    const errorToast = page
      .locator(
        '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
      )
      .first();
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText(/not found|invalid|error/i);
  });
});
