# Proposal

## Why

When volunteers take a member's photo on mobile devices, the member camera currently requests the front-facing (`user`) camera instead of the rear (`environment`) camera, making it awkward to photograph another person during in-person registration. Additionally, camera captures are saved as high-quality JPEGs (0.9) and uploaded image files are stored in their original format and size, consuming unnecessary storage and bandwidth when compressed WebP images (75%–80% quality) provide smaller files with strong visual fidelity.

## What Changes

- Switch the member camera capture constraints from front-facing (`facingMode: { ideal: "user" }`) to rear/back-facing (`facingMode: { ideal: "environment" }`) so mobile devices activate the back camera by default while still falling back gracefully on devices without a rear camera.
- Compress and encode **all** member photos—both camera-captured frames and uploaded image files—into WebP format (`image/webp`) at 75%–80% quality (e.g., `0.78`) before previewing/uploading.
- Store all newly uploaded member photos in the `member-photos` Supabase Storage bucket with `.webp` extensions and `image/webp` content type.

## Capabilities

### New Capabilities

<!-- None; this refines the existing member-directory photo upload and camera capture requirements. -->

### Modified Capabilities

- `member-directory`: Update the "Upload and display member photo" requirement so mobile camera capture defaults to the rear (`environment`) camera and all captured or uploaded member photos are compressed to 75%–80% quality and stored as WebP (`image/webp`).

## Impact

- **Camera capture hook**: `src/components/rollcall/members/use-member-camera.ts` (update `facingMode` to `environment`, capture canvas output as compressed WebP).
- **Member photo upload & processing**: `src/components/rollcall/members/member-directory.tsx` (and a shared client-side image compression helper if extracted) to convert/compress selected image files to WebP (0.75–0.80 quality) and upload with `.webp` extension and `image/webp` content type.
- **Tests**: `src/components/rollcall/members/member-directory.test.tsx` (update camera constraint expectations to `environment`, verify WebP compression/file type for both camera capture and file upload, and cover edge cases such as unreadable/unsupported image conversion).
- **Backend / Storage / DB**: No database schema or Supabase Storage bucket policy changes required (`member-photos` bucket has no MIME restriction); existing stored member photo URLs remain valid.
