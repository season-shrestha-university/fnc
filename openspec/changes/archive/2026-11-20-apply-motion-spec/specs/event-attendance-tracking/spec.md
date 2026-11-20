# Spec Delta

## MODIFIED Requirements

### Requirement: Two-step event creation wizard with Done navigation
The system SHALL present event creation as a two-step wizard (`Basics` → `Check-in fields`) followed by a `Done` screen, titled `Create event`, owning all form state in the parent dialog so navigating backward preserves entered values and offering `Start check-in` and `Back to events` as the only exits on `Done`, while transitioning between steps sequentially with directional awareness (`forward` or `back`) so outgoing and incoming step text never overlap.

#### Scenario: Default date and required vs optional field rows on create
- **WHEN** a volunteer opens the `Create event` dialog
- **THEN** the dialog opens on step `1 of 2 · Basics` with `Date` defaulted to today's local date (`YYYY-MM-DD` via `getCurrentDate()`), and step `2 of 2 · Check-in fields` (`"What should we record at the door?"`) renders non-interactive `Name` and `Member ID` rows labelled `"Always recorded"` alongside full-row `aria-pressed` toggle buttons for `Email`, `Phone`, `Address`, `Date of birth`, and `Photo` defaulted to off

#### Scenario: Preserve values when navigating between Basics and Check-in fields
- **WHEN** a volunteer enters an event name on `Basics`, advances to `Check-in fields`, toggles `Email` or `Phone` on, navigates back via `Back` or the summary `Edit` link, and advances forward again
- **THEN** the typed event name, selected date, summary row, and toggled optional fields remain intact, and forward transitions exit left (`-8px`, `120ms`) and enter from right (`+12px`, `200ms`) while `Back` and the summary `Edit` link exit right (`+8px`, `120ms`) and enter from left (`-12px`, `200ms`) after hiding the outgoing step

#### Scenario: Post-create Done screen and navigation
- **WHEN** `saveEvent` succeeds from `Check-in fields`
- **THEN** the wizard transitions sequentially to the `Done` screen (with no Close `X` button) displaying a check mark, event name, formatted date, `"Event created"`, primary `Start check-in` navigating to `/events/${savedId}/check-in`, and secondary `Back to events` closing the dialog to remain on `/events` without a competing toast on the `Done` screen

#### Scenario: Create event button stays enabled regardless of optional toggles
- **WHEN** a volunteer reaches `Check-in fields` with all optional field toggles off
- **THEN** `Create event` remains enabled and submits `trackedFields` containing `Name` and `Member ID`

### Requirement: Two-tab event edit dialog with snapshot dirty tracking
The system SHALL present event editing as an `Edit event` dialog with always-enabled `Basics` and `Check-in fields` tabs opening on `Basics`, snapshotting initial values on open, indicating dirty sections with a 7px teal dot (animating on enter and delaying unmount through its `84ms` exit), animating a single active tab underline via `translateX` with a `200ms` panel opacity crossfade, and enabling a single sticky `Save changes` footer button only when dirty and valid.

#### Scenario: Clean state on open disables Save changes
- **WHEN** a volunteer opens `Edit event` for an active event
- **THEN** the dialog opens on `Basics` with no tab dirty dots, hides the create summary row, and renders `Save changes` disabled with `#C5CDD0` fill across both tabs

#### Scenario: Single section edit dots only that tab and enables Save from either tab
- **WHEN** a volunteer toggles only `Phone` on `Check-in fields` and switches to `Basics`
- **THEN** only the `Check-in fields` tab displays a 7px teal dirty dot (entering with `120ms` fade and scale `0.6` to `1`), the single tab underline slides via `translateX` over `200ms` while panel content crossfades over `200ms`, the dot persists while viewing `Basics`, and `Save changes` is enabled on both tabs

#### Scenario: Reverting edits to match snapshot clears dots and disables Save
- **WHEN** a volunteer modifies the event name, date, or optional toggles and then reverts every field back to match the opening snapshot
- **THEN** all tab dirty dots fade and scale down over `84ms` before unmounting (or immediately under reduced motion) and `Save changes` becomes disabled again with a `140ms` color transition

