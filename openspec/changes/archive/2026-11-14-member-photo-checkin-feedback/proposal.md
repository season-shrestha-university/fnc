# Proposal

## Why

Members now have profile photos stored on their records, but the check-in workflow still hides member images in logged-member avatars unless the optional `Photo` tracked field is enabled on the event, and successful check-in feedback only shows a plain text toast without the member's photo. Showing member photos in logged-member avatars and displaying the member's photo, name, and member ID upon successful check-in lets door volunteers visually verify the right person is checking in at a glance.

## What Changes

- Always display the member's photo (`pictureUrl`) in avatars across logged-member lists (`Checked in today`, `AttendanceView`, and `Last check-in`) whenever a photo is available, falling back to initials when no photo is set, independent of the event's `Photo` tracked-field toggle for text/export columns.
- Enhance successful check-in confirmation feedback so that scanning a QR code or entering a member ID displays the checked-in member's photo (or initials fallback), name, and member ID in a non-blocking confirmation toast and updates the `Last check-in` card with the same details.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `event-attendance-tracking`: Update logged-member list avatar behavior to always show member photos when available, and require successful check-in feedback to display the member's image (with initials fallback), name, and member ID.

## Impact

- `src/components/rollcall/check-in/attendance-view.tsx`: Update `MemberRow` avatar rendering to use `member.pictureUrl` whenever present rather than gating on `trackedFields.includes("Photo")`.
- `src/components/rollcall/check-in/check-in-view.tsx`: Update `Last check-in` avatar/ID display and pass member photo, name, and member ID to the check-in confirmation toast.
- `src/components/rollcall/layout/toast-provider.tsx`: Extend the toast API/UI to support rendering a member avatar alongside the message for rich check-in confirmation without blocking continuous scanning.
- `src/components/rollcall/check-in/attendance-view.test.tsx`: Update and add tests covering unconditional avatar photo rendering and check-in confirmation feedback.
