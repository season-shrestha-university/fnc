# Spec Delta

## MODIFIED Requirements

### Requirement: Upload and display member photo
The system SHALL allow authenticated volunteers to upload an image file or capture a photo using the device camera when creating or editing a member, store the photo in object storage, and display the photo in the member's avatar.

#### Scenario: Upload photo during member creation or update
- **WHEN** a volunteer selects an image file and saves the member form
- **THEN** the system uploads the image, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Capture photo using device camera
- **WHEN** a volunteer opens the camera in the member form, captures a frame, and saves the member form
- **THEN** the system stops the camera preview, displays the captured photo preview, uploads the captured image, persists its URL on the member record, and renders the photo in the member directory and attendance avatars

#### Scenario: Retake or cancel camera capture
- **WHEN** a volunteer cancels an active camera preview, closes the member form, or chooses to retake a captured photo
- **THEN** the system releases the active camera stream and allows capturing again or uploading an image file

#### Scenario: Camera access unavailable or denied
- **WHEN** a volunteer attempts to start the camera on an insecure context, unsupported browser, denied permission, or missing/busy camera
- **THEN** the system displays an actionable error message and keeps file upload available

#### Scenario: Fallback when no photo is provided
- **WHEN** a member has no uploaded photo
- **THEN** the system renders the member's initials in their avatar
