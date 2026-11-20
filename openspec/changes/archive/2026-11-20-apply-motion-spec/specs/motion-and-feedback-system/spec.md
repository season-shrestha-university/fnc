# Spec Delta

## Purpose

Defines RollCall's Shorelines motion tokens, `prefers-reduced-motion` fallbacks, transform-and-opacity constraints, and shared UI transition behaviors across dialogs, sheets, toasts, controls, skeletons, and lists.

## ADDED Requirements

### Requirement: Shorelines motion tokens and easing discipline
The system SHALL define Shorelines duration tokens (`120ms` fast, `200ms` base, `320ms` slow), precomputed 70% exit durations (`84ms`, `140ms`, `224ms`), non-overshoot easing curves, and motion distances, and SHALL restrict animations to `transform` and `opacity` except for the check-in tick `stroke-dashoffset`, color state transitions, and sequential wizard viewport height.

#### Scenario: Motion tokens exclude bounce and layout-property animation
- **WHEN** any UI transition or keyframe animation runs in the application
- **THEN** it uses the Shorelines duration and cubic-bezier easing tokens without overshoot, bounce, or animated `width`, `top`, `left`, `margin`, or `background-position` properties

#### Scenario: Progress indicators use scaleX instead of width
- **WHEN** an attendance progress bar or hold timer bar animates its progress
- **THEN** it transforms `scaleX` from left origin rather than animating CSS `width`

### Requirement: Operating-system reduced motion support
The system SHALL honor the operating system `prefers-reduced-motion: reduce` setting without providing an in-app motion toggle, degrading motion transitions to `120ms` enter / `84ms` exit opacity fades with zeroed travel and scale, static `0.8` opacity skeletons, instant dirty-dot and toggle changes, and short or immediate unmount delays.

#### Scenario: Reduced motion disables spatial travel and scaling
- **WHEN** `prefers-reduced-motion: reduce` is active and a dialog, sheet, toast, button, error, wizard step, tab underline, or list item animates
- **THEN** spatial translations and scale transforms are disabled, transitions degrade to opacity-only fades or instant state swaps, and delayed unmounts do not wait for full standard exit durations

#### Scenario: Reduced motion disables skeleton pulse and tick draw
- **WHEN** `prefers-reduced-motion: reduce` is active while viewing a loading skeleton or the check-in confirmation sheet
- **THEN** skeleton placeholders render statically at `0.8` opacity and the check-in tick renders pre-drawn with no hold progress bar animation while keeping the auto-dismiss timer active

### Requirement: Non-spinning loading and pending states
The system SHALL NOT display rotating or spinning loader icons during form submissions, sync operations, check-in lookups, or row deletions, and SHALL instead communicate pending states via label updates (`Creating…`, `Saving…`, `Deleting event…`, `Checking in...`) with static text or reduced-motion-safe opacity pulse.

#### Scenario: Pending submit button displays label without rotating icon
- **WHEN** a volunteer triggers a pending action such as `Create event`, `Save changes`, `Create & generate QR`, `Delete event`, or `Sign out`
- **THEN** the control disables interaction and displays its pending text label without rendering a spinning loader icon

### Requirement: Interactive button and toggle feedback
The system SHALL scale non-disabled buttons to `0.98` over `120ms` while pressed, transition button fill color over `200ms` when enabling and `140ms` when disabling, and slide optional field toggle thumbs horizontally by `20px` via `translateX` over `120ms` with a track color change.

#### Scenario: Active press feedback on enabled vs disabled buttons
- **WHEN** a volunteer presses an enabled button versus a disabled button
- **THEN** the enabled button scales to `0.98` on press and returns to `1` on release over `120ms`, whereas the disabled button does not scale

#### Scenario: Optional check-in field toggle transitions via translateX
- **WHEN** a volunteer toggles an optional field switch on or off
- **THEN** the toggle thumb moves `20px` horizontally using `transform: translateX` over `120ms` without overshoot while the track transitions color

