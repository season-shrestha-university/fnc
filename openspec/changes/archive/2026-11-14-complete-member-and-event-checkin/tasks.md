# Tasks

## 1. Database Schema, RLS Policies, and Types

- [x] 1.1 Create a Supabase migration in `supabase/migrations/` adding optional `email` and `phone` columns to `public.members`, granting `UPDATE` and `DELETE` policies/permissions to `authenticated` on `public.members`, ensuring `check_ins.member_id` cascades on delete, and provisioning the `member-photos` Storage bucket with authenticated upload/update/delete and public read policies; verify the SQL file syntax and constraints.
- [x] 1.2 Update `src/lib/supabase/database.types.ts`, `src/types/database.ts`, `src/components/rollcall/shared/types.ts`, and `src/components/rollcall/shared/member-utils.ts` to include `email`, `phone`, `address`, `dob`, `pictureUrl`, and the full canonical `trackedFieldOptions` (`Name`, `Member ID`, `Email`, `Phone`, `Address`, `Date of birth`, `Photo`); verify with `pnpm build` or `tsc --noEmit`.

## 2. Server Actions for Member CRUD, Events, and Check-In Data

- [x] 2.1 Expand `getMembers`, `createMember`, `getDashboardData`, and `checkInMember` in `src/app/actions.ts` to select and return all member fields (`id`, `memberId`, `name`, `email`, `phone`, `address`, `dob`, `pictureUrl`), and add `updateMember` (enforcing immutable `member_id`) and `deleteMember` server actions; verify TypeScript compilation and server action unit tests pass.
- [x] 2.2 Update `saveEvent` and `getDashboardData` in `src/app/actions.ts` (and `src/lib/actions/event.ts`) to accept, persist, and return `eventDate`; verify with unit tests or typecheck.

## 3. Member Directory UI (Edit, Delete, and Photo Upload)

- [x] 3.1 Update `src/components/rollcall/members/member-directory.tsx` to display member photo avatars (with initials fallback) and optional profile details, add an image file upload to Supabase Storage (`member-photos`) on the Create Member dialog, and implement Edit Member (with read-only `member_id`) and Delete Member confirmation dialogs; verify component tests pass with `pnpm test:ci`.

## 4. Event Dialogs, Dynamic Attendance View, and Excel Export

- [x] 4.1 Update `src/components/rollcall/events/event-dialogs.tsx`, `src/components/rollcall/events/events-view.tsx`, and `src/components/rollcall/check-in/check-in-view.tsx` to bind `eventDate` and expose all selectable `tracked_fields` (`Name`, `Member ID`, `Email`, `Phone`, `Address`, `Date of birth`, `Photo`); update `src/components/rollcall/events/event-dialogs.test.tsx` and verify `pnpm test:ci` passes.
- [x] 4.2 Update `src/components/rollcall/check-in/attendance-view.tsx` and `src/components/rollcall/check-in/check-in-view.tsx` so `Avatar` and `MemberRow` dynamically render the member's photo and only the fields selected in the active event's `tracked_fields` (plus check-in date); verify component tests pass with `pnpm test:ci`.
- [x] 4.3 Update `src/app/api/export/[eventId]/route.ts` and `downloadExcel` in `src/components/rollcall/check-in/check-in-view.tsx` to dynamically generate `.xlsx` columns matching the event's `tracked_fields` plus `Date`; add/update unit tests for the export route and verify `pnpm test:ci` passes.
