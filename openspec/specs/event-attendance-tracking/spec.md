# event-attendance-tracking Specification

## Purpose

Manages event lifecycle, configurable member data tracking per event, QR-based check-in logging, dynamic attendance list display, and Excel sheet export of logged members.

## Requirements

### Requirement: Create, edit, and delete events with tracked fields
The system SHALL allow authenticated volunteers to create, edit, and delete events with a `name`, `event_date`, and a selectable list of `tracked_fields` (`Name`, `Member ID`, `Email`, `Phone`, `Address`, `Date of birth`, `Photo`), where `Name` and `Member ID` are always required.

#### Scenario: Create event with custom tracked fields
- **WHEN** a volunteer creates an event with a name, date, and selected tracked fields (`Name`, `Member ID`, `Address`, `Phone`)
- **THEN** the system persists the event with its selected `event_date` and `tracked_fields`

#### Scenario: Delete event and its check-ins
- **WHEN** a volunteer confirms deletion of an event
- **THEN** the system permanently removes the event and all check-in records for that event

### Requirement: Log member check-in via QR scan or manual ID
The system SHALL allow authenticated volunteers to scan a member's QR code or enter a `member_id` manually to log the member into a specific event against the locally cached member roster without blocking on network round-trips, preventing duplicate check-ins for the same event, and on successful check-in SHALL display confirmation feedback showing the member's photo (or initials fallback), `name`, and `member_id`.

#### Scenario: Valid member QR scan
- **WHEN** a volunteer scans a valid `member_id` QR code for an active event where the member is not yet checked in
- **THEN** the system records the check-in, adds the member with their profile fields to the event's logged members list, and displays non-blocking confirmation feedback with the member's photo (or initials fallback if no photo is set), `name`, and `member_id`

#### Scenario: Check in member while offline using cached roster
- **WHEN** the check-in device is offline and a volunteer scans a valid pre-registered `member_id` QR code or enters the `member_id` manually for an active event where the member is not yet checked in
- **THEN** the system resolves the member from the locally cached roster without waiting for a network request, queues the check-in in the local outbox, adds the member to the event's logged members list as pending sync, and immediately displays confirmation feedback with the member's photo (or initials fallback), `name`, and `member_id`

#### Scenario: Successful check-in for member without a photo
- **WHEN** a volunteer checks in a member who has no stored profile photo
- **THEN** the system displays the check-in confirmation feedback with the member's initials avatar, `name`, and `member_id`

#### Scenario: Duplicate check-in prevented
- **WHEN** a volunteer scans a `member_id` that is already checked in for the same event (either already synced or pending in the local outbox)
- **THEN** the system rejects the duplicate check-in and notifies the volunteer that the member is already checked in

### Requirement: Dynamically display tracked fields in logged members list
The system SHALL display each checked-in member in the event's attendance list with their photo in the avatar whenever available (falling back to initials when no photo is set or when an uncached photo fails to load offline), along with a per-row sync status badge, the check-in date, and only the optional member detail fields configured in the event's `tracked_fields`.

#### Scenario: Render member photo avatar regardless of tracked fields
- **WHEN** a checked-in member has a stored photo and the event's `tracked_fields` does not include `Photo`
- **THEN** the logged members list and last check-in summary still render the member's photo in their avatar

#### Scenario: Render initials fallback when member has no photo
- **WHEN** a checked-in member has no stored photo
- **THEN** the logged members list and last check-in summary render the member's initials in their avatar

#### Scenario: Render initials fallback when member photo fails to load offline
- **WHEN** a checked-in member has a stored `picture_url` that is not yet cached locally and fails to load while offline
- **THEN** the avatar falls back to rendering the member's initials instead of a broken image

#### Scenario: Render selected tracked fields on attendance list
- **WHEN** an event has `tracked_fields` set to `Name`, `Member ID`, `Address`, and `Phone`
- **THEN** the attendance list displays each checked-in member's name, member ID, address, phone number, and check-in date, and omits unselected detail fields such as date of birth or email

#### Scenario: Render per-row sync status badge
- **WHEN** a checked-in member is displayed in recent check-ins or the attendance list
- **THEN** the row displays a pending badge while the check-in is queued in the outbox and a synced check badge once persisted on the server

### Requirement: Synchronize queued check-ins via persistent outbox
The system SHALL persist locally logged check-ins in a client-side outbox, display an aggregate sync status indicator on the check-in view, synchronize queued check-ins to the server in the background when online using idempotent semantics, and allow volunteers to remove unsynced check-ins directly from the local outbox.

#### Scenario: Queue check-in while offline and sync on reconnect
- **WHEN** one or more check-ins are logged while the connection is unavailable or slow and connectivity is subsequently restored
- **THEN** the system displays the pending outbox status indicator while queued, automatically drains the queued check-ins to the server in the background when online, and updates both the aggregate indicator and each row's badge to synced

#### Scenario: Idempotent synchronization when check-in already exists on server
- **WHEN** the outbox background worker retries or submits a check-in for an `(event_id, member_id)` pair that already exists on the server
- **THEN** the server returns the existing check-in record without error and the client transitions the outbox item to synced

#### Scenario: Cancel unsynced check-in from local outbox
- **WHEN** a volunteer deletes a check-in that is still pending in the local outbox and has not yet been synchronized to the server
- **THEN** the system removes the pending check-in from the local outbox and attendance list immediately without requiring a server delete request

#### Scenario: Queue delete for synced check-in while offline
- **WHEN** a volunteer deletes a check-in that has already been synchronized to the server while connectivity is unavailable or slow
- **THEN** the system removes the member from the visible attendance list immediately, queues a delete operation in the local outbox, and executes the server delete in FIFO order when connectivity is restored

### Requirement: Export logged members to Excel matching tracked fields
The system SHALL allow authenticated volunteers to download an `.xlsx` Excel spreadsheet for an event containing all checked-in members and columns corresponding only to the event's selected `tracked_fields` plus the check-in `Date`.

#### Scenario: Download Excel spreadsheet for event
- **WHEN** a volunteer clicks "Download Excel" for an event configured to track `Name`, `Member ID`, `Email`, and `Address`
- **THEN** the system generates and downloads an `.xlsx` file whose columns are `Name`, `Member ID`, `Email`, `Address`, and `Date` for every logged member of that event
