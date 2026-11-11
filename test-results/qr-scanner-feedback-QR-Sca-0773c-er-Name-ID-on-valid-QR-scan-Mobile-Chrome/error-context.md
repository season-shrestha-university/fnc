# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qr-scanner-feedback.spec.ts >> QR Scanner Audio & Top Toast Feedback (BDD) >> plays success beep and shows top toast with Member Name & ID on valid QR scan
- Location: e2e/qr-scanner-feedback.spec.ts:54:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('QR Test Member 1794404440401', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('QR Test Member 1794404440401', { exact: true }) with timeout 5000ms
  - waiting for getByText('QR Test Member 1794404440401', { exact: true })

```

```yaml
- banner:
  - button "Open menu"
  - text: Workspace
  - button "Sign out"
- main:
  - link "Back to check-in":
    - /url: /
  - paragraph: Member directory
  - heading "Members and QR codes." [level=1]
  - paragraph: Each QR contains the exact member ID used by the check-in scanner.
  - textbox "Search members"
  - button "Add member"
  - paragraph: John Doe
  - paragraph: MEMBER-001
  - button "Generate QR"
  - paragraph: Nar Maya
  - paragraph: MEMBER-02
  - button "Generate QR"
  - paragraph: Phul Kumari Waiba
  - paragraph: MEMBER-12
  - button "Generate QR"
  - paragraph: Shreeju Pradhan
  - paragraph: MEMBER-03
  - button "Generate QR"
  - paragraph: New member
  - heading "Create a member QR" [level=2]
  - paragraph: Leave Member ID blank to generate one automatically.
  - text: Name *
  - textbox "Name *": QR Test Member 1794404440401
  - text: Member ID
  - textbox "Member ID":
    - /placeholder: "Example: MEMBER-001"
    - text: QR-1794404440401
  - text: Address
  - textbox "Address"
  - text: Date of birth
  - textbox "Date of birth"
  - text: Picture URL
  - textbox "Picture URL":
    - /placeholder: Optional
  - button "Cancel"
  - button "Create & generate QR"
- alert
```

# Test source

```ts
  1   | // e2e/qr-scanner-feedback.spec.ts
  2   | import { test, expect } from "@playwright/test";
  3   | 
  4   | const VOLUNTEER_EMAIL =
  5   |   process.env.TEST_VOLUNTEER_EMAIL || "volunteer@communitycenter.org";
  6   | const VOLUNTEER_PASSWORD =
  7   |   process.env.TEST_VOLUNTEER_PASSWORD || "password123!";
  8   | 
  9   | // Extend window type for test audio tracking
  10  | declare global {
  11  |   interface Window {
  12  |     __playedSounds: string[];
  13  |   }
  14  | }
  15  | 
  16  | test.describe("QR Scanner Audio & Top Toast Feedback (BDD)", () => {
  17  |   test.beforeEach(async ({ page, context }) => {
  18  |     // 1. Grant camera permissions for the QR scanner
  19  |     await context.grantPermissions(["camera"]);
  20  | 
  21  |     // 2. Spy on browser audio playback before page scripts run
  22  |     await page.addInitScript(() => {
  23  |       window.__playedSounds = [];
  24  | 
  25  |       // Intercept HTML5 <audio> / new Audio().play()
  26  |       const originalPlay = window.HTMLMediaElement.prototype.play;
  27  |       window.HTMLMediaElement.prototype.play = function () {
  28  |         const src = this.currentSrc || this.src || "audio-element";
  29  |         window.__playedSounds.push(src);
  30  |         return Promise.resolve();
  31  |       };
  32  | 
  33  |       // Intercept Web Audio API OscillatorNode (if generating beep tones via AudioContext)
  34  |       if (window.OscillatorNode) {
  35  |         const originalStart = window.OscillatorNode.prototype.start;
  36  |         window.OscillatorNode.prototype.start = function (when?: number) {
  37  |           const freq = this.frequency?.value || 0;
  38  |           // High frequency (>= 600Hz) = success beep, Low frequency (< 600Hz) = error beep
  39  |           const soundType = freq >= 600 ? "beep-success" : "beep-failure";
  40  |           window.__playedSounds.push(soundType);
  41  |           return originalStart.call(this, when);
  42  |         };
  43  |       }
  44  |     });
  45  | 
  46  |     // 3. Log in as volunteer
  47  |     await page.goto("/login");
  48  |     await page.getByLabel(/email/i).fill(VOLUNTEER_EMAIL);
  49  |     await page.getByLabel(/password/i).fill(VOLUNTEER_PASSWORD);
  50  |     await page.getByRole("button", { name: /sign in|log in/i }).click();
  51  |     await expect(page).toHaveURL("/");
  52  |   });
  53  | 
  54  |   test("plays success beep and shows top toast with Member Name & ID on valid QR scan", async ({
  55  |     page,
  56  |   }) => {
  57  |     const memberSuffix = Date.now();
  58  |     const memberName = `QR Test Member ${memberSuffix}`;
  59  |     const memberId = `QR-${memberSuffix}`;
  60  | 
  61  |     await page.goto("/members");
  62  |     await page.getByRole("button", { name: /add member/i }).click();
  63  |     const memberDialog = page.getByRole("heading", {
  64  |       name: /create a member qr/i,
  65  |     }).locator("..");
  66  |     await memberDialog.getByLabel("Name *").fill(memberName);
  67  |     await memberDialog.getByLabel("Member ID").fill(memberId);
  68  |     await memberDialog
  69  |       .getByRole("button", { name: /create & generate qr/i })
  70  |       .click();
> 71  |     await expect(page.getByText(memberName, { exact: true })).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  72  |     await page.goto("/");
  73  | 
  74  |     // 1. Given the volunteer is on the event's QR scanner screen
  75  |     await expect(page.locator("#qr-reader")).toBeVisible();
  76  | 
  77  |     // 2. When a valid member QR code is scanned
  78  |     await page.evaluate((id) => {
  79  |       window.dispatchEvent(
  80  |         new CustomEvent("TEST_QR_SCAN", { detail: id }),
  81  |       );
  82  |     }, memberId);
  83  | 
  84  |     // 3. Then the device must play the success beep sound
  85  |     await expect
  86  |       .poll(async () => {
  87  |         return await page.evaluate(() => window.__playedSounds);
  88  |       })
  89  |       .toEqual(
  90  |         expect.arrayContaining([
  91  |           expect.stringMatching(/success|beep-success/i),
  92  |         ]),
  93  |       );
  94  | 
  95  |     // 4. And a toast notification must appear at the top of the screen
  96  |     const toast = page
  97  |       .locator(
  98  |         '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
  99  |       )
  100 |       .first();
  101 |     await expect(toast).toBeVisible();
  102 | 
  103 |     // Verify toast is positioned at the top of the viewport (y < 150px)
  104 |     const boundingBox = await toast.boundingBox();
  105 |     expect(boundingBox).not.toBeNull();
  106 |     expect(boundingBox!.y).toBeLessThan(150);
  107 | 
  108 |     // 5. And the toast must display both the Member Name and Member ID
  109 |     await expect(toast).toContainText(memberName);
  110 |     await expect(toast).toContainText(memberId);
  111 |   });
  112 | 
  113 |   test("plays failure beep sound and shows error state on invalid QR scan", async ({
  114 |     page,
  115 |   }) => {
  116 |     // 1. Given the volunteer is on the event's QR scanner screen
  117 |     await expect(page.locator("#qr-reader")).toBeVisible();
  118 | 
  119 |     // 2. When an unrecognized/invalid QR code is scanned
  120 |     await page.evaluate(() => {
  121 |       window.dispatchEvent(
  122 |         new CustomEvent("TEST_QR_SCAN", { detail: "INVALID-QR-999" }),
  123 |       );
  124 |     });
  125 | 
  126 |     // 3. Then the device must play the failure beep sound
  127 |     await expect
  128 |       .poll(async () => {
  129 |         return await page.evaluate(() => window.__playedSounds);
  130 |       })
  131 |       .toEqual(
  132 |         expect.arrayContaining([
  133 |           expect.stringMatching(/failure|error|beep-failure/i),
  134 |         ]),
  135 |       );
  136 | 
  137 |     // 4. And an error toast appears at the top of the screen
  138 |     const errorToast = page
  139 |       .locator(
  140 |         '[data-testid="scan-toast"], [role="status"], [data-sonner-toast]',
  141 |       )
  142 |       .first();
  143 |     await expect(errorToast).toBeVisible();
  144 |     await expect(errorToast).toContainText(/not found|invalid|error/i);
  145 |   });
  146 | });
  147 | 
```