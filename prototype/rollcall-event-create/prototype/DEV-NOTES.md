# Create / edit event: 2-step flow (dev notes)

Design reference: `index.html` (all screens), `prototype.html` (clickable), PNGs in `shots/`.
This is a behaviour change, not a restyle of the current single-scroll dialog. Keep the existing `saveEvent` and delete-event actions as they are. Only the dialog’s UI and state change.

Recommend this goes through **OpenSpec propose / apply** first. The designer’s styling pass on the real component comes after the flow works.

## Why two steps, not three

Creating an event only asks for a name, a date, and which details to record for each member. The checklist is the long part, so it gets its own screen. A third step would be padding.

Create is a walk: Basics → Check-in fields → Done. Editing is not. Volunteers usually change one thing (the date, a toggle) and save. Forcing them through Next/Back to reach Save would be worse than today’s single form.

Use the same two sections — Basics and Check-in fields — but in edit they are **tappable tabs**. Open on **Basics** (mirrors create). Save is available from every section.

## Where the code lives today

All of this currently lives in a single `EventDialogs` component, used in two places:

- `src/components/rollcall/events/event-dialogs.tsx` — the shared create / update / delete dialogs. Titles today are “Set up your event” / “Update your event”. New copy: **Create event** / **Edit event**.
- `src/components/rollcall/events/events-view.tsx` — create only. `openCreateDialog` already seeds `eventDate` with `getCurrentDate()` and `trackedFields` with `defaultTrackedFields`. `createEvent` currently validates with a toast (“Add an event name to continue”), then calls `saveEvent`, closes the dialog, and toasts “Event created and ready for check-in”.
- `src/components/rollcall/check-in/check-in-view.tsx` — edit / update / delete of the active event. `saveCurrentEvent` uses the same toast-on-empty-name pattern, then `saveEvent({ id, name, eventDate, trackedFields })`. `onDeleteRequest` currently **closes the edit dialog and then opens** the delete dialog; in the new UX the confirm sheet should sit **on top of** the edit dialog, on the Basics tab.

Do not grow the single-scroll form in `event-dialogs.tsx`. Extract a `CreateEventWizardDialog` and an `EditEventDialog` (same shell) and reuse the step components with a `mode="edit"` prop:

- `BasicsStep` — Event name (required) and Date (`type="date"`). In edit, a quiet red **Delete event** text link at the bottom of this step only.
- `FieldsStep` — heading “What should we record at the door?”. In create, a summary row above it shows the event name and date, with an **Edit** link back to Basics. In edit, hide the summary (the tabs already jump). Name and Member ID are locked rows labelled “Always recorded”. Email, Phone, Address, Date of birth and Photo are toggles.
- `DoneStep` — create only. Check mark, event name and date, “Event created”, primary **Start check-in**, secondary **Back to events**.

Shared form types, `trackedFieldOptions`, `requiredTrackedFields` and `defaultTrackedFields` in `src/components/rollcall/shared/member-utils.ts` stay as they are.

## Fields (unchanged)

`eventName` (required), `eventDate` (defaults to today via `getCurrentDate()`), `trackedFields` (array of labels).

Required, always recorded, never togglable:

- Name
- Member ID

Optional toggles, off by default (`defaultTrackedFields` is already `["Name", "Member ID"]`):

- Email
- Phone
- Address
- Date of birth
- Photo

Do not add fields. Do not change the payload of `saveEvent({ id?, name, eventDate, trackedFields })`.

## State

- One form state for the whole dialog, owned by the dialog, not by each step. Snapshot `initialValues` when the dialog opens (`openCreateDialog` / the edit opener in check-in-view).
- Create: `step: 'basics' | 'fields' | 'done'`.
- Edit: `step: 'basics' | 'fields'`. There is no Done step. On success, close and show the existing toast (`Event updated and ready for check-in`).
- Values live in the parent, so switching steps or tabs never loses typing or toggle state. Verify: turn Phone on, go Back / switch to Basics, come forward again, Phone is still on.
- `dirty` (edit only) is computed per section against the snapshot:
  - Basics: `name` or `date` changed (trim name before compare).
  - Check-in fields: any optional toggle differs from the snapshot (compare as sets, and always keep required fields present).
- A 7px teal dot on a tab means that section is dirty. Dots persist while the user is on the other tab.
- Opening edit and closing immediately must not confirm — compare against the snapshot, not against empty values. The default date on create is not dirty.

## Create navigation

| From | Primary | Back / other |
|---|---|---|
| Basics | Next → validate name, then `fields` | Cancel or Close → discard check, then close |
| Check-in fields | Create event → `saveEvent`, then `done` | Back, or the summary **Edit** link → Basics |
| Done | **Start check-in** → `/events/${savedId}/check-in`. **Back to events** → close, stay on `/events` | — |

- `events-view.tsx` currently ignores the id returned by `saveEvent`. Use that id for **Start check-in**. Do not navigate until the save succeeds.
- While submitting: disable Next / Create / Cancel / Close, show a spinner and “Creating…” on the primary button, and block dismiss (Esc, scrim) until the request finishes.
- On failure: stay on Check-in fields, show the error, keep every value, re-enable Create event.
- “Create event” on step 2 is never disabled for field choice — optional toggles can all stay off.

## Edit navigation

