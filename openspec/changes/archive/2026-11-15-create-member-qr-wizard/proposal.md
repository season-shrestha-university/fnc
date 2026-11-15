# Proposal

## Why

The current "Create a member QR" dialog presents all profile fields, photo capture, and file upload in a single long modal form, which feels cramped on mobile devices and separates member creation from the resulting QR code view. Replacing the dialog UI and state with a guided 3-step flow (`Photo` → `Details` → `Contact` → `Done`) streamlines mobile-first intake at check-in desks while keeping the existing member creation API and QR generator intact.

## What Changes

- Replace the single-screen "Create a member QR" dialog UI and local state with a 3-step wizard (`photo`, `details`, `contact`) plus a `done` completion state, backed by a single parent-owned form state so navigating between steps never loses entered data.
- Add a step progress header (`Step n of 3 · <name>`) for steps 1–3, hidden on `done`, plus `aria-live="polite"` step announcements and focus management on step transitions.
- Update Step 1 (`Photo`) camera lifecycle to auto-start on mount in `camera` sub-state (`facingMode: 'user'`), support front/rear camera switching when multiple cameras exist, mirror front-camera captures, stop all tracks cleanly on capture/skip/navigation/close/unmount, handle missing/denied cameras inline, and support `Retake` and `Upload from device`.
- Add Step 2 (`Details`) with a live-updating member preview card (`New member` / `No member ID yet` placeholder updating as `name` and `memberId` are typed, plus `Change` / `Add photo` shortcut) and step-scoped validation (requiring non-empty `name` with inline error and focus transfer before advancing) plus full-form defence-in-depth validation on submit, routing server field errors back to the owning step.
- Add Step 3 (`Contact`) with optional `Email`, `Phone`, and multiline `Address` inputs, `"You’re adding"` summary shortcut chips (navigating back to `Photo` or `Details`), and submit loading state (`Creating…` with disabled footer actions and blocked close).
- Add an in-dialog `Done` state (`Member created`) displaying the check confirmation (`<name> is set up`), member avatar/photo, name, server-assigned `memberId`, generated QR code, existing download/print actions (`<memberId>-qr.png`), `Add another member` (reset + restart at `photo` + background list refresh), and `Done` (close + list refresh).
- Add discard confirmation when closing via `X` or `Esc` if any field has a value.
- Update responsive dialog layout: full-screen sheet with sticky safe-area footer on mobile (`< 640px`), `600px` dialog on desktop, 56px primary buttons, and minimum 44px interactive targets.
- Keep existing `createMember` server action, `uploadMemberPhoto` storage upload, `QRCode` generation, and the separate Edit Member dialog unchanged.

## Capabilities

### New Capabilities

<!-- None: all changes refine the existing member-directory capability. -->

### Modified Capabilities

- `member-directory`: Update member creation dialog flow to a 3-step wizard with `done` QR state, step-scoped validation, discard confirmation, responsive sheet/dialog layout, and updated Photo step camera lifecycle (`user` default, camera switch, horizontal mirroring on front capture, auto-start/cleanup).

## Impact

- **UI Components**: `src/components/rollcall/members/member-directory.tsx`, `src/components/rollcall/members/use-member-camera.ts` (and new wizard/step subcomponents under `src/components/rollcall/members/`).
- **Tests**: `src/components/rollcall/members/member-directory.test.tsx` and E2E member creation tests in `e2e/`.
- **APIs / Backend**: None — `createMember` in `src/app/actions.ts`, `uploadMemberPhoto`, and `qrcode` generation remain unchanged.
