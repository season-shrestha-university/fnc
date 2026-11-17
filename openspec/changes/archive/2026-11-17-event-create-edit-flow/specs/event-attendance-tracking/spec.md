## MODIFIED Requirements

### Requirement: Create, edit, and delete events with tracked fields
The system SHALL allow authenticated volunteers to create, edit, and delete events with a `name`, `event_date` (defaulting to today), and a selectable list of `tracked_fields` (`Name`, `Member ID`, `Email`, `Phone`, `Address`, `Date of birth`, `Photo`), where `Name` and `Member ID` are always required and non-togglable, using a two-step create wizard and a two-tab edit dialog backed by `saveEvent` and `deleteEvent`.

#### Scenario: Create event with custom tracked fields
- **WHEN** a volunteer creates an event via the two-step create wizard with a name, date, and selected optional tracked fields (`Address`, `Phone`)
- **THEN** the system persists the event via `saveEvent` with its `event_date` and `tracked_fields` including `Name`, `Member ID`, `Address`, and `Phone`

#### Scenario: Update event from either edit tab
- **WHEN** a volunteer edits an event's name, date, or optional tracked fields across `Basics` or `Check-in fields` and clicks `Save changes`
- **THEN** the system persists the updated event via `saveEvent` with its existing `id`, closes the edit dialog, and displays `"Event updated and ready for check-in"`

#### Scenario: Delete event and its check-ins
- **WHEN** a volunteer confirms deletion of an event from the overlaid delete confirmation sheet
- **THEN** the system permanently removes the event and all check-in records for that event via `deleteEvent`

## ADDED Requirements

### Requirement: Two-step event creation wizard with Done navigation
The system SHALL present event creation as a two-step wizard (`Basics` → `Check-in fields`) followed by a `Done` screen, titled `Create event`, owning all form state in the parent dialog so navigating backward preserves entered values and offering `Start check-in` and `Back to events` as the only exits on `Done`.

#### Scenario: Default date and required vs optional field rows on create
- **WHEN** a volunteer opens the `Create event` dialog
- **THEN** the dialog opens on step `1 of 2 · Basics` with `Date` defaulted to today's local date (`YYYY-MM-DD` via `getCurrentDate()`), and step `2 of 2 · Check-in fields` (`"What should we record at the door?"`) renders non-interactive `Name` and `Member ID` rows labelled `"Always recorded"` alongside full-row `aria-pressed` toggle buttons for `Email`, `Phone`, `Address`, `Date of birth`, and `Photo` defaulted to off

#### Scenario: Preserve values when navigating between Basics and Check-in fields
- **WHEN** a volunteer enters an event name on `Basics`, advances to `Check-in fields`, toggles `Email` or `Phone` on, navigates back via `Back` or the summary `Edit` link, and advances forward again
- **THEN** the typed event name, selected date, summary row, and toggled optional fields remain intact

#### Scenario: Post-create Done screen and navigation
- **WHEN** `saveEvent` succeeds from `Check-in fields`
- **THEN** the wizard transitions to the `Done` screen (with no Close `X` button) displaying a check mark, event name, formatted date, `"Event created"`, primary `Start check-in` navigating to `/events/${savedId}/check-in`, and secondary `Back to events` closing the dialog to remain on `/events` without a competing toast on the `Done` screen

#### Scenario: Create event button stays enabled regardless of optional toggles
- **WHEN** a volunteer reaches `Check-in fields` with all optional field toggles off
- **THEN** `Create event` remains enabled and submits `trackedFields` containing `Name` and `Member ID`

### Requirement: Two-tab event edit dialog with snapshot dirty tracking
The system SHALL present event editing as an `Edit event` dialog with always-enabled `Basics` and `Check-in fields` tabs opening on `Basics`, snapshotting initial values on open, indicating dirty sections with a 7px teal dot, and enabling a single sticky `Save changes` footer button only when dirty and valid.

#### Scenario: Clean state on open disables Save changes
- **WHEN** a volunteer opens `Edit event` for an active event
- **THEN** the dialog opens on `Basics` with no tab dirty dots, hides the create summary row, and renders `Save changes` disabled with `#C5CDD0` fill across both tabs

#### Scenario: Single section edit dots only that tab and enables Save from either tab
- **WHEN** a volunteer toggles only `Phone` on `Check-in fields` and switches to `Basics`
- **THEN** only the `Check-in fields` tab displays a 7px teal dirty dot, the dot persists while viewing `Basics`, and `Save changes` is enabled on both tabs

