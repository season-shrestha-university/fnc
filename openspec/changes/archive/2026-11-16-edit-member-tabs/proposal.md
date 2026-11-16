# Proposal

## Why

The current Edit Member modal in `src/components/rollcall/members/member-directory.tsx` is a single long scrolling form that still carries leftover create-mode branches, lacks dirty-state tracking or discard protection, and places camera controls at the bottom of a long form. Replacing it with a dedicated 3-section tabbed dialog (`Photo`, `Details`, `Contact`) matching the `CreateMemberWizardDialog` shell lets volunteers jump straight to any section and save from anywhere without being forced through a linear Next/Back wizard.

## What Changes

- Extract an `EditMemberDialog` component sharing the responsive shell and `PhotoStep`, `DetailsStep`, and `ContactStep` components via `mode="edit"`, and remove the legacy inline `isFormOpen` form (and its obsolete create-mode branch) from `src/components/rollcall/members/member-directory.tsx`.
- Replace the linear wizard progress header with a live member identity row (current/updated avatar, live name or `"Unnamed member"`, and read-only Member ID chip with lock icon and `"can’t be changed"` hint) and three always-enabled tappable tabs (`Photo`, `Details`, `Contact`), opening on `Photo` with no `Done` completion step.
- Default `PhotoStep` in edit mode to the `portrait` sub-state (`Member photo` / `Add a photo`) with `Retake`/`Take photo`, `Upload new`, and `Remove photo` (no `Skip`), starting `useMemberCamera` only when entering `camera` and stopping all stream tracks on capture, upload, `Cancel camera`, tab change, close, or unmount.
- Store all edit form fields, photo state, and an `initialValues` snapshot (including `pictureUrl`) in `EditMemberDialog` so tab switching never loses edits, each modified section displays a 7px teal dirty indicator dot, and closing (`X`, `Cancel`, `Esc`, or scrim click) prompts `"Discard changes?"` only when dirty.
- Render a sticky footer on every section with `Cancel`, optional previous/next section tab links, and `Save changes` (disabled with `#C5CDD0` fill unless at least one section is dirty and trimmed `name` is non-empty; showing a spinner and `"Saving…"` while submitting and blocking dismissal).
- Validate `name` immediately when emptied (`"Enter the member’s name"`), validate email format on Save (routing to `Contact`), route server errors to the owning section, and on success close, update the optimistic directory list, and show the existing `"Updated ${updated.name}"` toast.
- Keep `updateMember`, `uploadMemberPhoto`, `useMemberCamera`, and member fields (`name`, read-only `memberId`, `dob`, `email`, `phone`, `address`, `photo`) unchanged.

## Capabilities

### New Capabilities

<!-- None: all changes refine the existing member-directory capability. -->

### Modified Capabilities

- `member-directory`: Replace the single-scroll Edit Member modal with a 3-tab (`Photo`, `Details`, `Contact`) edit dialog with portrait-first camera lifecycle, snapshot-based dirty tracking, save-from-anywhere footer, immediate name validation, and unsaved-changes discard confirmation while preserving immutable `member_id` and existing `updateMember` / `uploadMemberPhoto` behavior.

## Impact

- **UI Components**: `src/components/rollcall/members/member-directory.tsx`, new `src/components/rollcall/members/edit-member-dialog.tsx`, and shared wizard/edit types and steps (`src/components/rollcall/members/create-member-wizard-types.ts`, `wizard-steps/photo-step.tsx`, `wizard-steps/details-step.tsx`, `wizard-steps/contact-step.tsx`).
- **Tests**: `src/components/rollcall/members/member-directory.test.tsx` (updating existing edit/camera assertions to the new dialog interactions) and new `EditMemberDialog` tests (`src/components/rollcall/members/edit-member-dialog.test.tsx`).
- **APIs / Backend**: None — `updateMember` in `src/app/actions.ts` and `uploadMemberPhoto` remain unchanged.
