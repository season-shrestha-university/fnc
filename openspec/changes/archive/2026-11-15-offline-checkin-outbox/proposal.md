# Proposal

## Why

Volunteers checking members in at event doors often operate in venues with weak, high-latency, or intermittent internet connectivity. Currently, every QR scan or manual member ID check-in blocks the scanner UI while awaiting a live round-trip to the server and three sequential database queries, causing lines to stall on slow connections and check-ins to fail outright when connectivity drops.

## What Changes

- Introduce a **client-side Outbox Pattern** and local member roster cache (supporting up to 1,000 pre-registered members) so QR scans and manual member ID check-ins resolve locally and instantaneously without blocking on network round-trips.
- Preload and persist the pre-registered member directory (`id`, `memberId`, `name`, tracked profile fields, and `pictureUrl`) locally on the check-in device (`IndexedDB` / `localStorage`), along with eager preloading of the QR decoder (`html5-qrcode`) and background caching of immutable member photo URLs.
- Add graceful `onError` initials fallback to `<Avatar>` so uncached member photos never render broken image icons when offline.
- Queue check-ins locally in a persistent outbox with a background sync worker that drains queued check-ins when online and retries automatically on reconnection.
- Make server-side outbox check-in synchronization **idempotent** so retrying a check-in that already succeeded on the server (or was scanned at another door) resolves cleanly as synced rather than failing permanently.
- Display a **subtle sync status indicator** in the check-in view (e.g., pending/offline queue count vs. synced state) and a **per-row sync badge** on checked-in member rows indicating whether each check-in is `pending` (queued in outbox) or `synced`.
- Support cancelling/removing an unsynced (`pending`) check-in directly from the local outbox when a volunteer swipes to delete it, and queuing deletes for already-synced check-ins in the outbox so swipe-to-delete also works offline and under low connectivity.

## Capabilities

### New Capabilities

<!-- None; this extends the existing event-attendance-tracking check-in and attendance list requirements. -->

### Modified Capabilities

- `event-attendance-tracking`: Update check-in logging and attendance list display requirements to support local-first check-in resolution against a cached member roster, persistent client-side outbox queueing and idempotent background synchronization, offline photo caching with initials fallback, sync status indicators and per-row sync badges, and local outbox cancellation when deleting unsynced check-ins.

## Impact

- **Server Actions & Data Fetching**: `src/app/actions.ts` and `src/app/(app)/events/[id]/check-in/page.tsx` (provide member roster data for check-in caching and support idempotent check-in synchronization that preserves client scan dates and returns existing records on retry).
- **Check-In & Scanner Components**: `src/components/rollcall/check-in/check-in-view.tsx`, `src/components/rollcall/check-in/use-qr-scanner.ts`, and `src/components/rollcall/check-in/attendance-view.tsx` (local roster lookup, outbox state integration, eager QR decoder loading, header sync indicator, per-row pending/synced badge, `<Avatar>` `onError` fallback, and local outbox removal on swipe-to-delete).
- **Client Outbox & Cache Store**: New client-side outbox and roster/photo cache module under `src/components/rollcall/check-in/` (persisting roster and outbox entries per event, background sync loop, `online` event listener, and photo `CacheStorage` warming).
- **Tests**: Unit and integration tests in `src/app/actions.test.ts`, `src/components/rollcall/check-in/check-in-view.test.tsx`, and `src/components/rollcall/check-in/attendance-view.test.tsx`.