#### Scenario: Reverting edits to match snapshot clears dots and disables Save
- **WHEN** a volunteer modifies the event name, date, or optional toggles and then reverts every field back to match the opening snapshot
- **THEN** all tab dirty dots clear and `Save changes` becomes disabled again

### Requirement: Event dialog validation, submission states, and responsive accessibility
The system SHALL validate required `Event name` inline with `"Give the event a name"`, block dismissal during submission with `"Creating…"` or `"Saving…"` loading indicators, preserve user input on server failure, and enforce responsive layout, focus, live announcements, and `>= 44px` touch targets.

#### Scenario: Empty name blocks Next on create with inline error
- **WHEN** a volunteer clicks `Next` on `Basics` in create mode with an empty or whitespace-only `Event name`
- **THEN** the wizard stays on `Basics`, renders `"Give the event a name"` with a red border, `aria-invalid="true"`, and `aria-describedby`, and focuses the `Event name` field; typing a non-whitespace character clears the error

#### Scenario: Immediate inline Name validation on edit
- **WHEN** a volunteer clears `Event name` to empty or whitespace-only in `Edit event`
- **THEN** `"Give the event a name"` displays immediately with `aria-invalid="true"` and `Save changes` becomes disabled; typing a non-whitespace character clears the error and re-enables `Save changes` if any section remains dirty

#### Scenario: Blocking loading state and error preservation during save
- **WHEN** a volunteer submits `Create event` or `Save changes`
- **THEN** dismiss actions (`Close`, `Cancel`, `Esc`, scrim) and action buttons are disabled with a spinner and `"Creating…"` or `"Saving…"` label until `saveEvent` settles; if `saveEvent` fails, the dialog stays open on the active step/tab, displays the error, preserves all entered values, and re-enables submission

#### Scenario: Responsive layout, focus management, and target sizing
- **WHEN** `Create event` or `Edit event` is rendered on mobile (`< 640px`) or desktop (`>= 640px`)
- **THEN** mobile renders a full-screen sheet with a sticky footer (`env(safe-area-inset-bottom)`), desktop renders a `600px` dialog, buttons are `56px` tall with every interactive target at least `44px`, step/tab transitions move focus to the step heading or `Event name` input, and an `aria-live="polite"` region announces the active step or tab

### Requirement: Event discard and overlaid delete confirmation sheets
The system SHALL prompt `"Discard changes?"` before closing when unsaved changes exist, close immediately when clean, and open the delete confirmation sheet on top of `Edit event` from `Basics` only without closing the edit dialog first.

#### Scenario: Close immediately without confirmation when clean
- **WHEN** a volunteer triggers `Close` (`X`), `Cancel`, `Esc`, or scrim click while not submitting and with no changes from initial defaults (create: empty name, today's date, no optional toggles on) or opening snapshot (edit)
- **THEN** the dialog closes immediately without displaying `"Discard changes?"`

#### Scenario: Prompt discard confirmation when unsaved changes exist
- **WHEN** a volunteer has unsaved changes (typed name, non-today date, or optional toggle on in create; any dirty section in edit) and triggers `Close` (`X`), `Cancel`, `Esc`, or scrim click while not submitting
- **THEN** an `alertdialog` sheet opens inside the dialog titled `"Discard changes?"` with body `"You have started creating this event. Closing now will lose it."` (create) or `"You have unsaved edits for <original name>. Closing now will lose them."` (edit) and buttons `Keep editing` and `Discard`

#### Scenario: Dismiss or confirm the discard sheet
- **WHEN** `"Discard changes?"` is open and the volunteer clicks `Keep editing` or presses `Esc`, versus clicking `Discard`
- **THEN** `Keep editing` or `Esc` closes only the discard sheet leaving the form state intact, whereas `Discard` closes the dialog without calling `saveEvent`

#### Scenario: Delete event link only on Basics opens overlaid delete confirm sheet
- **WHEN** a volunteer views `Edit event`
- **THEN** the quiet red `Delete event` link appears only at the bottom of `Basics` (not on `Check-in fields` or in the footer), and clicking it opens the `"Delete <original name>?"` `alertdialog` sheet over the edit dialog without closing the edit dialog; clicking `Cancel` closes only the sheet preserving edit state, while confirming `Delete event` disables both buttons with `"Deleting event…"` and blocks closing until `deleteEvent` completes