### Requirement: Event dialog validation, submission states, and responsive accessibility
The system SHALL validate required `Event name` inline with `"Give the event a name"`, block dismissal during submission with `"Creating…"` or `"Saving…"` non-spinning loading states, preserve user input on server failure, and enforce responsive layout, focus, live announcements, and `>= 44px` touch targets.

#### Scenario: Empty name blocks Next on create with inline error
- **WHEN** a volunteer clicks `Next` on `Basics` in create mode with an empty or whitespace-only `Event name`
- **THEN** the wizard stays on `Basics`, renders `"Give the event a name"` with a `200ms` fade and `4px` drop alongside a red border, `aria-invalid="true"`, and `aria-describedby`, and focuses the `Event name` field; typing a non-whitespace character clears the error over `140ms`

#### Scenario: Immediate inline Name validation on edit
- **WHEN** a volunteer clears `Event name` to empty or whitespace-only in `Edit event`
- **THEN** `"Give the event a name"` displays immediately with `aria-invalid="true"` and `Save changes` becomes disabled; typing a non-whitespace character clears the error and re-enables `Save changes` if any section remains dirty

#### Scenario: Blocking loading state and error preservation during save
- **WHEN** a volunteer submits `Create event` or `Save changes`
- **THEN** dismiss actions (`Close`, `Cancel`, `Esc`, scrim) and action buttons are disabled with a `"Creating…"` or `"Saving…"` label and no rotating spinner icon until `saveEvent` settles; if `saveEvent` fails, the dialog stays open on the active step/tab, displays the error, preserves all entered values, and re-enables submission

#### Scenario: Responsive layout, focus management, and target sizing
- **WHEN** `Create event` or `Edit event` is rendered on mobile (`< 640px`) or desktop (`>= 640px`)
- **THEN** mobile renders a full-screen sheet with a sticky footer (`env(safe-area-inset-bottom)`), desktop renders a `600px` dialog, buttons are `56px` tall with every interactive target at least `44px`, step/tab transitions move focus to the step heading or `Event name` input, and an `aria-live="polite"` region announces the active step or tab

### Requirement: Event discard and overlaid delete confirmation sheets
The system SHALL prompt `"Discard changes?"` before closing when unsaved changes exist, close immediately when clean, and open the delete confirmation sheet on top of `Edit event` from `Basics` only without closing the edit dialog first, using calm dialog lift-fade transitions (`200ms` enter / `140ms` exit) without shake, red flash, or spinning loaders.

