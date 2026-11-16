## MODIFIED Requirements

### Requirement: Edit member profile with immutable member ID
The system SHALL allow authenticated volunteers to edit a member's `name`, `email`, `phone`, `address`, `dob`, and photo (keep, replace, or remove), while keeping `member_id` read-only and immutable after creation.

#### Scenario: Update editable member fields
- **WHEN** a volunteer opens the edit dialog for an existing member, modifies `name`, `email`, `phone`, `address`, `dob`, or photo across any tab, and clicks `Save changes`
- **THEN** the system updates the member record while preserving the original `member_id` and QR code

#### Scenario: Prevent changing member ID on edit
- **WHEN** a volunteer views the edit member dialog or submits an update for an existing member
- **THEN** the `member_id` is displayed as read-only in both the identity header chip (`can’t be changed`) and the disabled `Details` field, and any attempt to alter `member_id` is ignored or rejected

## ADDED Requirements

### Requirement: Tabbed edit member dialog navigation and identity header
The system SHALL present the "Edit member" dialog as three always-enabled tabs (`Photo`, `Details`, `Contact`) opening on `Photo` with no `Done` step, a live identity header (avatar, live name or `"Unnamed member"`, and locked `member_id` chip), parent-owned state preserved across tabs, and responsive sheet/dialog layout with focus management and `aria-live="polite"` announcements.

#### Scenario: Open edit dialog on Photo with live identity header
- **WHEN** a volunteer clicks Edit on an existing member
- **THEN** the dialog opens on the `Photo` tab titled `Edit member`, displays a 3-tab `tablist` (`Photo`, `Details`, `Contact`) without `"Step n of 3"` copy, and shows the member's current avatar, name, and locked `member_id` chip (`can’t be changed`)

#### Scenario: Preserve unsaved edits when switching tabs
- **WHEN** a volunteer modifies a field in `Contact` or `Details`, switches to `Photo` via a tab button or footer section link, and switches back
- **THEN** all edited values remain intact in parent state, focus moves to the active section heading (or first input on `Details` / `Contact`), and the live region announces `"Photo"`, `"Details"`, or `"Contact"`

#### Scenario: Update identity header preview when Name changes
- **WHEN** a volunteer edits or empties the `Name` field on `Details`
- **THEN** the identity header name updates live as the user types, falling back to `"Unnamed member"` in muted styling when trimmed `Name` is empty

#### Scenario: Responsive edit layout and target sizes
- **WHEN** the Edit member dialog is rendered on a viewport `< 640px` vs `>= 640px`
- **THEN** mobile renders a full-screen sheet with a sticky footer (`position: sticky; bottom: 0` with `env(safe-area-inset-bottom)` padding) while desktop renders a `600px` dialog with a single-row footer (`Cancel` left, `Save changes` right), `56px` primary/footer buttons, and at least `44px` interactive targets

### Requirement: Edit member snapshot dirty tracking and save availability
The system SHALL snapshot the member's initial values (including `pictureUrl`) when opening the edit dialog, compute dirty state per section against that snapshot, display a 7px teal dot on each dirty tab, and enable `Save changes` on every section only when at least one section is dirty and trimmed `name` is non-empty.

#### Scenario: Clean state on open disables Save changes
- **WHEN** the Edit member dialog opens with no changes made yet
- **THEN** no tab displays a dirty dot and `Save changes` is disabled with `#C5CDD0` styling across all three tabs

#### Scenario: Single section edit dots only that tab and enables Save everywhere
- **WHEN** a volunteer changes only `Phone` on the `Contact` tab and navigates to `Photo`
- **THEN** only the `Contact` tab displays a 7px teal dirty dot, the dot persists while viewing `Photo`, and `Save changes` is enabled on `Photo`, `Details`, and `Contact`

#### Scenario: Reverting all edits to snapshot disables Save changes
- **WHEN** a volunteer modifies a field and then restores every modified field and photo to match the opening snapshot
- **THEN** all tab dirty dots clear and `Save changes` becomes disabled again

### Requirement: Edit member portrait-first photo flow and camera lifecycle
The system SHALL default the `Photo` tab in edit mode to `portrait` sub-state (`Member photo` or `Add a photo`) without starting the camera or showing `Skip`, enter `camera` only on `Retake` or `Take photo`, return to `portrait` after capture or upload, support `Remove photo`, and stop all camera tracks on capture, upload, `Cancel camera`, tab switch, close, or unmount.

