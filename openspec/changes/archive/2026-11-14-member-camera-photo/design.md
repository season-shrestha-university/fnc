# Design

## Context

`MemberDirectory` (`src/components/rollcall/members/member-directory.tsx`) already supports member photo uploads by storing a selected `File` in `photoFile`, previewing it via `photoPreviewUrl`, and uploading it to the `member-photos` Supabase Storage bucket in `uploadMemberPhoto` (enforcing `image/*` and `MAX_PHOTO_BYTES = 5 * 1024 * 1024`). Separately, `src/components/rollcall/check-in/use-qr-scanner.ts` already handles `navigator.mediaDevices.getUserMedia`, secure-context checks, `DOMException` error mapping, and `MediaStream` cleanup.

See `proposal.md` for motivation and `specs/member-directory/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Allow volunteers to open a live camera preview inside the member create/edit modal, capture a still photo, preview it, retake it, or cancel back to file upload.
- Produce a standard `File` (`image/jpeg`) from the captured frame so it flows through the existing `photoFile` preview and `uploadMemberPhoto` path without backend or schema changes.
- Guarantee the camera `MediaStream` is stopped on capture, cancel, modal close, and unmount.

**Non-Goals:**
- Image cropping, rotation, or filter editing UI.
- Multi-camera selector dropdowns (beyond `facingMode: { ideal: "user" }` with `{ video: true }` fallback).
- Changes to Supabase Storage policies, database columns, or server actions.

## Decisions

### 1. In-modal `getUserMedia` + `<canvas>` capture alongside file input
- **Choice**: Keep `<input type="file" accept="image/*">` and add a "Use camera" button that opens an inline `<video>` preview with "Capture" and "Cancel" controls. Clicking "Capture" draws the current video frame to an offscreen `<canvas>`, exports a JPEG `Blob` (`image/jpeg`, quality `0.9`), wraps it in a `File`, stops the stream, and sets `photoFile` + `photoPreviewUrl`.
- **Alternatives considered**: Using `<input type="file" accept="image/*" capture="user">` was rejected because desktop browsers ignore `capture` and open a standard file picker, and it replaces file selection instead of offering both options cleanly.

### 2. Portrait-oriented camera constraints with fallback
- **Choice**: Request `{ audio: false, video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } } }` and fall back to `{ audio: false, video: true }` on `OverconstrainedError` or `NotFoundError`.
- **Rationale**: Member registration photos are portraits (front camera on tablets/phones, webcam on laptops). Using `ideal` rather than `exact` ensures single-camera devices do not fail.

### 3. Shared camera error & stream helper
- **Choice**: Extract `cameraErrorMessage` and `openCameraStream` / `stopMediaStream` into a shared utility (e.g., `src/components/rollcall/shared/camera-utils.ts`) used by both `use-qr-scanner.ts` and the member camera capture hook/component.
- **Rationale**: Avoids duplicating `DOMException` handling (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`) and `window.isSecureContext` checks.

### 4. Lifecycle and resource cleanup
- **Choice**: Attach `stopCamera()` to capture completion, cancel button, modal close/Cancel button, and `useEffect` unmount cleanup. Revoke any `blob:` `photoPreviewUrl` before replacing or clearing it. Guard capture on `video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA` and `video.videoWidth > 0`.

## Risks / Trade-offs

- **[Risk] Camera indicator stays on if user closes the modal while previewing** → Mitigation: Call `stopCamera()` in the modal close handler and in an unmount `useEffect`.
- **[Risk] `getUserMedia` fails on non-HTTPS LAN URLs during mobile testing** → Mitigation: Check `window.isSecureContext` before calling `getUserMedia`, show a clear error via `onMessage`, and keep the file upload input functional.
- **[Risk] Canvas `toBlob` returns `null` in edge-case browsers or unready video frames** → Mitigation: Check `videoWidth > 0` before drawing and handle `blob === null` with an explicit error toast without clearing any existing photo.
