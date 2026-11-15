# Design

## Context

Currently, `src/components/rollcall/members/member-directory.tsx` uses a single modal dialog for both creating and editing members (`isFormOpen` + `editingMember`). On creation, `createMember` (`src/app/actions.ts`) returns the persisted `DirectoryMember` (including the server-assigned `memberId` when left blank), and `member-directory.tsx` closes the form dialog and opens a separate QR modal (`selectedMember`).

This change replaces only the **Create a member QR** dialog UI and state with a 3-step wizard (`photo` → `details` → `contact` → `done`) matching the design reference in `prototype/rollcall-member-wizard/` (`index.html`, `styles.css`, `app.js`, `DEV-NOTES.md`, and `shots/`), while leaving the Edit Member dialog, `createMember` server action, `uploadMemberPhoto`, and `QRCode.toDataURL` generation unchanged.

## Goals / Non-Goals

**Goals:**
- Own all wizard state (`step`, `photoSubState`, form fields, `photo` Blob/File + object URL, field errors, `isSubmitting`, `createdMember`, discard confirmation) in the parent `CreateMemberDialog` component so unmounting/mounting individual step views never loses user input.
- Guarantee deterministic `MediaStream` cleanup (`stream.getTracks().forEach(t => t.stop())`) via `useEffect` cleanup on capture, skip, step navigation, dialog close, and unmount.
- Support front/rear camera switching (`facingMode: 'user'` default, toggleable to `'environment'` when `enumerateDevices` reports `> 1` video input) with horizontal mirroring for front-camera canvas captures.
- Provide step-scoped validation, accessible focus/aria-live announcements, discard confirmation on non-empty close/Esc, and responsive mobile sheet (`< 640px`) / desktop `600px` dialog layout.

**Non-Goals:**
- Modifying `createMember`, `updateMember`, `uploadMemberPhoto`, database schema, or QR code generation algorithms.
- Changing the Edit Member profile dialog flow.
- Adding new member fields beyond `name`, `memberId`, `dob`, `email`, `phone`, `address`, and `photo`.

## Decisions

1. **Extract `CreateMemberWizardDialog` from `member-directory.tsx`**
   - *Decision*: Keep the Edit Member dialog in `member-directory.tsx` (or a sibling component) and build a dedicated `CreateMemberWizardDialog` (with `PhotoStep`, `DetailsStep`, `ContactStep`, `DoneStep` subcomponents) under `src/components/rollcall/members/`.
   - *Rationale*: `member-directory.tsx` is already 845 lines. Isolating the 3-step wizard state machine, step subcomponents, and discard confirmation keeps `member-directory.tsx` clean and makes unit testing the wizard straightforward.
   - *Alternative considered*: Adding conditional step logic inside the existing `isFormOpen` modal. Rejected because create and edit now have fundamentally different layouts, lifecycles, and completion states (`done` QR view vs simple save).

