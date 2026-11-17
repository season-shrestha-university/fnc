# Proposal

## Why

The RollCall app currently mixes ad-hoc animations (such as `animate-bounce`-like overshoot on the check-in sheet, `zoom-in-95` dialog pop, `animate-spin` loaders, `width` transitions, and instant state swaps) with missing transition choreography on wizards, tabs, lists, and camera previews. Applying the Shorelines motion specification from `prototype/rollcall-motion/MOTION-SPEC.md` gives door volunteers calm, purposeful, GPU-friendly feedback that confirms actions clearly without visual jitter, overlap, or wasted motion, while honoring `prefers-reduced-motion`.

## What Changes

- **Add Shorelines motion tokens and reduced-motion baseline**: Define `--motion-duration-*`, `--motion-ease-*`, `--motion-translate-*`, `--motion-scale-*`, and `--motion-hold-checkin` tokens in `src/app/globals.css` with Tailwind v4 `@theme inline` mappings and `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Upgrade check-in door sheet (hero moment)** (**BREAKING** for existing scan-error toast expectations):
  - Replace the current `animate-sheet-up` toast with a unified door feedback sheet supporting `variant: 'success' | 'duplicate' | 'error'` (teal success, amber duplicate, red unknown/invalid).
  - Add `Undo` (reverts check-in and dismisses) and `Done` (dismisses immediately) buttons on the success sheet alongside a 2000ms post-enter hold, `scaleX` progress bar, 180ms-delayed SVG tick `stroke-dashoffset` draw, and in-place restart when a subsequent scan arrives while open.
  - Auto-dismiss `duplicate` and `error` door sheets after 3000ms post-enter so door flow keeps moving, while allowing immediate manual dismissal.
- **Standardize UI primitives and loading states** (**BREAKING** for spinner-asserting tests and specs):
  - Remove all spinning loaders (`animate-spin` / `Loader2` rotation) across `Button`, event/member forms, check-in sync/pending states, and attendance row deletion; rely on pending labels (`Creating…`, `Saving…`, `Deleting event…`, `Checking in...`) with static text or reduced-motion-safe subtle opacity pulse.
  - Update `Dialog` (and migrate custom wizard/edit modals onto `@base-ui/react` state attributes or matching `data-starting-style` / `data-ending-style` lift+fade and mobile bottom-sheet slide), `Button` active press `scale(0.98)` + disabled-to-enabled color transition, `Input` inline error `-4px` drop, `FieldsStep` toggle `translateX` thumb, `WorkspaceSkeleton` low-contrast `1 -> 0.55` opacity pulse, and `ToastProvider` top-entry non-door toasts (140ms exit before 200ms enter).
- **Add wizard, tab, list, and camera motion logic**:
  - Track `direction: 'forward' | 'back'` in Create Member and Create Event wizards with sequential outgoing exit (120ms + hide) before incoming enter (200ms) and optional height transition so step text never overlaps.
  - Animate a single sliding `translateX` tab underline and 200ms content crossfade in Edit Member and Edit Event dialogs, plus delayed unmount (`84ms`) for dirty-dot exit.
  - Animate newly added member/event rows (`data-just-added` 320ms lift + teal tint fade) and deleted rows (`140ms` exit before unmount), and animate camera preview readiness (`data-state="ready"`) plus capture flash fade.
  - Keep app-shell route transitions at `0ms` (no page-wide slide or crossfade).

## Capabilities

### New Capabilities
- `motion-and-feedback-system`: Cross-cutting Shorelines motion tokens, `prefers-reduced-motion` behavior, transform/opacity constraints, UI primitive transitions (dialogs, sheets, non-door toasts, buttons, toggles, inline errors, skeletons), list add/remove transitions, camera preview readiness, and non-spinning loading state rules.

### Modified Capabilities
- `event-attendance-tracking`: Update check-in door confirmation and duplicate/unknown scan feedback to use the unified `success` / `duplicate` / `error` bottom sheet with `Undo` / `Done` actions, post-enter auto-dismiss timers, and in-place scan restart; add sequential directional step transitions and sliding edit tabs; remove spinning loaders from event create/edit/delete/check-in states.
- `member-directory`: Add sequential directional step transitions to the create-member wizard, sliding edit tab underline and delayed dirty-dot exit to the edit-member dialog, camera preview ready/flash transitions, and list add/remove transitions; remove spinning loaders from member create/edit loading states.

## Impact

- **Styling & Tokens**: `src/app/globals.css`
- **UI Primitives & Layout**: `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/input.tsx`, `src/components/rollcall/layout/toast-provider.tsx`, `src/components/rollcall/shared/workspace-skeleton.tsx`
- **Check-In & Camera**: `src/components/rollcall/check-in/check-in-view.tsx`, `src/components/rollcall/check-in/attendance-view.tsx`, `src/components/rollcall/check-in/use-qr-scanner.ts`, `src/components/rollcall/members/use-member-camera.ts`, `src/components/rollcall/members/wizard-steps/photo-step.tsx`
- **Wizards, Dialogs & Lists**: `src/components/rollcall/events/create-event-wizard-dialog.tsx`, `src/components/rollcall/events/edit-event-dialog.tsx`, `src/components/rollcall/events/steps/fields-step.tsx`, `src/components/rollcall/events/steps/event-confirm-sheets.tsx`, `src/components/rollcall/events/events-view.tsx`, `src/components/rollcall/events/events-list.tsx`, `src/components/rollcall/members/create-member-wizard-dialog.tsx`, `src/components/rollcall/members/edit-member-dialog.tsx`, `src/components/rollcall/members/wizard-steps/contact-step.tsx`, `src/components/rollcall/members/wizard-steps/done-step.tsx`, `src/components/rollcall/members/member-directory.tsx`
- **Tests**: Unit tests (`button.test.tsx`, `check-in-view.test.tsx`, `create-event-wizard-dialog.test.tsx`, `edit-event-dialog.test.tsx`, `create-member-wizard-dialog.test.tsx`, `edit-member-dialog.test.tsx`, `events-view.test.tsx`, `member-directory.test.tsx`) and E2E tests (`e2e/qr-scanner-feedback.spec.ts`).
