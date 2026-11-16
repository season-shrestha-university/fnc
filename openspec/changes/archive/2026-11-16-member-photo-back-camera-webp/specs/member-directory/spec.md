# Spec Delta

## MODIFIED Requirements

### Requirement: Upload and display member photo
The system SHALL allow authenticated volunteers to upload an image file or capture a photo using the device camera (defaulting to the rear/environment-facing camera on mobile devices) when creating or editing a member, compress the photo to 75%–80% quality in WebP format, store it in object storage, and display the photo in the member's avatar.

#### Scenario: Upload photo during member creation or update
- **WHEN** a volunteer selects an image file and saves the member form
- **THEN** the system compresses and converts the image to WebP format at 75%–80% quality, uploads the `.webp` file to object storage, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Capture photo using device camera
- **WHEN** a volunteer opens the camera in the member form on a mobile device or desktop browser, captures a frame, and saves the member form
- **THEN** the system activates the rear/environment-facing camera by default (falling back to an available camera on devices without a rear camera), stops the camera preview upon capture, compresses the captured frame to WebP format at 75%–80% quality, displays the preview, uploads the `.webp` file, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Retake or cancel camera capture
- **WHEN** a volunteer cancels an active camera preview, closes the member form, or chooses to retake a captured photo
- **THEN** the system releases the active camera stream and allows capturing again or uploading an image file

#### Scenario: Camera access unavailable or denied
- **WHEN** a volunteer attempts to start the camera on an insecure context, unsupported browser, denied permission, or missing/busy camera
- **THEN** the system displays an actionable error message and keeps file upload available

#### Scenario: Reject invalid or unconvertible image upload
- **WHEN** a volunteer selects a non-image file or an image that cannot be decoded or encoded to WebP
- **THEN** the system displays an error message, does not upload an unvalidated file, and leaves the form open for retry

#### Scenario: Fallback when no photo is provided
- **WHEN** a member has no uploaded photo
- **THEN** the system renders the member's initials in their avatar
