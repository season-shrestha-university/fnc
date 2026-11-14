# Proposal

## Why

While RollCall already supports pre-provisioned volunteer authentication, basic event CRUD, member creation with QR generation, and QR scan check-ins, volunteers cannot edit or delete members, upload member photos, record optional member contact details (email, phone), or see an event's selected `tracked_fields` reflected in the attendance list and Excel export. Completing these capabilities delivers the full end-to-end event check-in workflow required by volunteers at the door.

## What Changes

- **Member CRUD & Extended Profile**:
  - Add optional `email` and `phone` fields to `public.members`.
  - Support editing and deleting members from `/members`, keeping `member_id` immutable after creation so printed/downloaded QR codes never break.
  - Cascade-delete a member's check-in records when a member is deleted (after volunteer confirmation).
  - Replace the plain text `picture_url` input with an image file upload stored in a Supabase Storage bucket (`member-photos`), and display member photos in avatars across the member directory and attendance views.
- **Event Configuration & Dynamic Tracked Fields**:
  - Wire up the event date input (`event_date`) in the event create/edit dialog and active event header instead of using hardcoded dates.
  - Expand selectable `tracked_fields` on events to include `Name` (required), `Member ID` (required), `Email`, `Phone`, `Address`, `Date of birth`, and `Photo`.
- **Dynamic Attendance List & Excel Export**:
  - Update `getDashboardData` and `checkInMember` to fetch and return full member profile fields.
  - Dynamically render only the event's selected `tracked_fields` (including member photo avatars when tracked/available) plus check-in date in the on-screen logged members list (`CheckInView` and `AttendanceView`).
  - Update the Excel export endpoint (`/api/export/[eventId]`) and client download payload to dynamically output columns matching the event's selected `tracked_fields` plus check-in date.

## Capabilities

### New Capabilities
- `member-directory`: Creating, viewing, editing, and deleting members with immutable unique `member_id` QR codes, optional contact details (`email`, `phone`, `address`, `dob`), and photo file uploads.
- `event-attendance-tracking`: Creating, editing, and deleting events with configurable `tracked_fields`, logging member check-ins via QR scan, dynamically displaying selected member fields in the attendance list, and exporting dynamic Excel sheets.

### Modified Capabilities

## Impact

- **Database & Storage (`supabase/migrations/`)**: New migration adding `email` and `phone` columns to `public.members`, granting `UPDATE` and `DELETE` RLS policies to `authenticated` users, ensuring `check_ins.member_id` cascades on delete, and provisioning the `member-photos` storage bucket with RLS policies.
- **Server Actions & Types (`src/app/actions.ts`, `src/lib/supabase/database.types.ts`, `src/types/database.ts`, `src/components/rollcall/shared/types.ts`)**: Expanded member/event types, `updateMember` and `deleteMember` server actions, and full member field queries in `getMembers`, `getDashboardData`, and `checkInMember`.
- **UI & Export Route (`src/components/rollcall/members/member-directory.tsx`, `src/components/rollcall/events/event-dialogs.tsx`, `src/components/rollcall/check-in/check-in-view.tsx`, `src/components/rollcall/check-in/attendance-view.tsx`, `src/app/api/export/[eventId]/route.ts`)**: Member edit/delete dialogs, photo upload, dynamic tracked field checkboxes, dynamic attendance row rendering, and dynamic `.xlsx` column generation.
