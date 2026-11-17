# Design

## Context

See [proposal.md](./proposal.md) for motivation and scope. Currently, `src/components/rollcall/events/event-dialogs.tsx` renders a single-scroll Radix `Dialog` shared by `EventsView` (create) and `CheckInView` (edit + separate delete `Dialog`), with state split across parent view components and validation handled via toasts. Meanwhile, the member management flows (`CreateMemberWizardDialog` and `EditMemberDialog` in `src/components/rollcall/members/`) already establish the repo's responsive mobile-sheet / 600px desktop-dialog shell, `alertdialog` discard overlay, tab dirty dots, and `#C5CDD0` disabled button conventions.

Constraints:
- Preserve `saveEvent({ id?, name, eventDate, trackedFields })` and `deleteEvent(eventId)` in `src/app/actions.ts`.
- Preserve `trackedFieldOptions`, `requiredTrackedFields` (`["Name", "Member ID"]`), and `defaultTrackedFields` in `src/components/rollcall/shared/member-utils.ts`.
- Preserve `getCurrentDate()` (`YYYY-MM-DD`) in `src/lib/date.ts` and UTC-safe calendar formatting (as in `LocalDate`).

## Goals / Non-Goals

**Goals:**
- Decouple create and edit into `CreateEventWizardDialog` and `EditEventDialog` sharing a consistent shell and reusable step components (`BasicsStep`, `FieldsStep`, `DoneStep`).
- Centralize form state, snapshot dirty tracking, validation, and confirmation sheet state inside each dialog component so callers only supply trigger/open state and async persistence callbacks.
- Guarantee zero data loss across step/tab switches, `Delete event` confirmation cancel, and failed server requests.
- Meet mobile-first door ergonomics (`56px` primary/footer buttons, `>= 44px` interactive targets, sticky safe-area footer, focus management, and `aria-live="polite"` step/tab announcements).

**Non-Goals:**
- Changing Supabase schema, `saveEvent`/`deleteEvent` server actions, or `trackedFieldOptions`.
- Adding new event fields beyond `name`, `eventDate`, and `trackedFields`.
- Implementing the post-behavior visual polish pass (explicitly deferred per prototype dev notes).

## Decisions

### 1. Component architecture: separate `CreateEventWizardDialog` and `EditEventDialog` with shared step components
- **Decision**: Replace `EventDialogs` in `src/components/rollcall/events/event-dialogs.tsx` (or split into `create-event-wizard-dialog.tsx`, `edit-event-dialog.tsx`, `event-form-types.ts`, and `event-steps/` under `src/components/rollcall/events/`) rather than adding conditional wizard/tab modes inside `EventDialogs`.
- **Rationale**: Mirrors `CreateMemberWizardDialog` + `EditMemberDialog` in `src/components/rollcall/members/`. Keeping create (`basics | fields | done`, 2-segment progress bar, Split footer) and edit (`basics | fields`, 2-tab `tablist` with dirty dots, single sticky Save footer, Delete link + sheet) in separate top-level dialogs avoids tangled conditional branches while letting `BasicsStep` and `FieldsStep` share markup via `mode="create" | "edit"`.
- **Alternatives considered**: Extending `EventDialogs` with a `variant` prop — rejected because parent callers previously owned raw field state and separate dialog props (`isDeleteEventOpen`), which caused the edit dialog to close before delete confirmation.

### 2. Parent-owned dialog state, snapshot comparison, and tracked-field normalization
- **Decision**: Mount inner dialog content conditionally when open (keyed by `event.id` in edit mode) so state initializes cleanly on open:
  - **Create**: `initialDate` is captured via `getCurrentDate()` on open. Dirty check for discard confirmation is `Boolean(name.trim()) || eventDate !== initialDate || hasAnyOptionalTrackedField(trackedFields)`.
  - **Edit**: Snapshot `{ name, eventDate, trackedFields }` is captured on open.
    - `basics` dirty: `name.trim() !== snapshot.name.trim() || eventDate !== snapshot.eventDate`.
    - `fields` dirty: symmetric set difference on optional fields (comparing `trackedFields` normalized with `requiredTrackedFields` always included, ignoring array ordering).
  - `normalizeTrackedFields(fields)` guarantees `"Name"` and `"Member ID"` remain present in submitted payloads even though their rows are non-interactive.
- **Rationale**: Prevents spurious "Discard changes?" prompts when opening and immediately closing edit, when today's default date is unchanged in create, or when toggling an optional field on and back off.
- **Alternatives considered**: Tracking a boolean `hasEdited` flag on input change — rejected because reverting a field back to its initial value would leave `Save changes` enabled and the dirty dot visible.