### Requirement: Inline field error reveal
The system SHALL animate inline validation error messages in and out using `opacity` and a `4px` vertical drop (`translateY(-4px)` to `0`) over `200ms` on enter and `140ms` on exit, updating the input border color directly with no horizontal shake or pulse.

#### Scenario: Validation error appears and clears smoothly
- **WHEN** a required or formatted input fails validation and later becomes valid
- **THEN** the error message enters with a `200ms` fade and `4px` drop while the input border turns destructive red without shaking, and fades out over `140ms` when cleared

### Requirement: Centered modal dialogs, mobile bottom sheets, and confirm overlays
The system SHALL keep dialogs, mobile bottom sheets, and overlaid confirmation sheets mounted through their exit transitions, animating centered dialog panels with an `8px` upward lift (`200ms` enter / `140ms` exit), mobile sheets with vertical `translateY(100%)` slide (`320ms` enter / `224ms` exit), and backdrop overlays with opacity fades (`200ms` enter / `140ms` exit).

#### Scenario: Dialog and confirm overlay enter and exit without pop or shake
- **WHEN** a centered modal dialog or an overlaid discard/delete confirmation sheet opens and closes
- **THEN** the backdrop fades opacity and the panel lifts `8px` into place over `200ms`, then reverses over `140ms` before unmounting without zoom scaling or shake

#### Scenario: Mobile dialog presents as bottom sheet
- **WHEN** a modal sheet anchored to the bottom opens and closes on a narrow viewport
- **THEN** the sheet slides up from `translateY(100%)` over `320ms` and exits downward over `224ms`

### Requirement: Non-door confirmation and status toasts
The system SHALL enter non-check-in toasts from the top (`translateY(-8px)` to `0`, `200ms`), hold for approximately `2500ms`, exit upward over `140ms` before unmounting, and display only one non-door toast at a time by completing the current toast's `140ms` exit before entering its replacement.

#### Scenario: Sequential replacement of active non-door toast
- **WHEN** a non-door toast is visible and a second non-door toast is triggered
- **THEN** the active toast exits over `140ms` before the new toast enters over `200ms`

### Requirement: Low-contrast skeleton loading pulse
The system SHALL animate loading skeleton placeholders by pulsing `opacity` between `1` and `0.55` on a `3200ms` `ease-in-out` loop (`1600ms` each way) without gradient sweeps or shimmer bars.

#### Scenario: Workspace skeleton loads with opacity-only pulse
- **WHEN** a workspace loading skeleton is rendered while data loads
- **THEN** placeholder blocks pulse opacity smoothly without moving gradient highlights

### Requirement: List item enter and removal transitions
The system SHALL highlight a newly created member or event row upon insertion with a `320ms` `8px` upward settle and fading teal tint overlay, and SHALL hold a deleted member or event row mounted for its `140ms` upward fade (`translateY(-4px)`) before removing it from the DOM.

#### Scenario: Newly created row settles with fading teal highlight
- **WHEN** a new member or event is added to its directory or events list
- **THEN** the row enters in its sorted position with a `320ms` fade-lift and a teal tint overlay that fades out over `320ms`, clearing its temporary added marker afterward

#### Scenario: Deleted row fades out before unmounting
- **WHEN** a volunteer confirms deletion of a member or event in a list
- **THEN** the row transitions opacity to `0` and translates `-4px` vertically over `140ms` before unmounting (or unmounts immediately under reduced motion)

### Requirement: Navigation route transitions
The system SHALL swap primary app-shell routes immediately (`0ms`) without page-wide horizontal slides, shared-element morphs, or top navigation progress bars.

#### Scenario: Navigating between app-shell sections
- **WHEN** a volunteer navigates between `Dashboard`, `Events`, `Members`, or event sub-views
- **THEN** the main route content switches without a slide or top progress-bar animation
