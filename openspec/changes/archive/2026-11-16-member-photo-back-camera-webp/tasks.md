# Tasks

## 1. Shared WebP Photo Compression Utilities

- [x] 1.1 Create `src/components/rollcall/members/member-photo-utils.ts` exporting `WEBP_QUALITY` (between `0.75` and `0.80`, e.g., `0.78`), `canvasToWebpFile(canvas, filenameBase)`, and `compressImageFileToWebp(file)` (validating `image/*`, decoding onto canvas, encoding to `image/webp` at `WEBP_QUALITY`, verifying `blob.type === "image/webp"`, and cleaning up object URLs/canvas memory), and verify unit tests for valid image conversion, non-image rejection, decode errors, and unsupported WebP encoding pass via `pnpm test:ci src/components/rollcall/members/member-photo-utils.test.ts`.

## 2. Back Camera Default & WebP Capture

- [x] 2.1 Update `src/components/rollcall/members/use-member-camera.ts` to request `facingMode: { ideal: "environment" }` instead of `"user"` and encode captured frames via `canvasToWebpFile` as `.webp` (`image/webp`), then update and verify the camera capture tests in `src/components/rollcall/members/member-directory.test.tsx` (`pnpm test:ci src/components/rollcall/members/member-directory.test.tsx`) assert `facingMode: { ideal: "environment" }`, `canvas.toBlob` called with `"image/webp"` and quality in `0.75..0.80`, and WebP preview/capture behavior.

## 3. WebP Compression on File Upload & Storage

- [x] 3.1 Update `uploadMemberPhoto` and photo selection handling in `src/components/rollcall/members/member-directory.tsx` so uploaded image files are compressed via `compressImageFileToWebp` (without double-compressing already-encoded camera captures), validated against `MAX_PHOTO_BYTES` after compression, and uploaded to `member-photos` with a `.webp` extension and `contentType: "image/webp"`, and verify upload tests in `src/components/rollcall/members/member-directory.test.tsx` (`pnpm test:ci src/components/rollcall/members/member-directory.test.tsx`) confirm `.webp` upload paths, `image/webp` content type, and error handling for invalid/unconvertible files.

## 4. Verification

- [x] 4.1 Run `pnpm test:ci`, `pnpm lint`, and `pnpm exec tsc --noEmit` and confirm all test suites, lint checks, and TypeScript checks pass with zero errors.
