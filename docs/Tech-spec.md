# Technical Specification: Community Center Check-In App

## 1. System Architecture & Tech Stack

- **Framework:** Next.js (App Router) with React 19 and TypeScript.
- **Database & Backend:** Supabase (PostgreSQL) leveraging Next.js Server Actions for mutations.
- **State Management:** TanStack Query v5 for client-side data fetching, caching, and mutation states (ideal for live roster updates and search filtering).
- **Styling & UI:** Tailwind CSS combined with shadcn/ui. Light theme is the default.

## 2. Core Dependencies

- **QR Scanner:** `html5-qrcode` (reliable for browser-based mobile camera streams).
- **Excel Export:** `xlsx` (handled server-side via API route to keep the client bundle small).
- **Mobile Gestures:** `framer-motion` or `react-swipeable` (for fluid swipe-to-delete animations on the active roster).
- **Icons:** `lucide-react`.

## 3. Database Schema (Supabase / PostgreSQL)

**Table: `members`** _(Read-only via app; seeded by community admin)_

- `id` (uuid, primary key)
- `member_id` (string, unique) - _The exact string payload inside the member's QR code._
- `name` (string)
- `address` (string)
- `dob` (date)
- `picture_url` (string)

**Table: `events`**

- `id` (uuid, primary key)
- `name` (string)
- `event_date` (date)
- `tracked_fields` (jsonb) - _e.g., `["name", "dob", "address"]`_
- `created_at` (date)

**Table: `check_ins`**

- `id` (uuid, primary key)
- `event_id` (uuid, foreign key -> `events.id`, **ON DELETE CASCADE**) - _Deleting the event automatically deletes all associated check-ins._
- `member_id` (uuid, foreign key -> `members.id`, **ON DELETE CASCADE**)
- `created_at` (date) - _The calendar date of the scan._

## 4. Routing & Folder Structure

```text
src/
├── app/
│   ├── page.tsx                     # Dashboard: Shows active event + "Update/Delete Event" (or "New Event" if none exists)
│   ├── events/
│   │   ├── new/page.tsx             # UI: Create event (redirects to /edit if an event already exists)
│   │   ├── [id]/
│   │   │   ├── edit/page.tsx        # UI: Update existing event details, tracked fields, or delete event
│   │   │   ├── scan/page.tsx        # UI: Mobile QR scanner interface
│   │   │   └── attendance/page.tsx  # UI: Searchable roster, swipe-to-delete & Excel download
│   ├── api/
│   │   └── export/[eventId]/route.ts # Serverless endpoint: Generates Excel file
├── components/
│   ├── ui/                          # Reusable shadcn/ui components (Button, Checkbox, AlertDialog, Input)
│   ├── events/                      # Shared EventForm & DeleteEventDialog components
│   ├── scanner/                     # QR camera logic
│   └── attendance/                  # Swipeable list items, search bar
├── lib/
│   ├── supabase/                    # Supabase client initialization
│   └── actions/                     # Next.js Server Actions (upsertEvent, deleteEvent, logCheckIn, removeCheckIn)
```
