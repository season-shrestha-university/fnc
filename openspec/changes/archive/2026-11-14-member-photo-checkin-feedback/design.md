# Design

## Context

See `proposal.md` for motivation. Currently:
- `src/app/actions.ts` already returns `pictureUrl` on both `DashboardData["checkIns"]` and `checkInMember()`.
- `MemberRow` (`src/components/rollcall/check-in/attendance-view.tsx`) and the `Last check-in` summary in `CheckInView` (`src/components/rollcall/check-in/check-in-view.tsx`) only pass `member.pictureUrl` to `Avatar` when `trackedFields.includes("Photo")` is true. Because `defaultTrackedFields` is `["Name", "Member ID"]`, most events hide member photos in logged-member lists.
- `CheckInView.handleScan` notifies volunteers of a successful check-in via `showToast(\`${member.name} (${member.id}) checked in\`, "success")`, which renders a text-only toast in `ToastProvider` (`src/components/rollcall/layout/toast-provider.tsx`).

## Goals / Non-Goals

**Goals:**
- Always render `member.pictureUrl` in `Avatar` for logged members (`Checked in today`, `AttendanceView`, and `Last check-in`) whenever a photo URL exists, with initials as the fallback.
- Display the checked-in member's photo (or initials fallback), name, and member ID in the non-blocking confirmation toast on successful check-in, and include the member ID alongside photo and name in `Last check-in`.
- Preserve `trackedFields` behavior for optional text details (email, phone, address, DOB) and Excel export columns.

**Non-Goals:**
- Changing database schemas, Supabase storage, or server action payloads (`pictureUrl` is already returned).
- Introducing a blocking modal dialog on check-in that would interrupt continuous QR scanning at the door.
- Changing how `Photo` is exported in the `.xlsx` spreadsheet.

## Decisions

1. **Always pass `member.pictureUrl` to `Avatar` in logged-member lists**
   - *Choice*: Remove the `trackedFields.includes("Photo")` condition when passing `pictureUrl` to `<Avatar>` in `MemberRow` and `Last check-in`.
   - *Rationale*: `Avatar` already handles missing/empty `pictureUrl` by rendering `initials` with `color`. Showing photos in avatars improves volunteer recognition without cluttering the row layout, while `trackedFields` continues to govern optional text metadata and Excel export columns.
   - *Alternative considered*: Adding `"Photo"` to `defaultTrackedFields`. Rejected because it would also alter default Excel export columns for new events and still hide photos on existing events without `"Photo"` checked.

2. **Extend `ToastProvider` for optional member preview instead of adding a modal**
   - *Choice*: Extend `showToast` with an optional options/member parameter (e.g., `member?: { name: string; id: string; initials: string; color?: string; pictureUrl?: string }`) while keeping the existing `(message, variant)` signature backward-compatible. When `member` is provided, the toast renders `<Avatar>` alongside the member's name, member ID, and check-in confirmation badge.
   - *Rationale*: Door volunteers scan multiple attendees in succession; a non-blocking auto-dismissing toast (`data-testid="scan-toast"`) preserves scan throughput while giving immediate visual confirmation of who checked in.
   - *Alternative considered*: Showing an overlay card or dialog inside `CheckInView`. Rejected because it duplicates notification state and risks obscuring the camera preview or requiring manual dismissal.

3. **Include member ID in `Last check-in` summary**
   - *Choice*: Render `latestMember.id` under `latestMember.name` in the `Last check-in` block inside `CheckInView` alongside the unconditional `Avatar`.
   - *Rationale*: Keeps the most recently checked-in member's photo, name, and member ID visible on screen even after the toast auto-dismisses.

## Risks / Trade-offs

- [Broken or slow external `pictureUrl` in `<img>`] → `Avatar` continues to use `object-cover` in a fixed-size circle; if `pictureUrl` is empty/undefined, `Avatar` renders initials immediately.
- [Existing test expects photo to be hidden when `Photo` is not in `trackedFields`] → Update `src/components/rollcall/check-in/attendance-view.test.tsx` to reflect the new requirement that member photo avatars are shown regardless of `trackedFields`, and add tests for initials fallback and check-in toast rendering.