2. **Single Parent Form State with Unmounting Steps**
   - *Decision*: Store `{ name, memberId, dob, email, phone, address, photoFile }` and `photoPreviewUrl` in `CreateMemberWizardDialog` state (or a `useReducer`). Each step component mounts only when active and reads/writes via props/callbacks.
   - *Rationale*: Matches the requirement that steps unmount/mount on navigation (ensuring the Photo step's camera `useEffect` cleanly starts on mount and stops all tracks on unmount) while preserving every typed value and captured photo across `Back`/`Next`/chip jumps.

3. **Camera Lifecycle & Mirroring**
   - *Decision*: Extend `useMemberCamera` (or create a wizard-aware camera hook) to accept `facingMode` (`'user'` default), `autoStart`, and `onCapture(file)`. When `PhotoStep` mounts in `camera` sub-state, an effect requests `getUserMedia({ video: { facingMode } })`, probes `navigator.mediaDevices.enumerateDevices()` for `videoinput` count `> 1` to show/hide the switch-camera button, and returns a cleanup function that stops all tracks.
   - *Mirroring & Encoding*: Preview `<video>` uses CSS `scale-x-[-1]` when `facingMode === 'user'`. On capture, the canvas context applies `ctx.translate(width, 0); ctx.scale(-1, 1)` for `'user'` so the captured image matches the preview, then encodes via `canvas.toBlob(..., 'image/jpeg', 0.85)` (or existing `canvasToCompressedPhotoFile` in `member-photo-utils.ts` for WebP/JPEG compression) and passes the resulting `File` to parent state.
   - *Fallback*: Any `NotAllowedError`, `NotFoundError`, insecure context, or `getUserMedia` error sets an inline unavailable state displaying `"Camera not available. Upload a photo instead."` while keeping `<input type="file" accept="image/*">` and `Skip for now` active.

4. **Validation & Server Error Routing**
   - *Decision*: Validate `name.trim()` and `memberId` format (if any existing check) on `Details` `Next`, and `email` format (via HTML/regex check) on `Contact` `Create & generate QR` (without ever disabling the button). On submit, run full-form validation as defence in depth. If `createMember` throws an error matching a specific field (e.g., `"Member ID ... is already in use"` → `memberId`), set the field error and jump `step` back to `'details'` (or `'contact'` for email/phone errors); otherwise display the error banner on `'contact'`.
   - *Rationale*: Ensures users never get stuck with an invisible validation error on a non-active step.

5. **Submission, Done State & List Refresh**
   - *Decision*: On `Create & generate QR`, set `isSubmitting = true` (disabling footer buttons, showing spinner + `"Creating…"`, ignoring close/Esc). Upload `photoFile` (if present) via `uploadMemberPhoto`, then call `createMember`. On success, update optimistic members in `member-directory.tsx`, store `createdMember`, and set `step = 'done'`.
   - In `DoneStep`, generate the QR data URL from `createdMember.memberId` using `QRCode.toDataURL` (reusing the same options as `member-directory.tsx`) and reuse the existing PNG download (`<memberId>-qr.png`) and print behavior. `Add another member` revokes any `blob:` URL, resets form/errors/createdMember, sets `step = 'photo'` (with `camera` sub-state), and triggers `router.refresh()` in the background. `Done` closes the dialog and triggers `router.refresh()`.

6. **Prototype UI Structure & Responsive Sheet / Dialog**
   - *Decision*: Follow the visual structure in `prototype/rollcall-member-wizard/`:
     - **Header & Progress**: Top bar with RollCall mark (`desktop`) / circular `44px+` close button and title (`"Create a member QR"` for steps 1–3, `"Member created"` for `done`). Segmented 3-bar progress indicator (`Step n of 3 · <name>`) hidden on `done`.
     - **Step 1 (`Photo`)**: `"Add a photo"` + helper `"Volunteers use this to recognise them at the door."`; dark camera box with dashed `3:4` oval guide, `"Camera on"` live pill, `"Line their face up with the oval"` tag, and `44px` switch-camera button; `captured` sub-state shows `"Photo added"` pill. Footer: `Take photo` / `Upload from device` / `Skip for now` (`camera`), or `Retake` / `Next` (`captured`).
     - **Step 2 (`Details`)**: `"Member details"`, live-updating preview card (64px avatar, `name` / `"New member"`, `memberId` / `"No member ID yet"`, `"Change"` / `"Add photo"` button), and icon-prefixed inputs for `Name *`, `Member ID` (`MEMBER-001`), and `Date of birth`.
     - **Step 3 (`Contact`)**: `"Contact details"` with `"Optional"` pill, icon-prefixed `Email`, `Phone`, and multiline `Address` (`textarea`), `"You’re adding"` summary chips (`Photo`/`No photo` → `Photo`, other chips → `Details`), and `Back` / `Create & generate QR` footer.
     - **Done**: Check badge + `"<name> is set up"`, QR card with person header, existing `QRCode.toDataURL` image, `<memberId> · RollCall` caption, and `Download QR` (`<memberId>-qr.png`), `Add another member`, `Done` (+ print) actions.
     - **Responsive Layout**: On `< 640px` (`max-sm`), full viewport (`inset-0 h-[100dvh] w-full rounded-none flex flex-col`) with scrollable body and `sticky bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]` footer; on `sm:` (`>= 640px`), centered `max-w-[600px]` dialog with single-row footer (`Skip for now` on the left, `Back`/`Next` on the right).
   - *Focus & Live Region*: Maintain an `aria-live="polite"` region announcing `"Step n of 3, <name>"` on step transitions, and use a `ref` to focus the step heading (with `tabIndex={-1}`) or first input on step change. All footer/primary buttons use `h-14` (`56px`) and interactive controls use `min-h-11 min-w-11` (`44px`).

## Risks / Trade-offs

- **Camera hardware/permission differences across browsers** → `enumerateDevices()` may return empty labels or 0–1 devices before permission is granted; probe devices after `getUserMedia` resolves (and on `devicechange`) so the switch-camera button visibility updates accurately.
- **Unsaved changes on Esc / backdrop click** → `@base-ui/react` `Dialog` handles `Esc` and backdrop dismissal via `onOpenChange`. Intercept `onOpenChange(false)` when `isSubmitting` (block) or when `hasFormValues && step !== 'done'` (open inline discard confirmation instead of closing).
