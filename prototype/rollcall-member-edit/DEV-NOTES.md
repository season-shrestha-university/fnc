# Edit member: 3-section flow (dev notes)

Design reference: `index.html` (all screens), `prototype.html` (clickable), PNGs in `shots/`.
This is a behaviour change, not a restyle of the current single-scroll form. Keep the existing `updateMember` action and photo upload as they are. Only the edit dialog’s UI and state change.

Recommend this goes through **OpenSpec propose / apply** first. The designer’s styling pass on the real component comes after the flow works.

## Why this is not a linear wizard

Create is a walk: Photo → Details → Contact → Done. Editing is not. Volunteers usually change one thing (a phone number, a photo) and save. Forcing them through Next/Back to reach Save would be worse than today’s single form.

Use the same three sections — Photo, Details, Contact — but as **tappable tabs**. Open on **Photo** (mirrors create). Save is available from every section.

## Reuse the create wizard

Do not grow the inline `isFormOpen` form in `src/components/rollcall/members/member-directory.tsx`. Extract an `EditMemberDialog` (same shell as `CreateMemberWizardDialog`) and reuse the step components with a `mode="edit"` prop:

- `PhotoStep` — in edit, default sub-state is `portrait` (current / empty photo), not `camera`. Actions are Retake, Upload new, Remove photo. Camera is the same as create, but only after Retake or Take photo. There is no Skip.
- `DetailsStep` — same Name and Date of birth fields. Hide the “who” preview card (identity now lives in the dialog header). Member ID is read-only (lock icon, muted field). The create-mode ID input stays editable.
- `ContactStep` — same Email, Phone, Address fields. Hide the “You’re adding” chips (those are for create). The footer is not “Create & generate QR”.
- There is no Done step. On success, close and show the existing toast `Updated ${name}`.

Shared form types, validation helpers, `useMemberCamera`, and `uploadMemberPhoto` can stay as they are. Camera must still stop in the effect cleanup.

## Fields (unchanged)

`name` (required), `memberId` (read-only, already `disabled` / `readOnly` in today’s edit form), `dateOfBirth`, `email`, `phone`, `address`, `photo` (keep, replace, or remove).

Do not add fields. Member ID is never sent as a change — `updateMember` already omits it. Email and phone validation stay whatever they are now (create already checks email format in `validateContactFields`).

## State

- One form state for the whole dialog, owned by the dialog, not by each section. Snapshot `initialValues` (including `pictureUrl`) when `openEditDialog` runs.
- `step: 'photo' | 'details' | 'contact'`. Photo has a sub-state: `portrait` | `camera`. After a capture or upload, return to `portrait` with the new preview. Do not stay on a “captured / Next” create state.
- `dirty` is computed per section against the snapshot:
  - Photo: new file, or `pictureUrl` cleared (Remove photo), or a replacement of the original url.
  - Details: `name` or `dob` changed (trim before compare).
  - Contact: `email`, `phone` or `address` changed.
- A 7px teal dot on a tab means that section is dirty. Dots persist while the user is on another tab.
- Values live in the parent, so switching tabs never loses typing. Verify: change Phone, go to Photo, come back, the new number is still there.

## Header and tabs

- Title is **Edit member**. Close (X) on the left, same as create.
- Under the title: current avatar (or the default avatar if there is no photo), live name, and a read-only Member ID chip with a lock icon and the hint “can’t be changed”. The name in this row updates as the user types. If Name is emptied, show “Unnamed member” in the muted style.
- The 3-segment indicator becomes a `tablist`. Each segment is a button (bar + label). The current tab’s bar is teal and the label is teal-dark. There is no “Step n of 3” copy — this is not a sequence.
- Tabs are always enabled. Keyboard: left/right between tabs is nice to have; each tab is already a focusable button.

## Footer (every section)

- Sticky, same safe-area treatment as create (`position: sticky; bottom: 0` plus `env(safe-area-inset-bottom)`).
- Primary: **Save changes**, 56px, teal. **Disabled** until something is dirty **and** Name is non-empty (after trim). Disabled style is the grey `#C5CDD0` fill, not a faded teal.
- Secondary: **Cancel** (outline). Same action as Close.
- Optional text links above the buttons: previous / next section labels (e.g. “Photo” ←, “Contact” →). These only switch tabs. They are not a substitute for Save.
- While submitting: disable Cancel, Close and Save; Save shows a spinner and “Saving…”. Block dismiss (Esc, scrim) until the request finishes.

## Navigation and dismiss

