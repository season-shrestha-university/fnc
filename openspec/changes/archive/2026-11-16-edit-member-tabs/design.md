# Design

## Context

Currently, `src/components/rollcall/members/member-directory.tsx` manages member creation through `CreateMemberWizardDialog` (`src/components/rollcall/members/create-member-wizard-dialog.tsx`) while editing still uses an inline `isFormOpen` modal form (lines 512–708) with leftover create-mode branches, no dirty-state tracking, no discard confirmation, and camera controls appended at the bottom of a single scrolling form.

See `proposal.md` for motivation and `specs/member-directory/spec.md` for behavioral requirements. Design references live in `prototype/rollcall-member-edit/` (`DEV-NOTES.md`, `index.html`, `styles.css`, `app.js`).

## Goals / Non-Goals

**Goals:**
- Extract a dedicated `EditMemberDialog` (`src/components/rollcall/members/edit-member-dialog.tsx`) sharing the responsive dialog shell and `PhotoStep`, `DetailsStep`, and `ContactStep` subcomponents via `mode="edit"`, removing `isFormOpen` and its obsolete create branch from `member-directory.tsx`.
- Own all edit state (`step`, `photoSubState`, `initialSnapshot`, current `values`, `pictureUrl`, `photoFile`, `isCameraPhoto`, `photoPreviewUrl`, `errors`, `isSubmitting`, `showDiscardConfirm`) in `EditMemberDialog` so tab switching preserves every edit and `dirty` state is always derived accurately from the opening snapshot.
- Guarantee deterministic `MediaStream` cleanup on capture, upload, `Cancel camera`, tab switching, dialog close, and unmount, without ever auto-starting the camera on dialog open or `portrait` view.
- Support save-from-anywhere with immediate empty-name validation, email validation on save, server error routing, and `"Discard changes?"` confirmation only when dirty.

**Non-Goals:**
- Modifying `updateMember` (`src/app/actions.ts`), `uploadMemberPhoto`, `useMemberCamera` internals, database schema, or member fields.
- Adding a `Done` completion step or QR generation view to edit mode.
- Changing `CreateMemberWizardDialog` behavior or create-mode copy/validation.

## Decisions

1. **Extract `EditMemberDialog` and parameterize `PhotoStep`, `DetailsStep`, and `ContactStep` with `mode?: "create" | "edit"`**
   - *Decision*: Create `src/components/rollcall/members/edit-member-dialog.tsx` mirroring `CreateMemberWizardDialog`'s outer mount/unmount wrapper (`if (!member) return null; return <EditMemberContent key={member.id} ... />`) and shared shell (`100dvh` full-screen mobile sheet / `600px` desktop dialog). Extend `PhotoStep`, `DetailsStep`, and `ContactStep` with `mode?: "create" | "edit"` (defaulting to `"create"` so `CreateMemberWizardDialog` stays untouched).
   - *Rationale*: Reusing the step components avoids duplicating form inputs, labels, accessibility wiring, and camera preview markup, while keeping `EditMemberDialog` cleanly separated from create-wizard-specific `DoneStep` and `"Step n of 3"` progress state.
   - *Alternative considered*: Turning `CreateMemberWizardDialog` into a dual-purpose create/edit component. Rejected because create has a linear 3-step + `done` state machine with optional `memberId` and `Skip for now`, whereas edit has free tab navigation, snapshot dirty checks, an identity header row, and a sticky save/cancel footer on every tab.

2. **Parent-Owned Snapshot & Per-Section Dirty Computation**
   - *Decision*: When `EditMemberDialog` mounts for a `DirectoryMember`, initialize both `initialSnapshot` (immutable for the dialog session) and working state (`values`, `pictureUrl`, `photoPreviewUrl`). Compute `dirty` per section as pure derived booleans:
     - `photo`: `photoFile !== null || currentPictureUrl !== initialSnapshot.pictureUrl`
     - `details`: `values.name.trim() !== initialSnapshot.name.trim() || values.dob.trim() !== initialSnapshot.dob.trim()`
     - `contact`: `values.email !== initialSnapshot.email || values.phone !== initialSnapshot.phone || values.address !== initialSnapshot.address`
   - *Rationale*: Deriving dirty flags from the snapshot ensures reverting a field or removing a newly added photo when the member originally had none automatically clears the tab's 7px teal dot and disables `Save changes`.
   - *Alternative considered*: Maintaining manual `dirtyFields` boolean flags on `onChange`. Rejected because reverting edits back to original values would leave stale dirty dots and trigger false discard confirmations.

