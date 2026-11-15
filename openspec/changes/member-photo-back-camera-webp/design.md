# Design

## Context

`useMemberCamera` (`src/components/rollcall/members/use-member-camera.ts`) currently requests `{ facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }` and exports captured frames via `canvas.toBlob(resolve, "image/jpeg", 0.9)`. Meanwhile, `useQrScanner` (`src/components/rollcall/check-in/use-qr-scanner.ts`) already uses `facingMode: { ideal: "environment" }` with the shared `openCameraStream` helper in `src/components/rollcall/shared/camera-utils.ts`.

For file uploads, `MemberDirectory` (`src/components/rollcall/members/member-directory.tsx`) currently stores the raw `File` from `<input type="file" accept="image/*" />` and uploads it directly to the `member-photos` Supabase Storage bucket in `uploadMemberPhoto`, keeping the original file format and extension. The `member-photos` bucket (`supabase/migrations/20261114093000_complete_member_and_photo_storage.sql`) has no `allowed_mime_types` restriction.

See `proposal.md` for motivation and `specs/member-directory/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Default mobile camera capture in the member form to the rear (`environment`) camera while preserving graceful fallback on desktops/devices without a rear camera.
- Encode and compress both camera-captured frames and uploaded image files to WebP (`image/webp`) at 75%–80% quality (`0.78`) before storing in `member-photos`.
- Ensure uploaded files in Supabase Storage use `.webp` extensions and `image/webp` content type without changing backend APIs, database schema, or storage policies.

**Non-Goals:**
- Changing the QR scanner camera behavior (already uses `facingMode: { ideal: "environment" }`).
- Adding a front/back camera toggle UI or image cropping/editing UI.
- Migrating or re-encoding previously uploaded member photos already stored in Supabase Storage.

## Decisions

### 1. Default member camera constraint to `environment`
- **Choice**: Update `CAMERA_CONSTRAINTS` (currently `PORTRAIT_CONSTRAINTS`) in `src/components/rollcall/members/use-member-camera.ts` to use `facingMode: { ideal: "environment" }`.
- **Rationale**: Matches `useQrScanner` and ensures mobile browsers activate the back camera when volunteers photograph a member. Using `ideal` (rather than `exact`) plus `openCameraStream`'s `{ audio: false, video: true }` fallback on `OverconstrainedError` / `NotFoundError` ensures laptops and single-camera devices continue working.
- **Alternatives considered**: Adding a camera switcher UI — rejected as out of scope and unnecessary for the primary registration flow.

### 2. Shared client-side WebP encoding and compression helper
- **Choice**: Extract a small helper module (e.g., `src/components/rollcall/members/member-photo-utils.ts`) providing:
  - `WEBP_QUALITY = 0.78` (midpoint of the requested 75%–80% quality range).
  - `canvasToWebpFile(canvas, filenameBase)`: calls `canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)`, validates that the resulting `Blob` is non-null and has `blob.type === "image/webp"`, and returns a `File` named `<filenameBase>.webp` with `type: "image/webp"`.
  - `compressImageFileToWebp(file)`: validates `file.type.startsWith("image/")`, decodes the image onto an offscreen `<canvas>` (using `createImageBitmap` with an `HTMLImageElement` + `URL.createObjectURL` fallback, always revoking temporary object URLs), and delegates to `canvasToWebpFile`.
- **Rationale**: Keeps WebP encoding consistent across camera capture and file upload without duplicating canvas-to-blob logic or adding third-party compression libraries.
- **Alternatives considered**: Server-side compression via an API route or Supabase Edge Function — rejected because client-side canvas encoding avoids uploading large raw phone photos (often 4–12 MB) over mobile networks and requires no backend infrastructure changes.

### 3. When compression runs and how upload handles it
- **Choice**:
  - Camera capture calls `canvasToWebpFile` directly during `capturePhoto()` so `photoFile` is immediately a compressed `.webp` `File`.
  - File input selection in `MemberDirectory` compresses the selected file (either on selection with async tracking/disabled save while processing, or inside `uploadMemberPhoto` prior to checking `MAX_PHOTO_BYTES` and uploading). Running compression before the `MAX_PHOTO_BYTES` (5 MB) check allows large phone photos that compress well under 5 MB as WebP to succeed, while compressing on upload (or tracking a pending compression promise) prevents form submission races. Specifically: compress in `handlePhotoChange` only if awaited or better yet track `isProcessingPhoto` / compress in `uploadMemberPhoto` for non-camera files (skipping re-encoding when the `File` already came from `capturePhoto()`).
  - `uploadMemberPhoto` always uploads with a `.webp` path suffix and `{ contentType: "image/webp", upsert: true }`.
- **Rationale**: Avoids double-compressing camera captures while ensuring every uploaded file—including PNG, JPEG, or oversized/uncompressed WebP files from disk—is compressed to 75%–80% WebP before storage.

## Risks / Trade-offs

- **[Risk] Browser does not support `canvas.toBlob` WebP encoding (silently returns `image/png`)** → Mitigation: Explicitly check `blob.type === "image/webp"` in `canvasToWebpFile` and throw a clear error if the browser cannot encode WebP, rather than silently storing an uncompressed PNG with a `.webp` extension.
- **[Risk] Selected file cannot be decoded by the browser (e.g., corrupted file or unsupported HEIC on desktop browsers)** → Mitigation: Catch image decode errors in `compressImageFileToWebp` and surface an actionable toast error without clearing the form or uploading invalid data.
- **[Risk] Large raw image files on mobile consume memory during offscreen canvas decoding** → Mitigation: Release/revoke temporary object URLs immediately after drawing and clear canvas dimensions after export.
