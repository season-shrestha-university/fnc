# Spec Delta

## Purpose

Manages event lifecycle, configurable member data tracking per event, QR-based check-in logging, dynamic attendance list display, and Excel sheet export of logged members.

## ADDED Requirements

### Requirement: Create, edit, and delete events with tracked fields
The system SHALL allow authenticated volunteers to create, edit, and delete events with a `name`, `event_date`, and a selectable list of `tracked_fields` (`Name`, `Member ID`, `Email`, `Phone`, `Address`, `Date of birth`, `Photo`), where `Name` and `Member ID` are always required.

#### Scenario: Create event with custom tracked fields
- **WHEN** a volunteer creates an event with a name, date, and selected tracked fields (`Name`, `Member ID`, `Address`, `Phone`)
- **THEN** the system persists the event with its selected `event_date` and `tracked_fields`

#### Scenario: Delete event and its check-ins
- **WHEN** a volunteer confirms deletion of an event
- **THEN** the system permanently removes the event and all check-in records for that event

### Requirement: Log member check-in via QR scan or manual ID
The system SHALL allow authenticated volunteers to scan a member's QR code or enter a `member_id` manually to log the member into a specific event, preventing duplicate check-ins for the same event.

#### Scenario: Valid member QR scan
- **WHEN** a volunteer scans a valid `member_id` QR code for an active event where the member is not yet checked in
- **THEN** the system records the check-in and adds the member with their profile fields to the event's logged members list

#### Scenario: Duplicate check-in prevented
- **WHEN** a volunteer scans a `member_id` that is already checked in for the same event
- **THEN** the system rejects the duplicate check-in and notifies the volunteer that the member is already checked in

### Requirement: Dynamically display tracked fields in logged members list
The system SHALL display each checked-in member in the event's attendance list showing only the member fields configured in the event's `tracked_fields` (including the member photo in the avatar when available) along with the check-in date.

#### Scenario: Render selected tracked fields on attendance list
- **WHEN** an event has `tracked_fields` set to `Name`, `Member ID`, `Address`, and `Phone`
- **THEN** the attendance list displays each checked-in member's name, member ID, address, phone number, and check-in date, and omits unselected fields such as date of birth or email

### Requirement: Export logged members to Excel matching tracked fields
The system SHALL allow authenticated volunteers to download an `.xlsx` Excel spreadsheet for an event containing all checked-in members and columns corresponding only to the event's selected `tracked_fields` plus the check-in `Date`.

#### Scenario: Download Excel spreadsheet for event
- **WHEN** a volunteer clicks "Download Excel" for an event configured to track `Name`, `Member ID`, `Email`, and `Address`
- **THEN** the system generates and downloads an `.xlsx` file whose columns are `Name`, `Member ID`, `Email`, `Address`, and `Date` for every logged member of that event
