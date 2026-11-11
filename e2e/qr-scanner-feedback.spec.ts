import { test, expect, type Page } from "@playwright/test";

import { signInAsVolunteer } from "./helpers/auth";
import { openFirstEventCheckIn } from "./helpers/events";

declare global {
  interface Window {
    __playedSounds: string[];
  }
}

test.describe("QR Scanner Audio & Top Toast Feedback (BDD)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["camera"]);

    await page.addInitScript(() => {
      window.__playedSounds = [];

      const originalPlay = window.HTMLMediaElement.prototype.play;
      window.HTMLMediaElement.prototype.play = function () {
        const src = this.currentSrc || this.src || "audio-element";
        window.__playedSounds.push(src);
        return Promise.resolve();
      };

      if (window.OscillatorNode) {
        const originalStart = window.OscillatorNode.prototype.start;
        window.OscillatorNode.prototype.start = function (when?: number) {
          const freq = this.frequency?.value || 0;
          const soundType = freq >= 600 ? "beep-success" : "beep-failure";
          window.__playedSounds.push(soundType);
          return originalStart.call(this, when);
        };
      }
    });

    await signInAsVolunteer(page);
  });

  async function createTestMember(page: Page) {
    const memberSuffix = Date.now();
    const memberName = `QR Test Member ${memberSuffix}`;
    const memberId = `QR-${memberSuffix}`;

    await page.goto("/members");
    await page.getByRole("button", { name: /add member/i }).click();
    const memberDialog = page
      .getByRole("heading", { name: /create a member qr/i })
      .locator("..");
    await memberDialog.getByLabel(/^name \*$/i).fill(memberName);
    await memberDialog.getByLabel(/^member id$/i).fill(memberId);
    await memberDialog.getByLabel(/date of birth/i).fill("1990-06-15");
    await memberDialog
      .getByRole("button", { name: /create & generate qr/i })
      .click();
    await expect(page.getByText(memberName, { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    return { memberName, memberId };
  }

  test("plays success beep and shows top toast with Member Name & ID on valid QR scan", async ({
    page,
  }) => {
    const { memberName, memberId } = await createTestMember(page);
    await openFirstEventCheckIn(page);

    await expect(page.locator("#qr-reader")).toBeVisible();

    await page.evaluate((id) => {
      window.dispatchEvent(
        new CustomEvent("TEST_QR_SCAN", { detail: id }),
      );
    }, memberId);

    await expect
      .poll(async () => page.evaluate(() => window.__playedSounds))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(/success|beep-success/i),
        ]),
      );

    const toast = page
      .locator(
        '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
      )
      .first();
    await expect(toast).toBeVisible();

    const boundingBox = await toast.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.y).toBeLessThan(150);

    await expect(toast).toContainText(memberName);
    await expect(toast).toContainText(memberId);
  });

  test("plays failure beep sound and shows error state on invalid QR scan", async ({
    page,
  }) => {
    await openFirstEventCheckIn(page);

    await expect(page.locator("#qr-reader")).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("TEST_QR_SCAN", { detail: "INVALID-QR-999" }),
      );
    });

    await expect
      .poll(async () => page.evaluate(() => window.__playedSounds))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(/failure|error|beep-failure/i),
        ]),
      );

    const errorToast = page
      .locator(
        '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
      )
      .first();
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText(/not found|invalid|error/i);
  });
});
