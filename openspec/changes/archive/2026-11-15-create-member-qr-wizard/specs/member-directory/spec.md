# Spec Delta

## MODIFIED Requirements

### Requirement: Upload and display member photo
The system SHALL allow authenticated volunteers to upload an image file or capture a photo using the device camera when creating or editing a member, downscale the photo to at most 600px on its longest side, compress it to 75%–80% quality in WebP format (falling back to compressed JPEG when WebP encoding is unsupported, or `image/jpeg` at 0.85 quality for direct camera blob capture), store it in object storage, and display the photo in the member's avatar. In the Create a member QR wizard, the Photo step SHALL default to the front (`user`) camera, support switching cameras when multiple cameras exist, mirror front-camera captures horizontally, and manage the stream lifecycle automatically.

#### Scenario: Upload photo during member creation or update
- **WHEN** a volunteer selects an image file (`accept="image/*"`) and saves or creates the member
- **THEN** the system validates the image file, downscales it to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses and converts it to WebP format at 75%–80% quality (or JPEG fallback), uploads it to object storage, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Capture photo using device camera
- **WHEN** a volunteer opens the camera in the member form on a mobile device or desktop browser, captures a frame, and saves the member form
- **THEN** the system stops the camera preview upon capture, downscales the captured frame to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses it, displays the preview, uploads the file, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Auto-start front camera on Photo step mount
- **WHEN** the Create a member QR dialog opens on the Photo step in `camera` sub-state, or the volunteer returns to Photo with no captured photo, or clicks `Retake`
- **THEN** the system displays the dark preview with the oval guide while loading, calls `getUserMedia` with `facingMode: 'user'`, and displays the live camera preview

#### Scenario: Switch between front and rear cameras
- **WHEN** the device has more than one video input reported by `enumerateDevices` and the volunteer activates the switch-camera button
- **THEN** the system stops the current media stream tracks and requests the opposite `facingMode` (`environment` or `user`); when only one camera exists, the switch-camera button is hidden

#### Scenario: Capture photo with horizontal mirroring for front camera
- **WHEN** the volunteer clicks `Take photo` during a live camera preview
- **THEN** the system draws the video frame to a canvas (mirroring horizontally when using the front camera so it matches the preview), encodes the captured image, stores it in parent form state, previews it via `URL.createObjectURL`, transitions to the `captured` sub-state, and stops all active camera stream tracks

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

## ADDED Requirements

### Requirement: Three-step member QR creation wizard
The system SHALL present the "Create a member QR" dialog as a 3-step wizard (`photo`, `details`, `contact`) followed by a `done` completion state, backed by a single parent-owned form state for `name`, `memberId` (placeholder `MEMBER-001`), `dateOfBirth`, `email`, `phone`, `address`, and `photo`.

#### Scenario: Preserve form values across step navigation
- **WHEN** a volunteer enters values in `Details` or `Contact` (such as typing an email), navigates `Back` to an earlier step, and returns forward
- **THEN** all previously entered field values and captured/uploaded photo remain intact in parent state

#### Scenario: Progress bar visibility and step indicator
- **WHEN** the dialog is on step 1 (`photo`), step 2 (`details`), or step 3 (`contact`)
- **THEN** the progress bar displays `Step n of 3 · <name>` with segments up to and including the current step filled; when the dialog is in `done`, the progress bar is hidden

#### Scenario: Navigate between Photo, Details, and Contact steps
- **WHEN** the volunteer uses `Skip for now` (setting `photo = null`) or `Next` from `Photo`, `Next`/`Back` on `Details`, `Back` on `Contact`, `Change`/`Add photo` on `Details`, or summary shortcut chips on `Contact`
- **THEN** the dialog transitions to the target step (returning to `Photo` in `captured` sub-state if a photo exists, or `camera` sub-state if not; `Photo` chip jumps to `Photo`, other summary chips jump to `Details`)

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
The system SHALL submit the existing create-member payload on `Create & generate QR`, show a blocking loading state while submitting, and transition to an in-dialog `done` state displaying the server-returned member and QR code.

#### Scenario: Loading state during submission
- **WHEN** the volunteer clicks `Create & generate QR` and the request is in flight
- **THEN** both footer buttons are disabled, the primary button displays a spinner and `"Creating…"`, and closing the dialog is blocked

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
