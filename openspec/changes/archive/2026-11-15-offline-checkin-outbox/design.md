# Design

## Context

See `proposal.md` for motivation. Today, `CheckInView` (`src/components/rollcall/check-in/check-in-view.tsx`) handles QR scans and manual member ID entries by locking the scanner (`checkInPendingRef.current = true`, `isCheckInPending = true`) and awaiting the `checkInMember(eventId, memberId)` Server Action (`src/app/actions.ts`). That action performs three sequential Supabase queries (`SELECT` member by `member_id`, `SELECT` existing `check_ins` row, `INSERT` into `check_ins`) before returning the member's profile to render the toast and attendance row. Additionally, `useQrScanner` (`src/components/rollcall/check-in/use-qr-scanner.ts`) dynamically imports `html5-qrcode` only when the volunteer clicks `"Start camera"`, and `<Avatar>` (`src/components/rollcall/check-in/attendance-view.tsx`) renders `<img src={pictureUrl} />` without an `onError` fallback.

All members are pre-registered prior to check-in, and the organization's maximum directory size is 1,000 members (~200 KB of JSON text data, plus 25–45 KB compressed WebP photos stored at immutable `<uuid>.webp` URLs).

## Goals / Non-Goals

**Goals:**
- Decouple QR scanning and manual ID check-in from network latency using a persistent client-side outbox and locally cached member roster.
- Guarantee instant (<10ms) check-in validation, duplicate prevention, audio beep, and toast/row rendering whether online, on high-latency cellular, or completely offline.
- Ensure member photos display offline whenever previously cached, and fall back cleanly to initials when a photo has not finished caching before connectivity drops.
- Provide clear, non-intrusive visibility into sync progress via a header sync status indicator and per-row pending/synced badges.
- Ensure background synchronization is idempotent and resilient to dropped responses or multi-device door scanning.

**Non-Goals:**
- Offline registration of brand-new members during check-in (all members are pre-registered beforehand).
- Full PWA / offline navigation for creating events or managing the member directory while offline (scope is focused on active check-in resilience once the check-in page is loaded).

## Decisions

### 1. Local Member Roster Cache (`IndexedDB` / `localStorage`)
- **Decision:** Pass the pre-registered member directory (`DirectoryMember[]`) alongside `DashboardData` (or prefetch on `CheckInView` mount) and persist it locally on the client (`localStorage` / `IndexedDB` keyed by workspace/roster).
- **Rationale:** At max 1,000 members, the entire roster JSON is ~200 KB. Having the full roster in memory on the check-in page allows `handleScan` to synchronously resolve `member_id` -> `{ uuid, name, email, phone, address, dob, pictureUrl }`, reject unknown IDs, and detect duplicates without waiting on a server round-trip.
- **Alternatives considered:**
  - *Blind outbox (queue raw `member_id` only):* Rejected because volunteers need to see the member's name and photo immediately upon scanning.
  - *Encoding full profile + photo in the QR code:* Rejected because photos cannot fit in QR codes and existing member QR codes only encode `member_id`.

### 2. Persistent Client-Side Outbox & Background Sync Worker
- **Decision:** Store pending check-in operations in persistent browser storage (`localStorage` / `IndexedDB`) under a structured queue:
  ```ts
  type OutboxCheckInItem = {
    clientCheckInId: string; // e.g. `local-${crypto.randomUUID()}`
    eventId: string;
    memberUuid: string;      // members.id
    memberId: string;        // members.member_id
    createdDate: string;     // YYYY-MM-DD captured at scan time
    createdAt: string;       // ISO timestamp captured at scan time
    memberSnapshot: Member;  // cached profile so UI rehydrates across reloads
    status: "pending" | "syncing";
    retryCount: number;
  };
  ```
- **Sync Triggers:**
  1. Immediately after enqueuing a new scan (non-blocking background flush).
  2. When `window` fires the `online` event or `document` becomes visible (`visibilitychange`).
  3. Exponential backoff timer (`2s -> 4s -> 8s -> 15s` cap) while items remain in the outbox and `navigator.onLine !== false`.
