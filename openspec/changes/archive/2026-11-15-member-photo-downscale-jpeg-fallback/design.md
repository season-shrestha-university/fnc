# Design

## Context

`member-photo-utils.ts` (`src/components/rollcall/members/member-photo-utils.ts`) currently encodes canvases and decoded image files via `canvasToWebpFile`, keeping full source dimensions (`decoded.width` x `decoded.height`) and throwing `"This browser does not support WebP image encoding."` if `canvas.toBlob` does not return `image/webp`. Similarly, `useMemberCamera` (`src/components/rollcall/members/use-member-camera.ts`) draws at full `video.videoWidth` x `video.videoHeight`, and `uploadMemberPhoto` in `src/components/rollcall/members/member-directory.tsx` hardcodes `.webp` and `contentType: "image/webp"`.

Meanwhile, member avatars in `Avatar` (`src/components/rollcall/check-in/attendance-view.tsx`) render up to `size-16` (`64x64` CSS px) and the form preview renders at `size-20` (`80x80` CSS px) with `object-cover rounded-full`.

See `proposal.md` for motivation and `specs/member-directory/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Downscale both camera-captured video frames and uploaded image files to at most `600px` on the longest side while preserving aspect ratio and never upscaling smaller images.
- Keep lossy WebP (`image/webp`, quality `0.78`) as the primary format and fall back seamlessly to compressed JPEG (`image/jpeg`, quality `0.78`) when a browser does not support native WebP canvas encoding.
- Persist `.webp` or fallback `.jpg` objects in `member-photos` with matching `contentType`.

**Non-Goals:**
- Adding client-side WASM WebP codecs (e.g., `@jsquash/webp`) or server-side `sharp` re-encoding routes—downscaled JPEG fallback achieves the ~30–80 KB size target without extra dependencies or backend hops.
- Center-cropping photos to a square (UI avatars already apply `object-cover rounded-full`).
- Re-encoding or migrating previously uploaded member photos in Supabase Storage.

## Decisions

### 1. Aspect-preserving downscaling capped at `600px`
- **Choice**: Export `MAX_PHOTO_DIMENSION = 600` and `calculateScaledDimensions(width, height, maxDimension = MAX_PHOTO_DIMENSION)` from `src/components/rollcall/members/member-photo-utils.ts`:
  - Compute `longest = Math.max(width, height)`. If `longest <= maxDimension`, return `{ width, height }` unchanged (no upscaling).
  - Otherwise compute `scale = maxDimension / longest` and return `{ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }`.
- **Rationale**: A `600px` ceiling provides >2.5x Retina sharpness for `64px`–`80px` avatars while shrinking a `4032x3024` photo to `600x450` (~45x fewer pixels) and avoiding distortion or accidental edge cropping.
- **Alternatives considered**:
  - `400x400` square center-crop — rejected because off-center subjects in portraits could be clipped unnecessarily when `object-cover` already handles circular framing.
  - Passing `width`/`height` constraints to `getUserMedia` only — rejected because mobile browsers treat `width`/`height` as `ideal` sensor modes and still deliver larger frames (e.g., `1280x720` or `1920x1080`), and file uploads bypass `getUserMedia`.

### 2. Try WebP (`0.78`), fall back to JPEG (`0.78`) on unsupported browsers
- **Choice**: Update `canvasToWebpFile` (or rename/keep alias `canvasToCompressedPhotoFile` alongside `canvasToWebpFile` if helpful; cleaner to name `canvasToCompressedPhotoFile` and `compressImageFileToPhoto`, updating all callers) in `member-photo-utils.ts`:
  - First call `canvas.toBlob(resolve, "image/webp", PHOTO_QUALITY)` (`0.78`). If `blob && blob.type === "image/webp"`, return `new File([blob], `${filenameBase}.webp`, { type: "image/webp" })`.
  - Otherwise fall back to `canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY)`. If `blob && blob.type === "image/jpeg"`, return `new File([blob], `${filenameBase}.jpg`, { type: "image/jpeg" })`.
  - Only throw if both fail to produce a valid blob.
- **Rationale**: Browsers without native `canvas.toBlob("image/webp")` support silently return `image/png` (or `null`); falling back to `0.78` lossy JPEG at `<= 600px` keeps volunteers unblocked and keeps output sizes compact without adding WASM or server endpoints.
- **Alternatives considered**:
  - Client-side WASM WebP encoder (`@jsquash/webp`) — rejected due to ~150 KB WASM asset weight and bundler complexity for rare legacy browsers.
  - Server-side `sharp` API endpoint — rejected because it adds an authenticated API hop and server CPU/memory cost when client-side JPEG fallback satisfies the size goal.

### 3. Downscaled drawing in both capture and upload paths, dynamic upload metadata
- **Choice**:
  - In `useMemberCamera.capturePhoto()`, size the offscreen `<canvas>` with `calculateScaledDimensions(video.videoWidth, video.videoHeight)` and draw `context.drawImage(video, 0, 0, canvas.width, canvas.height)` before encoding.
  - In `compressImageFileToWebp` (or `compressImageFile`), size the canvas with `calculateScaledDimensions(decoded.width, decoded.height)` and draw `decoded.draw(context, canvas.width, canvas.height)` using `drawImage(..., 0, 0, targetWidth, targetHeight)`.
  - In `uploadMemberPhoto` (`member-directory.tsx`), derive `extension = compressedFile.type === "image/webp" ? "webp" : "jpg"` and pass `{ contentType: compressedFile.type, upsert: true }` to `supabase.storage.from("member-photos").upload(...)`.
- **Rationale**: Both capture and upload share identical sizing, compression, and memory cleanup rules.

## Risks / Trade-offs

- **[Risk] JPEG fallback slightly larger than WebP (~15–30% larger at `0.78`) on unsupported browsers** → Mitigation: Downscaling to `<= 600px` keeps even fallback JPEGs in the ~40–80 KB range, well below `MAX_PHOTO_BYTES` (5 MB).
- **[Risk] Very large `4032x3024` mobile photos decoded into memory before canvas resize** → Mitigation: Use `createImageBitmap` where available (and `bitmap.close()` immediately after drawing), revoke object URLs, and reset `canvas.width = 0; canvas.height = 0` in `finally`. Note `createImageBitmap(file, { resizeWidth, ... })` isn't universally consistent with orientation across browsers, so drawing scaled onto `<canvas>` is predictable and preserves EXIF orientation in modern browsers.
