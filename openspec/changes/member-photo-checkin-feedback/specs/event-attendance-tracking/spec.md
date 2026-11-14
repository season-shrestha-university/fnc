# Spec Delta

## MODIFIED Requirements

### Requirement: Log member check-in via QR scan or manual ID
The system SHALL allow authenticated volunteers to scan a member's QR code or enter a `member_id` manually to log the member into a specific event, preventing duplicate check-ins for the same event, and on successful check-in SHALL display confirmation feedback showing the member's photo (or initials fallback), `name`, and `member_id`.

#### Scenario: Valid member QR scan
- **WHEN** a volunteer scans a valid `member_id` QR code for an active event where the member is not yet checked in
- **THEN** the system records the check-in, adds the member with their profile fields to the event's logged members list, and displays non-blocking confirmation feedback with the member's photo (or initials fallback if no photo is set), `name`, and `member_id`

#### Scenario: Successful check-in for member without a photo
- **WHEN** a volunteer checks in a member who has no stored profile photo
- **THEN** the system displays the check-in confirmation feedback with the member's initials avatar, `name`, and `member_id`

#### Scenario: Duplicate check-in prevented
- **WHEN** a volunteer scans a `member_id` that is already checked in for the same event
- **THEN** the system rejects the duplicate check-in and notifies the volunteer that the member is already checked in

### Requirement: Dynamically display tracked fields in logged members list
The system SHALL display each checked-in member in the event's attendance list with their photo in the avatar whenever available (falling back to initials when no photo is set), along with only the optional member detail fields configured in the event's `tracked_fields` and the check-in date.

#### Scenario: Render member photo avatar regardless of tracked fields
- **WHEN** a checked-in member has a stored photo and the event's `tracked_fields` does not include `Photo`
- **THEN** the logged members list and last check-in summary still render the member's photo in their avatar

#### Scenario: Render initials fallback when member has no photo
- **WHEN** a checked-in member has no stored photo
- **THEN** the logged members list and last check-in summary render the member's initials in their avatar

#### Scenario: Render selected tracked fields on attendance list
- **WHEN** an event has `tracked_fields` set to `Name`, `Member ID`, `Address`, and `Phone`
- **THEN** the attendance list displays each checked-in member's name, member ID, address, phone number, and check-in date, and omits unselected detail fields such as date of birth or email
