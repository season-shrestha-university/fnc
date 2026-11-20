# Design

## Context

RollCall is a Next.js App Router + React 19 + Tailwind CSS v4 + `@base-ui/react` application. Existing animations are scattered across `src/app/globals.css` (`animate-sheet-up` with overshoot, `animate-toast-hold` animating `width`), `src/components/ui/dialog.tsx` (`tw-animate-css` `zoom-in-95`), `src/components/ui/button.tsx` (`animate-spin` loader), `src/components/rollcall/shared/workspace-skeleton.tsx` (`animate-pulse`), and inline `transition-[width]` / `transition-[left]` rules. Wizard dialogs (`CreateEventWizardDialog`, `CreateMemberWizardDialog`) and edit dialogs (`EditEventDialog`, `EditMemberDialog`) currently render custom `fixed inset-0` backdrops instead of `@base-ui/react/dialog`, and `ToastProvider` handles both the check-in door sheet and top toasts through one `toast` state slot.

See [proposal.md](./proposal.md) for motivation and scope, and the delta specs under `specs/` for normative behavior.

## Goals / Non-Goals

**Goals:**
- Centralize all Shorelines timing, easing, distance, scale, and reduced-motion tokens in `src/app/globals.css` so components compose standard CSS variables and Tailwind v4 utilities.
- Keep animations strictly on `transform` and `opacity`, honoring the three documented exceptions (check-in tick `stroke-dashoffset`, color transitions, and sequential wizard viewport height).
- Preserve existing accessibility contracts (ARIA roles, `aria-live` step announcements, focus management, keyboard `Esc`/arrow navigation, `>= 44px` targets) and existing test hooks (`data-testid="scan-toast"`, `data-slot="button"`, `role="dialog"`, `role="alertdialog"`) while updating tests that explicitly asserted removed spinners or old error-toast placement.
- Ensure jsdom unit tests and headless browsers handle transitions cleanly without hanging on `transitionend` events.

**Non-Goals:**
- Adding any animation library (Framer Motion, GSAP, `react-spring`).
- Adding an in-app reduced-motion toggle or restyling dark mode tokens.
- Adding route-change crossfades or top navigation progress bars in `AppShell`.

## Decisions

### 1. CSS Tokens and Tailwind v4 Integration (`src/app/globals.css`)
- **Decision**: Define `--motion-duration-*`, `--motion-ease-*`, `--motion-translate-*`, `--motion-scale-*`, and `--motion-hold-checkin` in `:root`, expose `--duration-motion-*` and `--ease-motion-*` in `@theme inline`, and add `@media (prefers-reduced-motion: reduce)` overrides plus explicit rules for full-height sheets (`translateY(100%)`), `.tick-path`, `.hold-bar`, and `.skeleton-pulse`.
- **Rationale**: Matches the Tailwind v4 setup already in `globals.css` and lets components degrade automatically without duplicate keyframes.
- **Alternative considered**: Defining JS timing constants only and inline-styling transitions. Rejected because CSS variables ensure hover/active states, `@base-ui/react` attribute selectors, and reduced-motion media queries stay synchronized without JS re-renders.

### 2. Shared Motion & Delayed-Unmount Utilities (`src/components/rollcall/shared/use-motion.ts`)
- **Decision**: Create a small client utility providing `prefersReducedMotion()` (reading `window.matchMedia('(prefers-reduced-motion: reduce)').matches` safely with SSR/jsdom fallback) and a `useDelayedUnmount(present, exitMs)` hook that listens for exit completion with a bounded `setTimeout` fallback (short/zero delay under reduced motion).
- **Rationale**: Several non-Base-UI elements (dirty dots, deleted list rows, non-door toast replacements, and door sheet lifecycle) must remain mounted during exit transitions. Using `transitionend` alone can stall in headless/jsdom tests where CSS transitions do not fire; pairing `onTransitionEnd` with a timeout fallback guarantees deterministic cleanup.
- **Alternative considered**: Per-component `setTimeout` boilerplate. Rejected to avoid duplicated timer cleanup bugs and inconsistent reduced-motion checks.

