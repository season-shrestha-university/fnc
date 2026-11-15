# Tasks

## 1. Camera Lifecycle Hook & Photo Capture

- [x] 1.1 Extend `src/components/rollcall/members/use-member-camera.ts` (or add a wizard camera hook) to support `facingMode: 'user' | 'environment'` (default `'user'`), `enumerateDevices()` video-input count detection for showing/hiding camera switch, automatic `getUserMedia` start on mount in `camera` state, horizontal canvas mirroring when capturing from `'user'` camera, and strict `useEffect` track cleanup (`stream.getTracks().forEach(t => t.stop())`) on capture, stop, or unmount; verify with unit tests covering track cleanup, camera switch, mirroring, and unavailable/denied fallback message (`"Camera not available. Upload a photo instead."`).
- [x] 1.2 Ensure captured and uploaded photo `File`/`Blob` objects preview via `URL.createObjectURL` and revoke object URLs on `Retake`, `Skip for now`, form reset, and unmount; verify with unit tests asserting `URL.revokeObjectURL` is called on retake and reset.

## 2. Three-Step Wizard State, Navigation & Layout Shell

- [x] 2.1 Create `CreateMemberWizardDialog` under `src/components/rollcall/members/` owning the single parent form state (`name`, `memberId`, `dob`, `email`, `phone`, `address`, `photoFile`, `photoPreviewUrl`), `step` (`'photo' | 'details' | 'contact' | 'done'`), `photoSubState` (`'camera' | 'captured'`), `errors`, `isSubmitting`, and `createdMember`; verify that unmounting/mounting steps preserves all entered values across `Back` and `Next`.
- [x] 2.2 Implement the responsive dialog/sheet container (`< 640px` full-screen sheet with scrollable content and sticky `env(safe-area-inset-bottom)` footer; `>= 640px` `600px` dialog with single-row footer), `Step n of 3 · <name>` segmented progress bar (hidden on `done`), 56px footer buttons, >= 44px touch targets, focus transfer to step heading/first field on step change, and `aria-live="polite"` step announcements; verify with component tests.
- [x] 2.3 Implement Close (`X`) and `Esc` discard confirmation when any field or photo has a value (closing immediately when empty, and blocking close while submitting); verify with component tests for empty close, dirty close confirmation/cancel, and blocked close during submission.

## 3. Step Views, Validation & Submission

- [x] 3.1 Implement `PhotoStep` (`camera` sub-state with dark oval-guide preview, camera switch button, `Take photo`, `Upload from device` `<input type="file" accept="image/*">`, and `Skip for now`; `captured` sub-state with preview, `Retake`, and `Next`) and verify all Photo step transitions and file validation with component tests.
- [x] 3.2 Implement `DetailsStep` (`name` required, `memberId` placeholder `MEMBER-001`, `dateOfBirth`, and `"Change"` / `"Add photo"` link to `Photo`) with step-scoped validation (`"Enter the member's name to continue"`, red border, `aria-invalid`, `aria-describedby`, focus to Name input, clear on type) and verify with component tests.
- [x] 3.3 Implement `ContactStep` (summary shortcut chips routing Photo chip → `Photo` and other chips → `Details`, optional `email`, `phone`, `address`, never-disabled `Create & generate QR` button) plus full-form defence-in-depth validation on submit, `"Creating…"` spinner state, server field-error routing back to owning step, and non-field error retention on `Contact`; verify with component tests.
- [x] 3.4 Implement `DoneStep` displaying photo or default avatar, `name`, server-returned `memberId`, QR code from existing `QRCode.toDataURL` using server `memberId`, `Download QR` (`<memberId>-qr.png`), print action, `Add another member` (reset form/errors/URLs, `step = 'photo'`, restart camera, background list refresh), and `Done` (close + list refresh); verify with component tests.

## 4. Integration & End-to-End Verification

- [x] 4.1 Wire `CreateMemberWizardDialog` into `src/components/rollcall/members/member-directory.tsx` for the `Create a member QR` button while keeping the Edit Member dialog and existing `createMember` / `uploadMemberPhoto` / QR utilities intact.
- [x] 4.2 Run `pnpm test:ci`, `pnpm lint`, and `pnpm build` (and relevant Playwright E2E member creation specs if applicable) and confirm all checks pass.
