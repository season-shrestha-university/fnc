# Proposal

## Why

The current event create and update experience in `src/components/rollcall/events/event-dialogs.tsx` uses a single-scroll dialog for both modes, validates missing event names with a toast instead of inline field errors, closes the edit dialog before confirming deletion, and sends newly created events straight back to the list without a direct path into door check-in. Splitting creation into a guided two-step wizard (`Basics` → `Check-in fields` → `Done`) and editing into a two-tab dialog (`Basics` | `Check-in fields`) with inline validation, dirty tracking, and layered confirmation sheets streamlines setup on mobile while letting volunteers edit any setting and save from either tab.

## What Changes

- Replace the shared single-scroll dialog in `src/components/rollcall/events/event-dialogs.tsx` with a dedicated `CreateEventWizardDialog` (`step: 'basics' | 'fields' | 'done'`, titled **Create event**) and `EditEventDialog` (`step: 'basics' | 'fields'`, titled **Edit event**) sharing the responsive dialog shell and `BasicsStep` / `FieldsStep` components (`mode="create" | "edit"`).
- **Create flow (`CreateEventWizardDialog`)**:
  - Step 1 (`Basics`): required `Event name` and native `type="date"` `Date` (defaulting to today via `getCurrentDate()`), with **Cancel** / **Next** footer. Pressing **Next** with an empty or whitespace name keeps focus on `Basics` and shows inline error **“Give the event a name”** (replacing the toast), clearing as soon as non-whitespace text is typed.
  - Step 2 (`Check-in fields`): summary row showing event name and formatted date with an **Edit** link back to `Basics`, heading **“What should we record at the door?”**, locked non-interactive rows for `Name` and `Member ID` (**“Always recorded”**), and full-row toggle buttons (`Email`, `Phone`, `Address`, `Date of birth`, `Photo`), with **Back** / **Create event** footer.
  - Step 3 (`Done`): confirmation screen showing a check mark, event name, formatted date, **“Event created”**, primary **Start check-in** (navigating to `/events/${savedId}/check-in` using the ID returned by `saveEvent`), and secondary **Back to events** (closing the dialog and staying on `/events`, without a competing toast while on the Done screen).
- **Edit flow (`EditEventDialog`)**:
  - Always-enabled tappable `Basics` and `Check-in fields` tabs opening on `Basics`, with form state and an `initialValues` snapshot owned by the dialog so switching tabs never loses edits, and a 7px teal dot on each tab whose section differs from the snapshot.
  - Sticky single-action footer (**Save changes**, 56px, `#C5CDD0` disabled fill) enabled only when at least one section is dirty and trimmed `name` is non-empty; emptying `Name` shows **“Give the event a name”** immediately.
  - Quiet red **Delete event** text button at the bottom of `Basics` only that opens the **Delete {original name}?** confirmation sheet as an `alertdialog` overlay on top of the edit dialog (preserving the edit form if cancelled) rather than closing the edit dialog first.
- Add an `alertdialog` **Discard changes?** confirmation sheet inside both dialogs when closing (`Close (X)`, `Cancel`, `Esc`, or scrim click) with unsaved changes (any dirty section in edit; non-empty name, non-today date, or any optional toggle on in create), while blocking dismissal and showing loading states (**“Creating…”**, **“Saving…”**, **“Deleting event…”**) during in-flight requests.
- Update `src/components/rollcall/events/events-view.tsx` to use `CreateEventWizardDialog` (capturing the returned `savedId` from `saveEvent`) and `src/components/rollcall/check-in/check-in-view.tsx` to use `EditEventDialog` for the active event (and `CreateEventWizardDialog` for its no-active-event fallback).
- Keep `saveEvent({ id?, name, eventDate, trackedFields })`, `deleteEvent`, `trackedFieldOptions`, `requiredTrackedFields`, and `defaultTrackedFields` unchanged.

## Capabilities

### New Capabilities

<!-- None: all changes refine the existing event-attendance-tracking capability. -->

### Modified Capabilities

- `event-attendance-tracking`: Replace the single-scroll event create/update/delete dialogs with a 2-step create wizard (`Basics` → `Check-in fields` → `Done` with post-create navigation to `/events/${savedId}/check-in`), a 2-tab edit dialog (`Basics` | `Check-in fields`) with snapshot-based dirty indicators and save-from-anywhere footer, inline required-name validation (**“Give the event a name”**), unsaved-changes discard confirmation sheets, and an overlaid delete confirmation sheet on the edit dialog's `Basics` tab.

## Impact

- **UI Components**: `src/components/rollcall/events/events-view.tsx`, `src/components/rollcall/check-in/check-in-view.tsx`, replacing or refactoring `src/components/rollcall/events/event-dialogs.tsx` into `CreateEventWizardDialog`, `EditEventDialog`, and shared step/state modules under `src/components/rollcall/events/`.
- **Tests**: Update/replace `src/components/rollcall/events/event-dialogs.test.tsx` and update `src/components/rollcall/check-in/check-in-view.test.tsx` (and add coverage for `EventsView` / create wizard / edit dialog flows).
- **APIs / Backend / Shared Utils**: None — `saveEvent` and `deleteEvent` in `src/app/actions.ts` and `trackedFieldOptions` / `requiredTrackedFields` / `defaultTrackedFields` in `src/components/rollcall/shared/member-utils.ts` remain unchanged.