#### Scenario: Close immediately without confirmation when clean
- **WHEN** a volunteer triggers `Close` (`X`), `Cancel`, `Esc`, or scrim click while not submitting and with no changes from initial defaults (create: empty name, today's date, no optional toggles on) or opening snapshot (edit)
- **THEN** the dialog closes smoothly over `140ms` without displaying `"Discard changes?"`

#### Scenario: Prompt discard confirmation when unsaved changes exist
- **WHEN** a volunteer has unsaved changes (typed name, non-today date, or optional toggle on in create; any dirty section in edit) and triggers `Close` (`X`), `Cancel`, `Esc`, or scrim click while not submitting
- **THEN** an `alertdialog` sheet opens inside the dialog with a `200ms` backdrop fade and `8px` panel lift titled `"Discard changes?"` with body `"You have started creating this event. Closing now will lose it."` (create) or `"You have unsaved edits for <original name>. Closing now will lose them."` (edit) and buttons `Keep editing` and `Discard`

#### Scenario: Dismiss or confirm the discard sheet
- **WHEN** `"Discard changes?"` is open and the volunteer clicks `Keep editing` or presses `Esc`, versus clicking `Discard`
- **THEN** `Keep editing` or `Esc` closes only the discard sheet over `140ms` leaving the form state intact, whereas `Discard` closes the dialog without calling `saveEvent`

#### Scenario: Delete event link only on Basics opens overlaid delete confirm sheet
- **WHEN** a volunteer views `Edit event`
- **THEN** the quiet red `Delete event` link appears only at the bottom of `Basics` (not on `Check-in fields` or in the footer), and clicking it opens the `"Delete <original name>?"` `alertdialog` sheet over the edit dialog without closing the edit dialog and without shake or red flash; clicking `Cancel` closes only the sheet preserving edit state, while confirming `Delete event` disables both buttons with `"Deleting event…"` (no rotating spinner) and blocks closing until `deleteEvent` completes

### Requirement: Log member check-in via QR scan or manual ID
The system SHALL allow authenticated volunteers to scan a member's QR code or enter a `member_id` manually to log the member into a specific event against the locally cached member roster without blocking on network round-trips, preventing duplicate check-ins for the same event, and SHALL display confirmation, duplicate, or unknown-member feedback in the unified bottom door sheet.

#### Scenario: Valid member QR scan
- **WHEN** a volunteer scans a valid `member_id` QR code for an active event where the member is not yet checked in
- **THEN** the system records the check-in, adds the member with their profile fields to the event's logged members list, and opens the teal `success` door sheet showing the member's photo (or initials fallback), `name`, `member_id`, animated check tick, and `Undo` / `Done` buttons

#### Scenario: Check in member while offline using cached roster
- **WHEN** the check-in device is offline and a volunteer scans a valid pre-registered `member_id` QR code or enters the `member_id` manually for an active event where the member is not yet checked in
- **THEN** the system resolves the member from the locally cached roster without waiting for a network request, queues the check-in in the local outbox, adds the member to the event's logged members list as pending sync, and immediately opens the teal `success` door sheet with the member's photo (or initials fallback), `name`, `member_id`, and `Undo` / `Done` actions

#### Scenario: Successful check-in for member without a photo
- **WHEN** a volunteer checks in a member who has no stored profile photo
- **THEN** the system displays the teal `success` door sheet with the member's initials avatar, `name`, `member_id`, and `Undo` / `Done` buttons

#### Scenario: Duplicate check-in prevented
- **WHEN** a volunteer scans a `member_id` that is already checked in for the same event (either already synced or pending in the local outbox)
- **THEN** the system rejects the duplicate check-in and opens the amber `duplicate` door sheet (without shake or tick draw) displaying `"Already checked in"` and the member's name

#### Scenario: Unknown or invalid member ID scan
- **WHEN** a volunteer scans or manually enters a `member_id` that does not match any member
- **THEN** the system rejects the check-in and opens the destructive red `error` door sheet (without shake or tick draw) displaying `"Member not found"`

## ADDED Requirements

### Requirement: Door check-in feedback sheet lifecycle and actions
The system SHALL choreograph the check-in door sheet with a `320ms` vertical slide-up (`224ms` slide-down exit), a `200ms` backdrop fade (`140ms` exit), a `180ms`-delayed `320ms` SVG tick `stroke-dashoffset` draw on `success`, a `scaleX` hold progress bar starting after the sheet settles (`2000ms` hold on `success`, `3000ms` hold on `duplicate` and `error`), interactive `Undo` and `Done` actions on `success`, and in-place replacement when a subsequent scan arrives while open.

#### Scenario: Success sheet auto-dismisses after post-enter hold
- **WHEN** a `success` door sheet opens after a check-in
- **THEN** the sheet rises over `320ms`, draws the check tick starting at `180ms`, starts the `2000ms` hold timer and `scaleX` progress bar once the `320ms` enter finishes, and dismisses downward over `224ms` if neither `Undo` nor `Done` is pressed

#### Scenario: Volunteer taps Undo or Done during success hold
- **WHEN** the volunteer taps `Undo` or `Done` while the `success` door sheet is open
- **THEN** `Done` cancels the hold timer and dismisses the sheet immediately, whereas `Undo` cancels the hold timer, dismisses the sheet immediately, and reverts that member's check-in from the outbox or server and attendance list

#### Scenario: Duplicate or error sheet auto-dismisses after 3000ms
- **WHEN** a `duplicate` or `error` door sheet opens
- **THEN** it rises with the same `320ms` sheet geometry without a tick draw, starts a `3000ms` post-enter hold timer, and dismisses downward over `224ms` (or sooner if dismissed manually)

#### Scenario: Second scan arrives while door sheet is open
- **WHEN** another scan is processed while the door sheet is already open or exiting
- **THEN** the system cancels the active hold timer, updates the sheet content and variant in place without stacking sheets, restarts the tick draw (when `success`) and hold timer, or starts a fresh enter if the sheet was already exiting