#### Scenario: Open edit dialog without starting camera
- **WHEN** the Edit member dialog opens on `Photo`
- **THEN** the `Photo` tab renders the `portrait` view (showing the member's current photo with `Retake`, `Upload new`, and `Remove photo`, or an empty portrait with `Take photo` and `Upload new`) and does not invoke `getUserMedia`

#### Scenario: Enter camera via Retake or Take photo and return to portrait on capture
- **WHEN** a volunteer clicks `Retake` or `Take photo`, captures a frame from the live camera preview, or selects an image via `Upload new` (`accept="image/*"`)
- **THEN** the camera starts only upon entering `camera`, stores the captured or uploaded file and object URL preview, returns directly to `portrait` with `Photo` marked dirty, and stops every active `MediaStream` track

#### Scenario: Remove existing photo and persist empty URL
- **WHEN** a volunteer clicks `Remove photo` on a member with an existing photo and clicks `Save changes`
- **THEN** the dialog clears the photo file and `pictureUrl`, returns to the empty `portrait` (`Add a photo`), marks `Photo` dirty, revokes any temporary object URL, and submits an empty `pictureUrl` to `updateMember`

#### Scenario: Stop camera tracks on Cancel camera, tab switch, or close
- **WHEN** the `Photo` tab is in `camera` sub-state and the volunteer clicks `Cancel camera`, switches to `Details` or `Contact`, closes the dialog, or unmounts the component
- **THEN** every active `MediaStream` track is stopped immediately in cleanup and `Cancel camera` returns to `portrait` without altering the current photo

### Requirement: Edit member validation, submission, and server error routing
The system SHALL validate `name` immediately when emptied (`"Enter the member’s name"`), validate email format on `Save changes`, block dismissal with a `"Saving…"` loading state while submitting, upload any new photo before calling `updateMember`, close with `"Updated <name>"` toast on success, and preserve edits while routing field errors on failure.

#### Scenario: Immediate inline Name validation on empty input
- **WHEN** a volunteer clears the `Name` input on `Details` to empty or whitespace-only
- **THEN** the input immediately displays `"Enter the member’s name"` below the field with a red border, `aria-invalid="true"`, `aria-describedby` linking the error, focus remaining on `Name`, and `Save changes` disabled; typing a non-whitespace character clears the error

#### Scenario: Email validation routes to Contact on Save
- **WHEN** a volunteer enters an invalid email on `Contact`, switches to `Photo` or `Details`, and clicks `Save changes`
- **THEN** the dialog remains open, switches to `Contact`, and displays the inline email validation error without showing Contact errors on `Details`

#### Scenario: Blocking loading state and optimistic update on Save success
- **WHEN** a volunteer clicks `Save changes` with valid dirty changes
- **THEN** `Cancel`, `Close`, `Save changes` (showing a spinner and `"Saving…"`), `Esc`, and scrim dismissal are blocked until `uploadMemberPhoto` (when a new file exists) and `updateMember` resolve, after which the directory updates optimistically, the dialog closes, and the `"Updated <name>"` toast is displayed

#### Scenario: Preserve values and route server errors on Save failure
- **WHEN** `updateMember` or photo upload fails with an error
- **THEN** the dialog stays open with all edited values preserved, re-enables `Save changes`, displays the error, and switches to `Details` or `Contact` if the error routes to `name` or `email`

### Requirement: Edit member discard confirmation on unsaved changes
The system SHALL close immediately when closing the Edit member dialog with no dirty changes against the opening snapshot, and SHALL prompt `"Discard changes?"` before closing when unsaved edits exist.

#### Scenario: Close immediately when no fields differ from snapshot
- **WHEN** a volunteer opens the Edit member dialog and clicks `Close` (`X`), `Cancel`, scrim, or presses `Esc` without changing any field or photo from the snapshot
- **THEN** the dialog closes immediately without displaying the discard confirmation sheet

#### Scenario: Prompt discard confirmation when edits exist
- **WHEN** a volunteer modifies any field or photo and clicks `Close` (`X`), `Cancel`, scrim, or presses `Esc` while not submitting
- **THEN** the dialog displays the `alertdialog` titled `"Discard changes?"` with body `"You have unsaved edits for <original name>. Closing now will lose them."` and buttons `Keep editing` and `Discard`

#### Scenario: Dismiss discard sheet or confirm discard
- **WHEN** the `"Discard changes?"` sheet is open and the volunteer clicks `Keep editing` or presses `Esc`, versus clicking `Discard`
- **THEN** `Keep editing` or `Esc` closes only the sheet leaving all edits intact, while `Discard` closes the dialog, drops all edits without calling `updateMember`, and stops any active camera stream
