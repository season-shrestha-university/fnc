# Tasks

## 1. Server Actions & Roster Data for Offline Check-In

- [x] 1.1 Update `getDashboardData` and `checkInMember` in `src/app/actions.ts` (and `src/app/(app)/events/[id]/check-in/page.tsx`) to include the pre-registered member directory (`roster`) in dashboard check-in data and support idempotent check-in synchronization (returning the existing `check_ins` row when `(event_id, member_id)` already exists on the server), and verify with unit tests in `src/app/actions.test.ts` via `pnpm test:ci src/app/actions.test.ts`.

## 2. Client Outbox Store, Roster Cache & Offline Photo/Scanner Readiness

- [x] 2.1 Create the persistent client-side outbox and roster cache module (`src/components/rollcall/check-in/check-in-outbox.ts`) supporting roster persistence, per-event outbox enqueue/remove/reconcile, background sync with retry/backoff and `online` listener, and background member photo cache warming, and verify with unit tests in `src/components/rollcall/check-in/check-in-outbox.test.ts` via `pnpm test:ci src/components/rollcall/check-in/check-in-outbox.test.ts`.
- [x] 2.2 Update `useQrScanner` in `src/components/rollcall/check-in/use-qr-scanner.ts` to eagerly preload the `html5-qrcode` decoder on hook mount and update `<Avatar>` in `src/components/rollcall/check-in/attendance-view.tsx` to fall back to the member's initials on image `onError`, verifying fallback rendering with unit tests in `src/components/rollcall/check-in/attendance-view.test.tsx`.

## 3. Check-In UI Integration, Sync Status Indicator & Per-Row Badges

- [x] 3.1 Update `src/components/rollcall/shared/types.ts`, `src/components/rollcall/check-in/attendance-view.tsx`, and `src/components/rollcall/check-in/check-in-view.tsx` to resolve scans locally against the cached roster, enqueue check-ins in the outbox without blocking the scanner, render the subtle sync status indicator and per-row pending/synced badges, and cancel pending outbox entries directly on swipe-to-delete, verifying all scenarios with tests in `src/components/rollcall/check-in/check-in-view.test.tsx` and `src/components/rollcall/check-in/attendance-view.test.tsx`.
- [x] 3.2 Run the full test suite and linter (`pnpm test:ci` and `pnpm lint`) and `openspec validate offline-checkin-outbox --strict` to verify all unit/integration tests and spec validations pass.

## 4. Offline Delete Outbox Support

- [x] 4.1 Extend `src/components/rollcall/check-in/check-in-outbox.ts` and `src/components/rollcall/check-in/check-in-view.tsx` to enqueue `delete` operations for already-synced check-ins in the FIFO outbox, filter pending deletes during `mergeCheckInsWithOutbox`, and drain both check-ins and deletes in order, verifying with tests in `src/components/rollcall/check-in/check-in-outbox.test.ts`, `src/components/rollcall/check-in/check-in-view.test.tsx`, `pnpm test:ci`, `pnpm lint`, and `openspec validate offline-checkin-outbox --strict`.
