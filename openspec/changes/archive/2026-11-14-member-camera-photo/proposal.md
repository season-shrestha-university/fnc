# Proposal

## Why

Volunteers creating or updating a member currently have to pick an existing image file from disk. Allowing volunteers to take a member's picture directly with the device camera makes in-person registration much faster on phones, tablets, and laptops without leaving the form.

## What Changes

- Add an in-form camera capture option alongside file upload in the member photo field when creating (and editing) a member.
- Stream a live camera preview using `navigator.mediaDevices.getUserMedia`, capture a still frame to a JPEG `File` via canvas, and preview it before saving.
- Allow volunteers to retake or clear a captured photo, switch/cancel out of the camera view cleanly, and stop the camera stream when cancelled, captured, or when the modal closes.
- Surface clear error feedback when camera access is unsupported, blocked by missing HTTPS, denied, or unavailable, while keeping file upload available as a fallback.

## Capabilities

### New Capabilities

<!-- None; this extends the existing member-directory photo capability. -->

### Modified Capabilities

- `member-directory`: Extend the member photo requirement so authenticated volunteers can capture a photo using the device camera in addition to uploading an image file.

## Impact

- **UI**: `src/components/rollcall/members/member-directory.tsx` (member form modal photo controls, live camera preview, capture/retake/cancel controls) and a dedicated camera capture hook or helper component.
- **Shared camera utilities**: Potential extraction/reuse of camera permission/error handling patterns currently in `src/components/rollcall/check-in/use-qr-scanner.ts`.
- **Tests**: `src/components/rollcall/members/member-directory.test.tsx` (covering camera capture, retake/cancel, stream cleanup, and camera error handling).
- **Backend / Storage / DB**: No schema, server action, or Supabase storage changes required—captured photos produce a `File` that uploads through the existing `uploadMemberPhoto` flow to the `member-photos` bucket.