### 3. `@base-ui/react/dialog` for All Modals and Confirm Overlays
- **Decision**: Update `src/components/ui/dialog.tsx` to animate `DialogOverlay` and `DialogContent` via Base UI's `data-starting-style` / `data-ending-style` attributes (`200ms` enter / `140ms` exit, `8px` panel lift, mobile bottom-sheet `translateY(100%)` variant where appropriate), and migrate `CreateEventWizardDialog`, `EditEventDialog`, `CreateMemberWizardDialog`, `EditMemberDialog`, and their overlaid confirm sheets (`DiscardChangesSheet`, `DeleteEventSheet`, member discard/delete confirm) onto Base UI `Dialog` / `AlertDialog` primitives (or matching `data-starting-style` / `data-ending-style` state attributes if wrapped in Base UI `Dialog.Root` + `Dialog.Backdrop` + `Dialog.Popup`).
- **Rationale**: Base UI automatically keeps closed dialogs mounted until `data-ending-style` CSS transitions finish, manages focus/portal/backdrop dismissal cleanly, and avoids hand-rolled dialog exit state machines.
- **Alternative considered**: Keeping custom `if (!open) return null` divs and adding custom unmount state machines to each of the 4 dialogs. Rejected because `MOTION-SPEC.md` explicitly recommends Base UI's `data-ending-style` lifecycle.

### 4. Dual-Channel `ToastProvider` (Door Sheet vs. Top Toast)
- **Decision**: Separate `ToastProvider` state into:
  1. `doorSheet`: holds `{ scanKey, variant: 'success' | 'duplicate' | 'error', title, member?, onUndo? }` with explicit phase (`entering` -> `holding` -> `exiting` -> `null`). `onEnterEnd` (or 320ms timer fallback / immediate under reduced motion) starts the hold timer (`2000ms` for `success`, `3000ms` for `duplicate`/`error`) and activates the `scaleX` progress bar. A new scan increments `scanKey` and updates `doorSheet` in place, resetting the hold timer and restarting the SVG tick draw without stacking. `Undo` cancels the hold timer, calls `onUndo()`, and transitions straight to `exiting`; `Done` cancels the hold timer and exits.
  2. `topToast`: holds non-door toasts (`200ms` enter from `-8px`, `2500ms` hold, `140ms` exit). Triggering a new top toast while one is visible transitions the active toast to `exiting` (`140ms`) and queues the replacement to enter immediately after exit finishes.
- **Rationale**: Door check-in sheets and non-door confirmation toasts have incompatible geometries, timers, actions, and replacement semantics. Keeping `data-testid="scan-toast"` and `role="status"` on the active door sheet preserves test ergonomics while allowing clean separation of concerns.
- **Alternative considered**: Implementing the door sheet locally inside `CheckInView`. Keeping the channel in `ToastProvider` (e.g. `showDoorSheet` alongside `showToast`) keeps portal/z-index stacking global and testable from any check-in trigger.

### 5. Sequential Directional Wizard Viewport
- **Decision**: Extract a `<WizardStepViewport>` (or `useSequentialStep` hook) used by `CreateMemberWizardDialog` and `CreateEventWizardDialog` that tracks `{ activeStep, displayStep, direction: 'forward' | 'back', phase: 'idle' | 'exiting' | 'enter-from' | 'entering' }`. On step change, `phase` enters `'exiting'` (`120ms`, `±8px` opacity `1 -> 0`) while optionally locking viewport height; after `120ms`, `displayStep` switches to `activeStep` in `'enter-from'` (`opacity: 0`, `±12px`, outgoing hidden), then switches on the next animation frame to `'entering'` (`200ms` to `opacity: 1`, `translateX(0)`, animating height over `200ms` if heights differ). Focus moves to the step heading once `displayStep` swaps and is visible. Under reduced motion, uses a `120ms` opacity swap without `translateX` or height animation.
- **Rationale**: Prevents outgoing and incoming form fields/headings from overlapping in the same viewport and ensures `Back`, `Cancel`, summary `Edit` links, and `Change photo` chips consistently animate backward (`'back'`).
- **Alternative considered**: Rendering both steps in a `grid` crossfade. Rejected because `MOTION-SPEC.md` requires sequential exit-then-hide-then-enter so text never overlaps.

