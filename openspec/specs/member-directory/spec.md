# member-directory Specification

## Purpose

Manages the member directory, including creating, editing, and deleting members with optional contact details, photo uploads, and immutable unique member IDs encoded as QR codes.

## Requirements

### Requirement: Create member with unique ID and optional profile fields
The system SHALL allow authenticated volunteers to create a member with a required `name`, a unique `member_id` (custom or auto-generated), and optional `email`, `phone`, `address`, `dob`, and photo upload.

#### Scenario: Create member with auto-generated member ID
- **WHEN** a volunteer submits the create member form with a `name` and leaves `member_id` blank
- **THEN** the system generates a unique `member_id`, stores the member record, and displays the generated QR code

#### Scenario: Reject duplicate member ID
- **WHEN** a volunteer submits a `member_id` that already belongs to an existing member
- **THEN** the system rejects creation and displays an error stating that the `member_id` is already in use

### Requirement: Upload and display member photo
The system SHALL allow authenticated volunteers to upload an image file or capture a photo using the device camera when creating or editing a member, downscale the photo to at most 600px on its longest side, compress it to 75%–80% quality in WebP format (falling back to compressed JPEG when WebP encoding is unsupported, or `image/jpeg` at 0.85 quality for direct camera blob capture), store it in object storage, and display the photo in the member's avatar. In the Create a member QR wizard, the Photo step SHALL default to the front (`user`) camera, support switching cameras when multiple cameras exist, mirror front-camera captures horizontally, manage the stream lifecycle automatically, transition the camera preview from hidden/scaled (`opacity: 0`, `scale: 0.98`) to ready (`opacity: 1`, `scale: 1`) over `200ms` once the stream exists, and optionally flash a white overlay (`opacity` `0.9` to `0` over `200ms`) on capture.

#### Scenario: Upload photo during member creation or update
- **WHEN** a volunteer selects an image file (`accept="image/*"`) and saves or creates the member
- **THEN** the system validates the image file, downscales it to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses and converts it to WebP format at 75%–80% quality (or JPEG fallback), uploads it to object storage, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Capture photo using device camera
- **WHEN** a volunteer opens the camera in the member form on a mobile device or desktop browser, captures a frame, and saves the member form
- **THEN** the system stops the camera preview upon capture, downscales the captured frame to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses it, displays the preview, uploads the file, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Auto-start front camera on Photo step mount
- **WHEN** the Create a member QR dialog opens on the Photo step in `camera` sub-state, or the volunteer returns to Photo with no captured photo, or clicks `Retake`
- **THEN** the system displays the dark preview with the oval guide while loading, calls `getUserMedia` with `facingMode: 'user'`, and marks the preview ready once the stream exists so the live video and badge fade in (`200ms`, `scale(0.98)` to `scale(1)`)

#### Scenario: Switch between front and rear cameras
- **WHEN** the device has more than one video input reported by `enumerateDevices` and the volunteer activates the switch-camera button
- **THEN** the system stops the current media stream tracks and requests the opposite `facingMode` (`environment` or `user`); when only one camera exists, the switch-camera button is hidden

#### Scenario: Capture photo with horizontal mirroring for front camera
- **WHEN** the volunteer clicks `Take photo` during a live camera preview
- **THEN** the system draws the video frame to a canvas (mirroring horizontally when using the front camera so it matches the preview), triggers an opacity-only capture flash (`0.9` to `0` over `200ms`), encodes the captured image, stores it in parent form state, previews it via `URL.createObjectURL`, transitions to the `captured` sub-state, and stops all active camera stream tracks

#### Scenario: Stop camera tracks on navigation, skip, close, or unmount
- **WHEN** the volunteer captures a photo, clicks `Skip for now`, navigates to another step, closes the dialog, or unmounts the Photo step
- **THEN** the system stops every track on the active `MediaStream` via `stream.getTracks().forEach(t => t.stop())` in effect cleanup so the camera indicator never remains active

