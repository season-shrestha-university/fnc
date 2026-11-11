# Product Requirements Document: Community Center Check-In App

## 1. Overview & Problem Statement

- **What is it?** A mobile-first web application for volunteers to create events, configure tracking requirements, and log member attendance via QR code scanning.
- **Why build it?** To replace manual participant recordkeeping at a community hall. It provides a fast, customizable way to log arrivals, review attendance, and export specific member data to an Excel file based on the unique needs of each event.

## 2. Target Audience

- **Primary Users:** Volunteers managing events at the community center.
- **Context of Use:** Used on mobile devices at the door. Requires large touch targets, high contrast, and a streamlined layout suited for varying levels of digital literacy.

## 3. Core User Flows

- **Sign-in & Session Flow:** Workspace member opens the app -> Enters an email address and password -> System authenticates the credentials with Supabase Auth -> On success, the member can manage events and attendance. The app refreshes the Supabase session through server-side cookies and listens for auth state changes; unauthenticated or expired sessions are blocked from protected operations and prompted to sign in again.
- **Sign-out Flow:** Authenticated workspace member clicks "Sign out" -> Supabase clears the active session -> The app returns to the sign-in screen and protected operations are no longer available.
- **Event Creation & Update Flow:** Volunteer clicks "New Event" -> Enters event name, date, and selects tracked member data fields -> Saves event. Once an event exists, the primary button changes from "New Event" to "Update Event" to prevent accidental duplicate event creation.
- **Check-in Flow:** Volunteer opens the active event -> Scans member QR code -> System matches the Member ID to the database -> Displays Member Name and Picture for visual verification -> Logs the required data fields.
- **List Management & Correction Flow:** Volunteer views the list of currently checked-in members -> Uses the search bar to find a specific name -> Swipes left on a member's row to delete/undo an accidental check-in.
- **Attendance Review & Export Flow:** Volunteer clicks "View Attendance" for the active event -> System navigates to a dedicated screen displaying the full list of attended members -> Volunteer clicks a separate "Download Excel" button -> System generates and downloads the `.xlsx` file.
- **Event Deletion Flow:** After exporting the data (or if an event is cancelled), the volunteer clicks "Delete Event" -> System displays a confirmation prompt warning that all check-in data for this session will be removed -> Volunteer confirms -> Event is deleted and the dashboard resets to show the "New Event" button.

## 4. MVP Features (Must-Haves)

- **Workspace Authentication:** Email/password sign-in through Supabase Auth. Only authenticated workspace members may access event, member, and attendance management actions.
- **Session Sign-out:** Authenticated members can explicitly sign out from the desktop or mobile workspace navigation.
- **Member Directory Database:** A read-only list of members (provided by the community) containing: Unique Member ID, Name, Address, DOB, and Picture URL.
- **Single Active Event Guardrail:** UI logic that restricts creation to one active event at a time. When an event exists, the "New Event" action dynamically switches to "Update Event" (allowing volunteers to modify the event name or tracked fields without creating duplicates).
- **Event Deletion with Confirmation:** Ability for volunteers to delete the entire active event (and its associated attendance logs) via a confirmation dialog, resetting the app for the next session.
- **QR Code Scanner Module:** In-browser camera integration that reads the Member ID from the QR code.
- **Visual Verification:** Upon scanning, the app must display the member's Name and Picture so the volunteer can verify identity.
- **Attendance View Screen:** A dedicated screen accessed via a "View Attendance" action that displays the complete list of members who have checked in, allowing volunteers to review the data before downloading.
- **Active Roster Management:** A live, searchable list of attended members integrated into the Attendance View screen.
- **Swipe-to-Delete:** Touch-optimized gesture allowing volunteers to swipe left on a logged member in the active roster to remove them (e.g., if scanned by mistake).
- **Dedicated Excel Download Button:** A distinct button located on the Attendance View screen that explicitly triggers the dynamic `.xlsx` export.

## 5. Out of Scope for V1 (Strict Boundaries)

- Member registration or profile editing within the app.
- Managing multiple concurrent events simultaneously.
- Complex Role-Based Access Control (RBAC).
- Member-facing portals or apps.
- In-app analytics, charts, or dashboards.

## 6. High-Level Constraints

- **Platform:** Mobile-first web application, optimized for responsive smartphone viewports.
- **Stack Baseline:** Next.js (App Router), Tailwind CSS, shadcn/ui (Light theme default).
- **Authentication:** Supabase Auth with email/password credentials, server-side session cookies, and session validation before protected server actions.