### 6. Single Sliding Tab Underline and Delayed Dirty-Dot Exit
- **Decision**: In `EditEventDialog` and `EditMemberDialog`, place a single 4px indicator bar inside the `tablist` positioned via `transform: translateX(calc(var(--tab-index) * 100%))` (using a `grid` / `flex` track without horizontal gap inside the underline track so `index * 100%` aligns identically for 2-tab and 3-tab layouts). Render tab panels with a `200ms` opacity crossfade (`--motion-ease-standard`). Render the 7px dirty dot through `useDelayedUnmount(isSectionDirty, 84)` so clearing dirty state animates `scale(1 -> 0.6)` + `opacity(1 -> 0)` over `84ms` before unmounting.
- **Rationale**: One indicator bar with `translateX` avoids animating `left` or `width`, works across both 2-tab event edit and 3-tab member edit, and keeps tab switching random-access (fade, no slide).

### 7. Non-Spinning Pending States & Control Polish
- **Decision**: Remove `<Loader2 className="animate-spin" />` from `Button`, `EditMemberDialog`, `ContactStep`, `CheckInView`, and `AttendanceView`. Keep `data-loading`, `data-pending`, and `aria-busy` attributes on `Button` and pending rows, and use pending copy (`Creating…`, `Saving…`, `Deleting event…`, `Checking in...`, `Removing…`) with optional reduced-motion-safe subtle text opacity pulse (`1 -> 0.7`, `1600ms`). Update `CheckInView`'s attendance progress bar to `transform: scaleX(...)` with `origin-left`, `FieldsStep` toggle thumb to `translate-x-5`, `WorkspaceSkeleton` to a `3200ms` `1 <-> 0.55` opacity pulse (`0.8` static under reduced motion), and `PhotoStep` / `CheckInView` video wrappers to `data-state="ready"` when `MediaStream` is attached (plus a `200ms` white flash overlay on capture).
- **Rationale**: Eliminates all rotating loaders and layout-property animations while keeping pending states accessible (`aria-busy`, descriptive text) and visually legible.

## Risks / Trade-offs

- **[Risk] Unit tests in jsdom timing out or failing on sequential step transitions / delayed unmounts** -> Mitigation: Pair CSS transition listeners with `setTimeout` fallbacks, support deterministic timer advancement (`vi.useFakeTimers()` where needed), and update existing wizard/dialog/button/check-in unit tests to account for the 120ms sequential swap, Base UI dialog transitions, door sheet `Undo`/`Done`/variants, and non-spinning `Button` markup.
- **[Risk] Focus target not focusable while outgoing wizard step is exiting or incoming step is hidden** -> Mitigation: Trigger `headingRef.current?.focus()` / input focus only when `displayStep` has switched to the incoming step and is no longer hidden (`enter-from` / `entering`).
- **[Risk] Base UI `Dialog` migration alters existing `Escape` / scrim-click busy-blocking behavior in wizard/edit dialogs** -> Mitigation: Configure Base UI `Dialog.Root` `onOpenChange` to respect `isBusy` / `step === "done"` / `dirty` discard-confirm checks, and preserve `data-slot` and ARIA attributes tested by existing unit and Playwright specs.
- **[Risk] `events-view.tsx` uses server revalidation (`saveEvent`) rather than optimistic client list state** -> Mitigation: Store a lightweight client-side `recentlyCreatedEventId` (or session marker) when `CreateEventWizardDialog` completes so `EventsGrid` can apply `data-just-added="true"` on the newly created card if the volunteer returns to `/events`, and use `useDelayedUnmount` when deleting rows in `MemberDirectory` / `EventsGrid`.