#### Scenario: Retake or cancel camera capture
- **WHEN** a volunteer cancels an active camera preview, closes the member form, or chooses `Retake` on a captured photo
- **THEN** the system releases the active camera stream, clears and revokes any captured photo object URL on `Retake`, and restarts the camera stream (or allows uploading an image file)

#### Scenario: Camera access unavailable or denied
- **WHEN** camera permission is denied, no camera exists, or the context is insecure/unsupported
- **THEN** the system replaces the preview with `"Camera not available. Upload a photo instead."` and keeps `Upload from device` and `Skip for now` working

#### Scenario: Fallback to compressed JPEG when WebP encoding is unsupported
- **WHEN** a volunteer captures a camera photo or selects an image file in a browser whose canvas encoder does not support `image/webp`
- **THEN** the system downscales the image to at most 600px on its longest side, compresses it as JPEG, and uploads the `.jpg` file with `image/jpeg` content type instead of failing

#### Scenario: Reject invalid or unconvertible image upload
- **WHEN** a volunteer selects a non-image file or an image that cannot be decoded or encoded
- **THEN** the system displays an error message, does not upload an unvalidated file, and keeps the dialog open for retry

#### Scenario: Fallback when no photo is provided
- **WHEN** a member has no uploaded photo (including when Photo is skipped)
- **THEN** the system renders the member's default avatar / initials

### Requirement: Edit member profile with immutable member ID
The system SHALL allow authenticated volunteers to edit a member's `name`, `email`, `phone`, `address`, `dob`, and photo (keep, replace, or remove), while keeping `member_id` read-only and immutable after creation.

#### Scenario: Update editable member fields
- **WHEN** a volunteer opens the edit dialog for an existing member, modifies `name`, `email`, `phone`, `address`, `dob`, or photo across any tab, and clicks `Save changes`
- **THEN** the system updates the member record while preserving the original `member_id` and QR code

#### Scenario: Prevent changing member ID on edit
- **WHEN** a volunteer views the edit member dialog or submits an update for an existing member
- **THEN** the `member_id` is displayed as read-only in both the identity header chip (`can’t be changed`) and the disabled `Details` field, and any attempt to alter `member_id` is ignored or rejected

### Requirement: Delete member and cascade check-ins
The system SHALL allow authenticated volunteers to delete a member after confirmation via a calm lift-fade confirm dialog (`200ms` enter / `140ms` exit, no shake), fading and translating the deleted row (`-4px`, `140ms`) before unmounting it from the directory (or unmounting immediately under reduced motion) while removing the member record and any associated event check-ins.

#### Scenario: Confirm and delete member
- **WHEN** a volunteer confirms deletion of a member
- **THEN** the system deletes the member and all check-in records associated with that member and transitions the removed member row out over `140ms` before unmounting it

### Requirement: Generate, download, and print member QR code
The system SHALL generate a unique QR code encoding the member's `member_id` and allow volunteers to view, download as PNG, or print the QR code.

#### Scenario: View and download member QR
- **WHEN** a volunteer selects "Generate QR" for a member and clicks "Download"
- **THEN** the system renders a QR code encoding `member_id` and downloads a PNG file named `<member_id>-qr.png`

### Requirement: Three-step member QR creation wizard
The system SHALL present the "Create a member QR" dialog as a 3-step wizard (`photo`, `details`, `contact`) followed by a `done` completion state, backed by a single parent-owned form state for `name`, `memberId` (placeholder `MEMBER-001`), `dateOfBirth`, `email`, `phone`, `address`, and `photo`, transitioning sequentially between steps with directional awareness (`forward` or `back`) so outgoing and incoming step text never overlap.

#### Scenario: Preserve form values across step navigation
- **WHEN** a volunteer enters values in `Details` or `Contact` (such as typing an email), navigates `Back` to an earlier step, and returns forward
- **THEN** all previously entered field values and captured/uploaded photo remain intact in parent state

#### Scenario: Progress bar visibility and step indicator
- **WHEN** the dialog is on step 1 (`photo`), step 2 (`details`), or step 3 (`contact`)
- **THEN** the progress bar displays `Step n of 3 · <name>` with segments up to and including the current step filled; when the dialog is in `done`, the progress bar is hidden