- **Reconciliation with Server State:** `CheckInView` merges server-fetched `checkIns` with any remaining outbox entries for the active `eventId` (deduplicating by `member.id` / `memberId`) so pending check-ins survive page refreshes and Server Action revalidations without flickering.

### 3. Idempotent Server Synchronization
- **Decision:** Update `checkInMember` (or add a dedicated `syncCheckInMember` / batch sync action in `src/app/actions.ts`) to support an idempotent mode: when syncing an outbox item, if a `check_ins` row already exists for `(event_id, member_id)`, return the existing row's `id` and `created_at` instead of throwing `"<name> is already checked in"`.
- **Rationale:** Duplicate prevention at scan time is enforced locally against the combined `synced + pending` check-ins list. If a background sync request reaches the server and inserts the row, but the HTTP response drops on a flaky connection, the subsequent retry must succeed idempotently so the outbox item is removed from the queue and marked `synced`.

### 4. Offline Photo Caching & `<Avatar>` Fallback
- **Decision:**
  1. Update `<Avatar>` in `src/components/rollcall/check-in/attendance-view.tsx` to track failed image loads (`failedUrl` state via `onError`) and fall back to rendering the member's colored initials avatar whenever the image cannot be loaded.
  2. Pre-warm member photos in the background from `CheckInView` using low-concurrency image/cache requests (`CacheStorage` or browser HTTP cache) while online. Because `uploadMemberPhoto` generates immutable `<uuid>.webp` URLs, already-cached URLs are skipped on subsequent loads.
  3. Eagerly call `loadDecoder()` on `useQrScanner` mount so the `html5-qrcode` ZXing bundle is in memory before the volunteer walks to a dead zone and taps `"Start camera"`.

### 5. Swipe-to-Delete Behavior for Pending vs. Synced Check-Ins
- **Decision:**
  - If the deleted check-in is still in the local outbox (`pending` and not yet persisted on the server), remove it directly from the local outbox and UI state without making a server call (and ignore any in-flight sync for that `clientCheckInId`).
  - If the check-in is already synced (`checkInId` is a server UUID), remove it from the visible UI immediately and enqueue a `delete` operation (`{ kind: "delete", clientOutboxId, eventId, checkInId }`) in the same FIFO outbox so deletes also succeed offline and replay in exact chronological order before any subsequent re-check-in.
  - `mergeCheckInsWithOutbox` filters out any server `checkIns` whose `checkInId` has a pending `delete` operation in the outbox so revalidations never resurrect a locally deleted member before sync completes.

### 6. Subtle Sync Status Indicator & Per-Row Badge
- **Decision:**
  - **Header / Check-In Status Pill:** Render a compact status pill on the check-in view when outbox items exist or the browser is offline (e.g., `"Offline · 3 waiting to sync"`, `"Syncing 3 check-ins..."`, and a brief `"All check-ins synced"` confirmation when the queue finishes draining).
  - **Per-Row Badge:** In both `"Recent check-ins"` (`CheckInView`) and `MemberRow` (`AttendanceView` / `"Checked in today"`), replace or augment the static green `<Check />` badge with a pending indicator (e.g., clock/cloud icon with `aria-label="Waiting to sync"`) when `member.syncStatus === "pending"`, transitioning to the green `<Check />` badge once synced.

## Risks / Trade-offs

- **[Risk] Volunteer closes browser tab before outbox finishes syncing on a dead connection** -> **Mitigation:** Persist outbox entries in `localStorage` / `IndexedDB` so they survive reloads and reopenings, and attach a `beforeunload` warning when `pendingCount > 0` to alert the volunteer before closing the tab.
- **[Risk] Large initial burst if warming 1,000 photos at once** -> **Mitigation:** Warm photos in small background concurrency batches (e.g., 3–4 concurrent requests at idle priority) only after the roster and QR decoder have loaded, and rely on `<Avatar>` `onError` initials fallback if a scan happens before a photo is cached.
- **[Risk] Two volunteers on separate devices scan the same member while one device is offline** -> **Mitigation:** Idempotent server sync ensures the offline device's outbox drains cleanly without getting stuck when it reconnects, reconciling both devices to the single server check-in record.
