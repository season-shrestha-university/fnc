# Tasks

## 1. Downscaling & JPEG Fallback Utilities

- [x] 1.1 Update `src/components/rollcall/members/member-photo-utils.ts` to export `MAX_PHOTO_DIMENSION = 600` and `calculateScaledDimensions(width, height, maxDimension)` (preserving aspect ratio without upscaling), downscale decoded images during compression (`drawImage` to scaled canvas dimensions), and fall back to compressed JPEG (`image/jpeg`, `0.78`, `.jpg`) when `canvas.toBlob("image/webp", ...)` does not return `image/webp` (throwing only if both WebP and JPEG fail); update `src/components/rollcall/members/member-photo-utils.test.ts` to verify downscaling (`4032x3024` -> `600x450`), no-upscale (`320x240` -> `320x240`), WebP primary output, JPEG fallback output, and dual-failure error via `./node_modules/.bin/vitest run src/components/rollcall/members/member-photo-utils.test.ts`.

## 2. Camera Capture Downscaling

- [x] 2.1 Update `src/components/rollcall/members/use-member-camera.ts` to size the capture canvas using `calculateScaledDimensions(video.videoWidth, video.videoHeight)` and encode with the WebP-with-JPEG-fallback helper, and update `src/components/rollcall/members/member-directory.test.tsx` to verify camera capture draws onto a `<= 600px` scaled canvas and handles JPEG fallback via `./node_modules/.bin/vitest run src/components/rollcall/members/member-directory.test.tsx`.

## 3. Dynamic Upload Metadata for WebP & Fallback JPEG

- [x] 3.1 Update `uploadMemberPhoto` in `src/components/rollcall/members/member-directory.tsx` to derive the storage object extension (`.webp` or `.jpg`) and `contentType` (`image/webp` or `image/jpeg`) from the compressed `File`, and add a test in `src/components/rollcall/members/member-directory.test.tsx` verifying fallback `.jpg` / `image/jpeg` uploads succeed when WebP encoding is unavailable via `./node_modules/.bin/vitest run src/components/rollcall/members/member-directory.test.tsx`.

## 4. Verification

- [x] 4.1 Run `./node_modules/.bin/vitest run`, `./node_modules/.bin/eslint` on all modified/created files, and `./node_modules/.bin/tsc --noEmit` and confirm all tests, lint checks, and type checks pass with zero errors.
