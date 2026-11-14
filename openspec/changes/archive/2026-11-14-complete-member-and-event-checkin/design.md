# Design

## Context

RollCall is a Next.js 16 + Supabase check-in application. Currently:
- Volunteer authentication uses pre-provisioned Supabase credentials (`signInWithPassword`).
- `public.members` stores `id`, `member_id`, `name`, `address`, `dob`, and `picture_url`, with RLS policies allowing only `SELECT` and `INSERT` for `authenticated` users.
- `public.events` stores `id`, `name`, `event_date`, and `tracked_fields` (JSON array), but `EventDialogs` uses a hardcoded date input and `getDashboardData` / `AttendanceView` / `/api/export/[eventId]` ignore `tracked_fields` and only fetch/display/export `name`, `member_id`, and check-in `date`.

See `proposal.md` for motivation and `specs/` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Support full Member CRUD (adding Edit and Delete) with immutable `member_id`, optional `email` and `phone`, and image file upload for member photos.
- Connect event `tracked_fields` end-to-end from event creation/editing through `getDashboardData`, `CheckInView`/`AttendanceView`, and `/api/export/[eventId]`.
- Wire `event_date` properly in event dialogs and active event headers.

**Non-Goals:**
- Volunteer self-registration or volunteer management UI (volunteers are pre-provisioned in Supabase Auth).
- Changing a member's `member_id` after creation.

## Decisions

### 1. Canonical `tracked_fields` representation
- **Decision**: Normalize `tracked_fields` labels/keys across UI and server actions using a shared definition in `src/components/rollcall/shared/member-utils.ts`:
  - `"Name"` (required)
  - `"Member ID"` (required)
  - `"Email"`
  - `"Phone"`
  - `"Address"`
  - `"Date of birth"`
  - `"Photo"`
- **Rationale**: `EventDialogs` and existing tests already store human-readable labels (`"Name"`, `"Member ID"`, `"Address"`, `"Date of birth"`) in `events.tracked_fields`. Extending this canonical list with `"Email"`, `"Phone"`, and `"Photo"` maintains backward compatibility with existing events and tests while mapping cleanly to member properties and Excel column headers.
- **Alternatives considered**: Switching `events.tracked_fields` to snake_case database column names (`member_id`, `dob`, etc.) would break existing event records and UI tests in `event-dialogs.test.tsx`.

### 2. Member Photo Upload via Supabase Storage
- **Decision**: Provision a public-read, authenticated-write Supabase Storage bucket `member-photos` via migration. When a volunteer selects an image file in the Create or Edit Member dialog, upload it to `member-photos/<member-uuid>-<timestamp>.<ext>` using the browser or server Supabase client and store its public URL in `members.picture_url`.
- **Rationale**: Keeps the `members.picture_url` column as a standard URL string while removing the burden of hosting external images from volunteers. Next.js `<img>` / `Avatar` can render the URL directly and Excel exports can include the URL when `Photo` is tracked.
- **Alternatives considered**: Storing base64 data URLs directly in `members.picture_url` bloats Postgres rows and slows down directory/attendance queries.

### 3. Member Update & Delete RLS and Cascade Behavior
- **Decision**: Add `UPDATE` and `DELETE` RLS policies and table grants on `public.members` for the `authenticated` role. Ensure `public.check_ins.member_id` references `public.members(id) ON DELETE CASCADE` so deleting a member automatically removes their check-ins without orphan rows or foreign-key errors. Enforce `member_id` immutability in `updateMember` by only updating `name`, `email`, `phone`, `address`, `dob`, and `picture_url` filtered by `id`.
- **Rationale**: Defense-in-depth between server actions and database constraints ensures clean deletion and preserves QR code integrity.

### 4. Dynamic Attendance Rendering and Excel Export
- **Decision**:
  - Expand `getDashboardData` and `checkInMember` in `src/app/actions.ts` to select `id, member_id, name, email, phone, address, dob, picture_url` from `public.members`.
  - Pass `trackedFields` into `CheckInView`, `AttendanceView`, and `MemberRow`. `Avatar` renders `pictureUrl` when present (if `"Photo"` is tracked in attendance view, or always in member directory), falling back to initials. `MemberRow` renders metadata badges/lines for each field included in `trackedFields`.
  - Update `/api/export/[eventId]/route.ts` to accept `trackedFields` alongside `eventName` and `members` (or construct each row's keys ordered by `trackedFields` + `"Date"`), generating worksheet columns dynamically via `xlsx.utils.json_to_sheet`.

## Risks / Trade-offs

- **[Risk] Large image uploads slow down member creation on mobile networks** -> Mitigation: Restrict file input to `image/*` with a reasonable size limit (e.g., 5 MB) and show upload progress/loading state on the submit button.
- **[Risk] Existing events in database have `tracked_fields` without new options** -> Mitigation: Always ensure `"Name"` and `"Member ID"` are treated as present, and only display/export optional fields when explicitly included in `tracked_fields`.

## Migration Plan

1. Apply new SQL migration in `supabase/migrations/` to:
   - Add `email text default ''` and `phone text default ''` to `public.members`.
   - Grant `update, delete` on `public.members` to `authenticated` and add corresponding RLS policies.
   - Ensure `check_ins_member_id_fkey` uses `ON DELETE CASCADE`.
   - Create storage bucket `member-photos` and storage RLS policies for `authenticated` uploads/updates/deletes and public/authenticated reads.
2. Deploy updated Server Actions, UI components, and export route.