#### Scenario: Navigate between Photo, Details, and Contact steps
- **WHEN** the volunteer uses `Skip for now` (setting `photo = null`) or `Next` from `Photo`, `Next`/`Back` on `Details`, `Back` on `Contact`, `Change`/`Add photo` on `Details`, or summary shortcut chips on `Contact`
- **THEN** the dialog transitions sequentially to the target step (`forward` exits `-8px` over `120ms` then hides before incoming enters `+12px` to `0` over `200ms`; `Back`, `Change`/`Add photo`, and summary chips use `back` direction exiting `+8px` and entering `-12px` to `0`), returning to `Photo` in `captured` sub-state if a photo exists, or `camera` sub-state if not (`Photo` chip jumps to `Photo`, other summary chips jump to `Details`)

### Requirement: Step-scoped validation and server error routing
The system SHALL validate required and formatted fields on the step that owns them so errors never appear on hidden steps, and SHALL re-validate on submit and route any field-specific server errors back to the owning step.

#### Scenario: Require non-empty name before leaving Details
- **WHEN** the volunteer clicks `Next` on `Details` with an empty or whitespace-only `name`
- **THEN** the dialog stays on `Details`, displays `"Enter the member's name to continue"` below the Name input with red border, `aria-invalid="true"`, and `aria-describedby` linking the error, moves focus to the Name input, and clears the error as soon as the user types

#### Scenario: Validate formatted fields on their owning step
- **WHEN** the volunteer enters an invalid Member ID or email on its owning step and attempts to advance or submit
- **THEN** the validation error is displayed on that step before leaving it

#### Scenario: Optional Contact fields never disable submission
- **WHEN** the volunteer is on the `Contact` step with empty `email`, `phone`, and `address`
- **THEN** the `Create & generate QR` primary button remains enabled

#### Scenario: Route server field error to owning step
- **WHEN** submission fails with a server error attributable to a specific field (such as duplicate `memberId`)
- **THEN** the dialog navigates to the step that owns that field and displays the error inline

### Requirement: Discard confirmation on close
The system SHALL prompt for confirmation before discarding unsaved input when closing the Create a member QR dialog via Close (`X`) or `Esc`, and SHALL close immediately when no fields have values.

#### Scenario: Confirm discard when form has values
- **WHEN** the volunteer clicks Close (`X`) or presses `Esc` while any field or photo has a value (and not in `done` or submitting)
- **THEN** the system asks for confirmation before discarding the entered data

#### Scenario: Close immediately when form is empty
- **WHEN** the volunteer clicks Close (`X`) or presses `Esc` and all fields and photo are empty
- **THEN** the dialog closes immediately without a confirmation prompt and stops any active camera stream

### Requirement: Member QR creation submission and completion state
The system SHALL submit the existing create-member payload on `Create & generate QR`, show a blocking non-spinning loading state while submitting, and transition sequentially to an in-dialog `done` state displaying the server-returned member and QR code.

#### Scenario: Loading state during submission
- **WHEN** the volunteer clicks `Create & generate QR` and the request is in flight
- **THEN** both footer buttons are disabled, the primary button displays `"Creating…"` without a rotating spinner icon, and closing the dialog is blocked

#### Scenario: Transition to Done state on success
- **WHEN** member creation succeeds
- **THEN** the dialog transitions to `done` displaying the member's photo (or default avatar if skipped), `name`, server-returned `memberId`, and generated QR code encoding the server-returned `memberId`

#### Scenario: Stay on Contact on non-field submission failure
- **WHEN** member creation fails with a general error
- **THEN** the dialog stays on `Contact`, displays the error message, and preserves all entered values

#### Scenario: Done state actions
- **WHEN** the volunteer is in the `done` state and clicks `Download QR`, `Add another member`, or `Done`
- **THEN** `Download QR` downloads `<memberId>-qr.png` (and existing print remains available), `Add another member` resets all form values, clears errors, revokes photo object URLs, sets step to `photo`, restarts the camera, and refreshes the members list in the background, and `Done` closes the dialog and refreshes the members list