| Action | Result |
|---|---|
| Tab button | Switch section. Values are kept. |
| Save, valid | Call `saveEvent` with the existing id, then close and toast. |
| Save, Name empty | Should not be clickable. If it is, stay put, switch to Basics, show the name error, focus the field. |
| Close (X), Esc, scrim click, with no dirty fields | Close immediately. |
| Same actions, with dirty fields | Show the discard sheet. Do not close. |
| Delete event (Basics only) | Open the delete confirm sheet **over** the edit dialog. Do not close the edit dialog first. |
| Confirm delete | Existing `onDelete` / `deleteEvent`. On success, leave the event (check-in already handles this). |
| Cancel on the delete sheet | Close the sheet only; the edit form stays as it was. |

- Footer is a single sticky **Save changes** button, 56px, teal. **Disabled** until something is dirty **and** Name is non-empty (after trim). Disabled style is the grey `#C5CDD0` fill, not a faded teal.
- While submitting: disable Close and Save; Save shows a spinner and “Saving…”. Block dismiss until the request finishes.
- On a server error, stay open, keep every value, re-enable Save.

## Validation

- **Name is required.** Copy is **“Give the event a name”** — replace today’s toast “Add an event name to continue”. Red border, `aria-invalid`, error linked with `aria-describedby`, focus the field.
- Create: show the error when the user presses Next with an empty or whitespace name. Stay on Basics. Clear the error as soon as they type a non-whitespace character.
- Edit: if they empty the Name field, show the same error immediately and keep Save off. Clear it as soon as they type a non-whitespace character.
- Date is required in practice (it always has a value). Keep the native `type="date"` picker. Default is today. Display as a human date (e.g. “17 Nov 2026”) if the chrome allows; the stored value stays `YYYY-MM-DD` from `getCurrentDate()`.

## Discard sheet

Reuse the member wizard’s `alertdialog` pattern (scrim + card inside the dialog).

- Title: **Discard changes?**
- Create body: **You have started creating this event. Closing now will lose it.**
- Edit body: **You have unsaved edits for {original name}. Closing now will lose them.**
- **Keep editing** (outline) closes the sheet and leaves the form as it was.
- **Discard** (destructive) closes the dialog and drops the edits. Do not call `saveEvent`.
- Esc on the sheet closes the sheet only (Keep editing).
- Cancel on create uses the same check: if the name is filled, the date is not today, or any optional toggle is on, confirm; otherwise close immediately.

## Delete confirm sheet

Keep the existing copy from `event-dialogs.tsx`. Restyle as a sheet over the edit dialog, not a second dialog that replaces it.

- Title: **Delete {original name}?**
- Body: **This will permanently remove the event and all check-in data for this session. This action cannot be undone.**
- **Cancel** closes the sheet only.
- **Delete event** (destructive) calls the existing `onDelete`. While deleting: disable both buttons, show “Deleting event…”, and do not let the sheet or the edit dialog close until the request finishes.

The Delete event link is a quiet red text button at the bottom of Basics only — not in the footer, and not on Check-in fields.

## Done (create only)

- Show the event name, the formatted date, and “Event created”.
- **Start check-in** navigates to `/events/${savedId}/check-in` (the route already used from `events-list.tsx` and the event detail page).
- **Back to events** closes the dialog and remains on the events list. Keep the existing success toast if it is still useful after the Done screen; do not show it *and* the Done screen as two competing confirmations. Prefer the Done screen, then toast only if the user lands back on the list via Back to events.
- There is no Close (X) on Done — the two actions are the only exits.

## Layout notes

- Mobile (< 640px): full-screen sheet. Footer sticky (`position: sticky; bottom: 0`) with `env(safe-area-inset-bottom)`. Content scrolls above it.
- Desktop: a 600px dialog, same steps / tabs. Create footer in one row: Cancel or Back on the left, Next or Create event on the right. Edit footer is just Save changes.
- Focus: move focus to the step heading (or the Event name field on Basics) on every step or tab change. Announce “1 of 2, Basics” or “Check-in fields” with `aria-live="polite"`.
- Buttons are 56px high, and every target is at least 44px, including tabs, toggles (the whole row), Edit, and Delete event.
- Name and Member ID rows are not interactive. Optional rows are buttons with `aria-pressed` (or a labelled switch). Required fields stay in `trackedFields` even when the user never sees a toggle for them.

## Checks worth writing

- Next with an empty name stays on Basics and shows “Give the event a name”; typing a name clears the error and lets Next through.
- Date defaults to today when the create dialog opens (`getCurrentDate()`).
- Turning Email on, going Back, then Next, leaves Email on.
- Create event calls `saveEvent` with the typed name, the chosen date, and `trackedFields` including the required fields plus any toggles that are on.
- After a successful create, Start check-in goes to `/events/${id}/check-in`, and Back to events stays on `/events`.
- Opening edit and closing with no edits does not show the discard sheet.
- Changing only Phone enables Save, dots only the Check-in fields tab, and Save works from the Basics tab.
- Emptying Name shows the error and disables Save; typing a name clears the error and re-enables Save if anything is still dirty.
- Reverting every field to the snapshot disables Save and clears the dots.
- Delete event is only on Basics, opens the sheet over the form, and Cancel returns to the form.
- Esc with dirty fields opens the discard sheet; Esc on the sheet returns to the form.
