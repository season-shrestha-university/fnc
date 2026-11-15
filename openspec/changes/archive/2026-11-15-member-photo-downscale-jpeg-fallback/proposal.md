# Proposal

## Why

Member profile photos are currently encoded at full sensor/upload resolution (e.g., `4032x3024` phone photos or `1280x720` camera streams), even though the UI only renders small circular avatars (`36px`–`80px`), keeping compressed files much larger than necessary. In addition, failing hard when a browser lacks native `canvas.toBlob("image/webp")` support blocks volunteers on older or privacy-hardened browsers from saving photos at all when a downscaled, compressed JPEG fallback achieves the same ~30–80 KB size goal.

## What Changes

- Downscale **all** member photos (both camera-captured frames and uploaded image files) to a maximum of `600px` on the longest side while preserving aspect ratio and never upscaling smaller images.
- Keep lossy WebP (`image/webp` at 75%–80% quality, `0.78`) as the primary output format, and automatically fall back to compressed JPEG (`image/jpeg` at `0.78` quality) when a browser does not support native WebP encoding instead of throwing an error.
- Store uploaded photos in the `member-photos` Supabase Storage bucket with `.webp` (`image/webp`) or fallback `.jpg` (`image/jpeg`) extension and content type matching the encoded file.

## Capabilities

### New Capabilities

<!-- None; this refines the existing member-directory photo upload and camera capture requirements. -->

### Modified Capabilities

- `member-directory`: Update "Upload and display member photo" so all captured or uploaded member photos are downscaled to at most `600px` on the longest side (preserving aspect ratio) and encoded to 75%–80% quality WebP, falling back to compressed JPEG when the browser cannot encode WebP.

## Impact

- **Photo compression utilities**: `src/components/rollcall/members/member-photo-utils.ts` (add `MAX_PHOTO_DIMENSION = 600`, `calculateScaledDimensions`, and WebP-with-JPEG-fallback canvas encoding).
- **Camera capture hook**: `src/components/rollcall/members/use-member-camera.ts` (draw captured video frame onto a downscaled `<= 600px` canvas and encode via the fallback-capable helper).
- **Member photo upload**: `src/components/rollcall/members/member-directory.tsx` (upload `.webp` or fallback `.jpg` with matching `contentType`).
- **Tests**: `src/components/rollcall/members/member-photo-utils.test.ts` and `src/components/rollcall/members/member-directory.test.tsx` (cover `<= 600px` aspect-preserving downscaling, no-upscale behavior, JPEG fallback when WebP is unsupported, and matching storage upload metadata).
- **Backend / Storage / DB**: No database schema or Supabase Storage bucket policy changes required.
