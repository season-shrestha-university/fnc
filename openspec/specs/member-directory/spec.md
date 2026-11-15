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
The system SHALL allow authenticated volunteers to upload an image file or capture a photo using the device camera (defaulting to the rear/environment-facing camera on mobile devices) when creating or editing a member, downscale the photo to at most 600px on its longest side, compress it to 75%–80% quality in WebP format (falling back to compressed JPEG when WebP encoding is unsupported), store it in object storage, and display the photo in the member's avatar.

#### Scenario: Upload photo during member creation or update
- **WHEN** a volunteer selects an image file and saves the member form
- **THEN** the system downscales the image to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses and converts it to WebP format at 75%–80% quality, uploads the `.webp` file to object storage, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Capture photo using device camera
- **WHEN** a volunteer opens the camera in the member form on a mobile device or desktop browser, captures a frame, and saves the member form
- **THEN** the system activates the rear/environment-facing camera by default (falling back to an available camera on devices without a rear camera), stops the camera preview upon capture, downscales the captured frame to at most 600px on its longest side (preserving aspect ratio without upscaling), compresses it to WebP format at 75%–80% quality, displays the preview, uploads the `.webp` file, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Fallback to compressed JPEG when WebP encoding is unsupported
- **WHEN** a volunteer captures a camera photo or selects an image file in a browser whose canvas encoder does not support `image/webp`
- **THEN** the system downscales the image to at most 600px on its longest side, compresses it as JPEG at 75%–80% quality, and uploads the `.jpg` file with `image/jpeg` content type instead of failing

#### Scenario: Retake or cancel camera capture
- **WHEN** a volunteer cancels an active camera preview, closes the member form, or chooses to retake a captured photo
- **THEN** the system releases the active camera stream and allows capturing again or uploading an image file

#### Scenario: Camera access unavailable or denied
- **WHEN** a volunteer attempts to start the camera on an insecure context, unsupported browser, denied permission, or missing/busy camera
- **THEN** the system displays an actionable error message and keeps file upload available

#### Scenario: Reject invalid or unconvertible image upload
- **WHEN** a volunteer selects a non-image file or an image that cannot be decoded or encoded to WebP or JPEG
- **THEN** the system displays an error message, does not upload an unvalidated file, and leaves the form open for retry

#### Scenario: Fallback when no photo is provided
- **WHEN** a member has no uploaded photo
- **THEN** the system renders the member's initials in their avatar

### Requirement: Edit member profile with immutable member ID
The system SHALL allow authenticated volunteers to edit a member's `name`, `email`, `phone`, `address`, `dob`, and photo, while keeping `member_id` read-only and immutable after creation.

#### Scenario: Update editable member fields
- **WHEN** a volunteer opens the edit form for an existing member, modifies `name`, `email`, `phone`, `address`, `dob`, or photo, and saves
- **THEN** the system updates the member record while preserving the original `member_id` and QR code

#### Scenario: Prevent changing member ID on edit
- **WHEN** a volunteer views the edit member form or submits an update for an existing member
- **THEN** the `member_id` field is displayed as read-only and any attempt to alter `member_id` is ignored or rejected

### Requirement: Delete member and cascade check-ins
The system SHALL allow authenticated volunteers to delete a member after confirmation, removing the member record and any associated event check-ins.

#### Scenario: Confirm and delete member
- **WHEN** a volunteer confirms deletion of a member
- **THEN** the system deletes the member and all check-in records associated with that member

### Requirement: Generate, download, and print member QR code
The system SHALL generate a unique QR code encoding the member's `member_id` and allow volunteers to view, download as PNG, or print the QR code.

#### Scenario: View and download member QR
- **WHEN** a volunteer selects "Generate QR" for a member and clicks "Download"
- **THEN** the system renders a QR code encoding `member_id` and downloads a PNG file named `<member_id>-qr.png`