### Requirement: Responsive wizard layout and accessibility
The system SHALL render the Create a member QR dialog as a full-screen sheet on mobile (`< 640px`) and a `600px` dialog on desktop, with accessible focus management, live step announcements, and touch-friendly target sizes.

#### Scenario: Responsive mobile sheet and desktop dialog layout
- **WHEN** the Create a member QR dialog is opened on a viewport `< 640px` vs `>= 640px`
- **THEN** mobile renders a full-screen sheet with a sticky footer (`position: sticky; bottom: 0` and `env(safe-area-inset-bottom)` padding) above scrollable content, while desktop renders a `600px` dialog with a single-row footer (`Skip` link on the left, actions on the right)

#### Scenario: Focus management, live announcements, and target sizing
- **WHEN** the wizard transitions between steps
- **THEN** focus moves to the step heading (or first field), an `aria-live="polite"` region announces `"Step n of 3, <name>"`, primary/footer buttons are `56px` high, and all interactive targets are at least `44px`

### Requirement: Tabbed edit member dialog navigation and identity header
The system SHALL present the "Edit member" dialog as three always-enabled tabs (`Photo`, `Details`, `Contact`) opening on `Photo` with no `Done` step, a live identity header (avatar, live name or `"Unnamed member"`, and locked `member_id` chip), parent-owned state preserved across tabs, a single `translateX` sliding active tab underline (`200ms`) with `200ms` panel opacity crossfade, and responsive sheet/dialog layout with focus management and `aria-live="polite"` announcements.

#### Scenario: Open edit dialog on Photo with live identity header
- **WHEN** a volunteer clicks Edit on an existing member
- **THEN** the dialog opens on the `Photo` tab titled `Edit member`, displays a 3-tab `tablist` (`Photo`, `Details`, `Contact`) with a single active underline and without `"Step n of 3"` copy, and shows the member's current avatar, name, and locked `member_id` chip (`can’t be changed`)

#### Scenario: Preserve unsaved edits when switching tabs
- **WHEN** a volunteer modifies a field in `Contact` or `Details`, switches to `Photo` via a tab button or footer section link, and switches back
- **THEN** all edited values remain intact in parent state, the single tab underline translates horizontally over `200ms` as panel content crossfades over `200ms` with no horizontal slide, focus moves to the active section heading (or first input on `Details` / `Contact`), and the live region announces `"Photo"`, `"Details"`, or `"Contact"`

#### Scenario: Update identity header preview when Name changes
- **WHEN** a volunteer edits or empties the `Name` field on `Details`
- **THEN** the identity header name updates live as the user types, falling back to `"Unnamed member"` in muted styling when trimmed `Name` is empty

#### Scenario: Responsive edit layout and target sizes
- **WHEN** the Edit member dialog is rendered on a viewport `< 640px` vs `>= 640px`
- **THEN** mobile renders a full-screen sheet with a sticky footer (`position: sticky; bottom: 0` with `env(safe-area-inset-bottom)` padding) while desktop renders a `600px` dialog with a single-row footer (`Cancel` left, `Save changes` right), `56px` primary/footer buttons, and at least `44px` interactive targets

### Requirement: Edit member snapshot dirty tracking and save availability
The system SHALL snapshot the member's initial values (including `pictureUrl`) when opening the edit dialog, compute dirty state per section against that snapshot, display a 7px teal dot on each dirty tab (entering with a `120ms` `0.6`-to-`1` scale and fade, and delaying unmount through its `84ms` exit unless reduced motion is active), and enable `Save changes` on every section only when at least one section is dirty and trimmed `name` is non-empty.

#### Scenario: Clean state on open disables Save changes
- **WHEN** the Edit member dialog opens with no changes made yet
- **THEN** no tab displays a dirty dot and `Save changes` is disabled with `#C5CDD0` styling across all three tabs

