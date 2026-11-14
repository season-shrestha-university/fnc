# Tasks

## 1. Logged Member List Avatars

- [x] 1.1 Update `MemberRow` in `src/components/rollcall/check-in/attendance-view.tsx` to always pass `member.pictureUrl` to `Avatar` when available (falling back to `member.initials` when absent) regardless of `trackedFields`, and verify `AttendanceView` renders the member image without `"Photo"` in `trackedFields`
- [x] 1.2 Update `src/components/rollcall/check-in/attendance-view.test.tsx` so tests verify member photo avatars render regardless of `trackedFields`, initials fallback renders when `pictureUrl` is absent, and optional text fields still respect `trackedFields`; verify with `npm test -- src/components/rollcall/check-in/attendance-view.test.tsx`

## 2. Check-In Confirmation Feedback

- [x] 2.1 Extend `ToastProvider` in `src/components/rollcall/layout/toast-provider.tsx` to accept an optional member preview (`name`, `id`, `initials`, `color`, `pictureUrl`) while keeping `(message, variant)` backward-compatible, rendering the member's `Avatar` alongside their name, member ID, and confirmation status inside `data-testid="scan-toast"`
- [x] 2.2 Update `CheckInView` in `src/components/rollcall/check-in/check-in-view.tsx` to pass the checked-in member's photo, name, and member ID to `showToast` on successful check-in, and update the `Last check-in` summary to always show `latestMember.pictureUrl` (with initials fallback) and `latestMember.id`
- [x] 2.3 Add unit/component tests covering successful check-in toast rendering (with photo and with initials fallback) and `Last check-in` display, and verify with `npm test`

## 3. Integration & Validation

- [x] 3.1 Run the full test suite and typecheck/lint (`npm test`, `npm run lint`, and `npx next typegen && npm exec tsc -- --noEmit` or project build/typecheck scripts) and verify all checks pass