| Action | Result |
|---|---|
| Tab button or Back/Next text | Switch section. Stop the camera if leaving Photo while it is in `camera`. |
| Retake / Take photo | Photo → `camera`. Start `getUserMedia`. |
| Take photo / Upload new (from camera or portrait) | Store file, preview, back to `portrait`. Photo is dirty. |
| Cancel camera | Back to `portrait` without changing the photo. Stop the stream. |
| Remove photo | Clear file and `pictureUrl`. Photo is dirty. Show the empty portrait and “Add a photo”. |
| Close (X), Cancel, Esc, scrim click, with no dirty fields | Close immediately, same as `closeFormDialog` today. |
| Same actions, with dirty fields | Show the discard sheet. Do not close. |
| Save, valid | Call `updateMember`, then close and toast. |
| Save, Name empty | Should not be clickable. If it is, stay put, switch to Details, show the Name error, focus the field. |
| Save, email invalid | Stay open, switch to Contact, show the existing email error. |

## Validation

- **Name is required.** If the field is emptied, show the inline error immediately: “Enter the member’s name”. Red border, `aria-invalid`, error linked with `aria-describedby`, focus stays on the field. Clear the error as soon as they type a non-whitespace character. This is slightly different from create (“…to continue”), because they are not walking to the next step.
- Run existing email format checks on Save (and on blur if that already happens). Do not show Contact errors on the Details tab.
- On a server error, stay open, keep every value, jump to the section that owns the field if you can route it (`routeServerErrorToStep` already maps name / email). There is no Member ID error path on edit, because the field cannot change.

## Camera lifecycle

Create starts the camera when the Photo step mounts in `camera`. Edit must **not** start the camera when the dialog opens, or when the Photo tab is selected in `portrait`.

- Start the stream only when Photo enters `camera` (Retake / Take photo).
- **Stop every track** when: a photo is captured or uploaded, Cancel camera, the user switches tab, the dialog closes, or the component unmounts. Put this in the effect cleanup so the camera light never stays on after a tab change.
- Capture, switch-camera, permission-denied and file-input behaviour are the same as create (`useMemberCamera`, `uploadMemberPhoto`, `accept="image/*"`).
- Revoke object URLs on replace, remove, close and unmount, same as today.

## Submit

- “Save changes” calls the **existing** `updateMember` with the same payload as `handleSubmitMember` in `member-directory.tsx` (`id`, `name`, `email`, `phone`, `address`, `dob`, `pictureUrl`). Upload a new file first when there is one; if the photo was removed, send an empty `pictureUrl`.
- Keep the optimistic directory update that already happens after a successful edit.
- On success: close the dialog, reset local edit state, show the existing success toast: `Updated ${updated.name}`.
- On failure: stay on the current (or routed) section, show the error, keep every value, re-enable Save.

## Discard sheet

Reuse the create wizard’s `alertdialog` pattern (scrim + card inside the dialog). Copy is different, because this is an existing member:

- Title: **Discard changes?**
- Body: **You have unsaved edits for {original name}. Closing now will lose them.**
- **Keep editing** (outline) closes the sheet and leaves the form as it was.
- **Discard** (destructive) closes the dialog and drops the edits. Do not call `updateMember`.
- Esc on the sheet closes the sheet only (Keep editing), same as create.
- Compare against the snapshot taken on open, not against empty values. Opening edit and closing immediately must not confirm.

## Layout notes

- Mobile (< 640px): full-screen sheet, same as create. Footer sticky. Content scrolls above it.
- Desktop: 600px dialog, same shell as create. Footer in one row: Cancel on the left, Save on the right. Tabs stay at the top.
- Focus: move focus to the section heading (or the first field on Details / Contact) on tab change. Announce “Photo”, “Details” or “Contact” with `aria-live="polite"`.
- Buttons are 56px high, and every target is at least 44px, including tabs and “Remove photo”.

## Mapping to today’s edit code

All of this currently lives in `member-directory.tsx`:

- `openEditDialog` — keep as the opener; it already seeds `memberForm` and `photoPreviewUrl` from the member. Also store that snapshot for dirty checks, then open `EditMemberDialog` instead of `isFormOpen`.
- `handleSubmitMember` — move into the dialog; payload and toast stay the same. Today’s form still has a create branch in the button label, but create already goes through `CreateMemberWizardDialog`. The leftover create path in this form can be deleted once edit is extracted.
- `closeFormDialog` — stop the camera and clear state as it does now, but only after the discard check.
- `applyPhotoFile` / `clearPhoto` / `handlePhotoChange` / `useMemberCamera` — reuse, with the camera no longer starting from a control at the bottom of a long form.
- Member ID `readOnly` + `disabled` — keep, and surface it as the locked field + header chip.

## Checks worth writing

- Opening edit and closing with no edits does not show the discard sheet.
- Changing only Phone enables Save, dots only the Contact tab, and Save works from the Photo tab.
- Emptying Name shows the error and disables Save; typing a name clears the error and re-enables Save if anything is still dirty.
- Reverting every field to the snapshot disables Save and clears the dots.
- Remove photo, then Save, persists an empty picture.
- Switching away from the camera tab stops the stream (the camera light goes off).
- Esc with dirty fields opens the sheet; Esc on the sheet returns to the form.
