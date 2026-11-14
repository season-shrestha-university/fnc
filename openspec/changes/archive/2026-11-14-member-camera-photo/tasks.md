# Tasks

## 1. Shared Camera Utilities

- [x] 1.1 Extract `openCameraStream`, `stopMediaStream`, and `cameraErrorMessage` into `src/components/rollcall/shared/camera-utils.ts` and update `src/components/rollcall/check-in/use-qr-scanner.ts` to use them; verify existing QR scanner tests pass (`npx vitest run src/components/rollcall/check-in`).

## 2. Member Camera Capture UI & Lifecycle

- [x] 2.1 Add a `useMemberCamera` hook (or inline camera state in `src/components/rollcall/members/member-directory.tsx`) managing `getUserMedia` with portrait constraints (`facingMode: { ideal: "user" }`), secure-context/support checks, `<video>` stream attachment, `<canvas>` JPEG `File` capture, and cleanup on capture, cancel, modal close, and unmount; verify TypeScript compiles cleanly (`npx tsc --noEmit`).
- [x] 2.2 Update the member form Photo section in `src/components/rollcall/members/member-directory.tsx` with "Take photo" / "Capture" / "Cancel" / "Retake" controls alongside the existing file `<Input type="file" accept="image/*" />`, wiring captured files into `photoFile` and `photoPreviewUrl` (with `blob:` URL revocation) so `handleSubmitMember` uploads them via `uploadMemberPhoto`.
- [x] 2.3 Add unit/component tests in `src/components/rollcall/members/member-directory.test.tsx` covering camera start, frame capture into `uploadMemberPhoto` + `createMember`, retake/cancel stream cleanup, modal-close stream cleanup, and camera permission/insecure-context error handling with file upload fallback; verify all member directory tests pass (`npx vitest run src/components/rollcall/members/member-directory.test.tsx`).

## 3. End-to-End Verification

- [x] 3.1 Run the full test suite and linter (`npm test` and `npm run lint`) and confirm all checks pass without regressions.