### 3. Date input presentation and calendar-safe formatting
- **Decision**: Use a shadcn/ui `Popover` + `Calendar` (`react-day-picker`) date picker in `BasicsStep` (shared by both `CreateEventWizardDialog` and `EditEventDialog`) with a 56px trigger button displaying the formatted human date (e.g. `17 Nov 2026`), storing and submitting `YYYY-MM-DD`. Convert between `YYYY-MM-DD` and local calendar `Date` objects using `parseEventDate` / `toEventDateIso`, and format display dates using UTC-safe parsing (`new Date(`${iso}T00:00:00Z`)` with `timeZone: "UTC"`, matching `LocalDate`).
- **Rationale**: Gives volunteers a consistent, touch-friendly calendar picker across both create and edit flows without browser-specific `<input type="date">` inconsistencies, while local-calendar `Date` construction and UTC-safe display formatting prevent off-by-one day bugs across time zones.

### 4. Inline validation, focus routing, and error display inside the modal
- **Decision**:
  - Replace toast-based validation (`"Add an event name to continue"`) with inline field validation (`"Give the event a name"`), `aria-invalid="true"`, `aria-describedby`, and `role="alert"`.
  - In **Create**, validate `name.trim()` when pressing **Next**; if empty, stay on `Basics` and focus the `Event name` input. Clear `errors.name` on the first non-whitespace character typed.
  - In **Edit**, validate `name.trim()` immediately as the user empties the `Event name` input (keeping `Save changes` disabled), and also guard `handleSave()` so if triggered with an empty name it switches to `Basics`, displays `"Give the event a name"`, and focuses the input.
  - For server failures (`saveEvent` / `deleteEvent`), render the error message inside the dialog/sheet (preserving all values and re-enabling actions) rather than relying solely on a toast that can appear behind the modal scrim.
- **Rationale**: Volunteers on mobile can immediately see why **Next** or **Save changes** is blocked and correct the field without losing context.

### 5. Layered `alertdialog` sheets (`Discard changes?` and `Delete {original name}?`)
- **Decision**: Render both confirmation sheets as `role="alertdialog"` overlays (`absolute inset-0 z-20`) inside the dialog container instead of a second top-level Radix `Dialog`.
  - `Esc` handler checks overlays first: if `isSubmitting` or `isDeleting`, ignore `Esc` and scrim clicks; if `showDeleteConfirm`, close delete sheet only; else if `showDiscardConfirm`, close discard sheet only; else run `requestClose()`.
  - In `EditEventDialog`, the `Delete event` link on `Basics` sets `showDeleteConfirm = true` directly over the intact edit form; `Cancel` sets `showDeleteConfirm = false` without touching `values` or `dirty`.
- **Rationale**: Keeps edit form state mounted underneath delete confirmation and matches the member wizard's `alertdialog` pattern without nested Radix portal focus-trap conflicts.

### 6. Caller integration (`EventsView` and `CheckInView`)
- **Decision**:
  - `EventsView` passes `onCreate` calling `saveEvent({ name, eventDate, trackedFields })` and returning the `savedId` to `CreateEventWizardDialog`. On `Start check-in`, the wizard navigates via `useRouter().push(\`/events/\${savedId}/check-in\`)` and closes; on `Back to events`, it closes and remains on `/events` (optionally showing `"Event created and ready for check-in"` only on `Back to events` so it does not compete with the `Done` screen).
  - `CheckInView` uses `EditEventDialog` for `currentEvent` (updating `currentEvent` on save and showing `"Event updated and ready for check-in"` toast; calling `deleteEventAction(eventId)` on delete confirmation, which redirects to `/events`). For `CheckInView`'s `!currentEvent` empty state, wire `CreateEventWizardDialog` (or update `currentEvent` on create) so the legacy `EventDialogs` component can be completely retired.
- **Rationale**: Removes the split state and `setIsEventOpen(false); setIsDeleteEventOpen(true)` choreography from `CheckInView` and ensures `/events/${savedId}/check-in` receives the real created ID.

## Risks / Trade-offs

- **Existing tests target `EventDialogs` props** (`src/components/rollcall/events/event-dialogs.test.tsx`, `check-in-view.test.tsx`) → Update `check-in-view.test.tsx` if needed and replace `event-dialogs.test.tsx` with comprehensive tests for `CreateEventWizardDialog`, `EditEventDialog`, and `EventsView` covering all scenarios from the prototype dev notes.
- **Native `<input type="date">` testability and overlay styling** → Keep `aria-label="Date"` and `id` directly on `<input type="date">` so `getByLabelText("Date")` and `fireEvent.change` work seamlessly in jsdom/Vitest as well as touch devices.
- **`EventsView` server-rendered list freshness on `Back to events`** → `saveEvent` already calls `invalidateWorkspaceData()` (`updateTag("events")` and `revalidatePath("/", "layout")`), so Next.js Server Action flight payload refreshes `EventsPage` automatically when `saveEvent` resolves; `Back to events` needs no extra `router.push` or competing toast.