3. **Shared Step Adaptations for `mode="edit"`**
   - **`PhotoStep`**: Add `"portrait"` to `PhotoSubState` (`"camera" | "captured" | "portrait"`). In edit mode, default `photoSubState` to `"portrait"`.
     - In `"portrait"`, render `Member photo` (if `photoPreviewUrl` is non-empty) or `Add a photo` (if empty) with the helper `"Volunteers use this to recognise them at the door."`, the portrait preview (or default user icon), `Retake` / `Take photo` (switches `photoSubState` to `"camera"`), `Upload new` (`accept="image/*"`), and `Remove photo` (shown only when `photoPreviewUrl` is non-empty; clears `photoFile`, `pictureUrl`, and revokes any `blob:` URL). No `Skip` button is rendered.
     - In `"camera"`, render `"Take a new photo"`, the live camera preview (reusing `useMemberCamera({ initialFacingMode: "user", notifyOnError: false, ... })`), `Upload new`, `Take photo` (captures via `capturePhoto` and transitions to `"portrait"` with the new `blob:` preview), and `Cancel camera` (stops camera and returns to `"portrait"` without modifying `photoFile` or `pictureUrl`).
     - In edit mode, `PhotoStep` renders without its create-mode footer; `EditMemberDialog` owns the shared sticky footer across all three tabs.
   - **`DetailsStep`**: When `mode === "edit"`, hide the create-mode `"who"` preview card (moved to dialog header) and render `Member ID` with `readOnly`, `disabled`, `aria-readonly="true"`, lock icon, and muted styling, omitting the create-mode footer.
   - **`ContactStep`**: When `mode === "edit"`, hide `"You’re adding"` summary chips and omit the create-mode footer.

4. **Header, Tablist, and Save-From-Anywhere Footer**
   - *Header*: Left-positioned circular `Close` (`X`) button (matching prototype `DEV-NOTES.md` and mobile header pattern), `"Edit member"` title, followed by the live identity row (48px avatar thumbnail using `photoPreviewUrl` or default user icon, live trimmed `values.name || "Unnamed member"` in muted style when empty, and `memberId` lock chip with `"can’t be changed"`).
   - *Tablist*: `role="tablist"` with three `role="tab"` buttons (`Photo`, `Details`, `Contact`) showing a 4px teal bar when active, teal-dark label, and 7px teal dot when that section is dirty. Support `ArrowLeft` / `ArrowRight` keyboard navigation between tabs in addition to direct click. Switching away from `Photo` while in `camera` sets `photoSubState = "portrait"` and unmounts `PhotoStep`, firing the `useEffect` cleanup that calls `stopCamera()`.
   - *Footer*: Rendered by `EditMemberDialog` on all tabs (and `<form>` wrapping or form `id` linkage so Enter in inputs triggers Save if valid, or direct `onClick` on `Save changes`). Includes optional previous/next section text links (`← Photo`, `Details →`, etc.), `Cancel` (`requestClose`), and `Save changes` (`disabled={!canSave || isSubmitting}`, with `#C5CDD0` fill when disabled, spinner + `"Saving…"` when submitting).

5. **Validation, Submission, and Error Routing**
   - *Immediate Name Validation*: On `Details` `name` change in edit mode, if `!value.trim()`, immediately set `errors.name = "Enter the member's name"` (red border, `aria-invalid`, `aria-describedby`), leaving focus on the input and disabling `Save changes`; as soon as `value.trim()` is non-empty, clear `errors.name`.
   - *Save Validation & Server Routing*: On `Save changes`, validate trimmed `name` (if somehow invoked while empty, stay open, switch to `details`, show name error, focus `name`) and validate `email` via `validateContactFields` (if invalid, stay open, switch to `contact`, show email error without leaking Contact errors onto Details). On `updateMember` / `uploadMemberPhoto` error, re-enable Save, preserve all values, and use `routeServerErrorToStep` (with edit-mode name message `"Enter the member's name"` and no `memberId` routing since `memberId` is never sent/edited).
   - *Success*: Call `onUpdated(updated)` (updating `optimisticMembers` in `member-directory.tsx`), close the dialog, reset local state, and show `onMessage(\`Updated ${updated.name}\`, "success")`.

6. **Discard Confirmation & Dismissal**
   - Intercept `X`, `Cancel`, `Esc`, and scrim `onMouseDown`: ignore while `isSubmitting`; if `!isDirty`, close immediately; if `isDirty`, open the inside-dialog `alertdialog` (`"Discard changes?"`, `"You have unsaved edits for ${initialSnapshot.name}. Closing now will lose them."`, `Keep editing` / `Discard`). `Esc` while the discard sheet is open dismisses only the sheet.

## Risks / Trade-offs

- **Existing tests in `member-directory.test.tsx` target the legacy inline edit form** → Existing camera and file upload tests in `member-directory.test.tsx` currently click `"Take photo"` / `"Capture"` / `getByLabelText("Photo")` in the old inline modal and assert `facingMode: "environment"` and toast errors. Updating those tests (and adding dedicated coverage in `edit-member-dialog.test.tsx`) ensures the new portrait-first `EditMemberDialog` flow and `facingMode: "user"` inline camera error behavior are verified cleanly.
- **Switching tabs while `PhotoStep` is in `camera` sub-state** → Resetting `photoSubState` to `"portrait"` on tab switch (in addition to `PhotoStep`'s unmount `useEffect` calling `stopCamera()`) guarantees both that all `MediaStream` tracks stop immediately and that returning to `Photo` opens in `portrait` rather than unexpectedly restarting the camera.
- **Form submission via Enter key inside `DetailsStep` / `ContactStep`** → Because the `Save changes` button lives in `EditMemberDialog`'s shared footer outside the inner step fields, either keep the `<form>` inside `EditMemberDialog` wrapping the active step content + footer (when `step !== "photo"` or across all steps with `type="submit"` only on `Save changes`) or bind `form="edit-member-form"` so pressing Enter in a text input submits consistently when `canSave` is true.