#### Scenario: Single section edit dots only that tab and enables Save everywhere
- **WHEN** a volunteer changes only `Phone` on the `Contact` tab and navigates to `Photo`
- **THEN** only the `Contact` tab displays a 7px teal dirty dot (entering over `120ms`), the dot persists while viewing `Photo`, and `Save changes` is enabled on `Photo`, `Details`, and `Contact`

#### Scenario: Reverting all edits to snapshot disables Save changes
- **WHEN** a volunteer modifies a field and then restores every modified field and photo to match the opening snapshot
- **THEN** all tab dirty dots animate out over `84ms` before unmounting (or disappear immediately under reduced motion) and `Save changes` becomes disabled again with a `140ms` color transition

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
The system SHALL validate `name` immediately when emptied (`"Enter the member’s name"`), validate email format on `Save changes`, block dismissal with a `"Saving…"` non-spinning loading state while submitting, upload any new photo before calling `updateMember`, close with `"Updated <name>"` toast on success, and preserve edits while routing field errors on failure.

#### Scenario: Immediate inline Name validation on empty input
- **WHEN** a volunteer clears the `Name` input on `Details` to empty or whitespace-only
- **THEN** the input immediately displays `"Enter the member’s name"` below the field with a `200ms` fade and `4px` drop alongside a red border (no shake), `aria-invalid="true"`, `aria-describedby` linking the error, focus remaining on `Name`, and `Save changes` disabled; typing a non-whitespace character clears the error over `140ms`

#### Scenario: Email validation routes to Contact on Save
- **WHEN** a volunteer enters an invalid email on `Contact`, switches to `Photo` or `Details`, and clicks `Save changes`
- **THEN** the dialog remains open, switches to `Contact`, and displays the inline email validation error without showing Contact errors on `Details`

#### Scenario: Blocking loading state and optimistic update on Save success
- **WHEN** a volunteer clicks `Save changes` with valid dirty changes
- **THEN** `Cancel`, `Close`, `Save changes` (displaying `"Saving…"` without a rotating spinner icon), `Esc`, and scrim dismissal are blocked until `uploadMemberPhoto` (when a new file exists) and `updateMember` resolve, after which the directory updates optimistically, the dialog closes over `140ms`, and the `"Updated <name>"` top toast is displayed

#### Scenario: Preserve values and route server errors on Save failure
- **WHEN** `updateMember` or photo upload fails with an error
- **THEN** the dialog stays open with all edited values preserved, re-enables `Save changes`, displays the error, and switches to `Details` or `Contact` if the error routes to `name` or `email`

### Requirement: Edit member discard confirmation on unsaved changes
The system SHALL close immediately over `140ms` when closing the Edit member dialog with no dirty changes against the opening snapshot, and SHALL prompt `"Discard changes?"` with a calm backdrop fade and `8px` lift (`200ms` enter / `140ms` exit) before closing when unsaved edits exist.

#### Scenario: Close immediately when no fields differ from snapshot
- **WHEN** a volunteer opens the Edit member dialog and clicks `Close` (`X`), `Cancel`, scrim, or presses `Esc` without changing any field or photo from the snapshot
- **THEN** the dialog closes smoothly over `140ms` without displaying the discard confirmation sheet

#### Scenario: Prompt discard confirmation when edits exist
- **WHEN** a volunteer modifies any field or photo and clicks `Close` (`X`), `Cancel`, scrim, or presses `Esc` while not submitting
- **THEN** the dialog displays the `alertdialog` titled `"Discard changes?"` with a `200ms` backdrop fade and `8px` lift, body `"You have unsaved edits for <original name>. Closing now will lose them."`, and buttons `Keep editing` and `Discard`

#### Scenario: Dismiss discard sheet or confirm discard
- **WHEN** the `"Discard changes?"` sheet is open and the volunteer clicks `Keep editing` or presses `Esc`, versus clicking `Discard`
- **THEN** `Keep editing` or `Esc` closes only the sheet over `140ms` leaving all edits intact, while `Discard` closes the dialog, drops all edits without calling `updateMember`, and stops any active camera stream
