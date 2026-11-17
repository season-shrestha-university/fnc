# Tasks

## 1. Motion Tokens, Reduced-Motion Utilities, and Shared Hooks

- [x] 1.1 Add Shorelines `--motion-duration-*`, `--motion-ease-*`, `--motion-translate-*`, `--motion-scale-*`, and `--motion-hold-checkin` tokens, Tailwind v4 `@theme inline` mappings, `@media (prefers-reduced-motion: reduce)` overrides, and shared motion keyframes/classes (removing `.animate-sheet-up` overshoot and `.animate-toast-hold` `width` keyframe) in `src/app/globals.css`; verify with `pnpm build` or CSS lint/parse check.
- [x] 1.2 Create `src/components/rollcall/shared/use-motion.ts` with `prefersReducedMotion()`, `usePrefersReducedMotion()`, and `useDelayedUnmount(present, exitMs)` (pairing `transitionend` with a reduced-motion-aware timeout fallback) plus unit tests in `src/components/rollcall/shared/use-motion.test.ts`; verify `pnpm vitest run src/components/rollcall/shared/use-motion.test.ts` passes.

## 2. UI Primitives and Non-Spinning Pending States

- [x] 2.1 Update `src/components/ui/button.tsx` to remove `<Loader2 className="animate-spin" />`, keep `data-loading` / `data-pending` / `aria-busy` pending text (`loadingText`) with subtle reduced-motion-safe opacity styling, add `scale(0.98)` active press on enabled buttons (`120ms`), and apply `200ms` enable / `140ms` disable background color transitions; update `src/components/ui/button.test.tsx` and verify `pnpm vitest run src/components/ui/button.test.tsx` passes.
- [x] 2.2 Update `src/components/ui/dialog.tsx` to replace `tw-animate-css` `zoom-in-95` animations with `@base-ui/react` `data-starting-style` / `data-ending-style` backdrop opacity fade (`200ms` / `140ms`), centered `8px` lift (`200ms` / `140ms`), and optional mobile bottom-sheet `translateY(100%)` variant (`320ms` / `224ms`); verify dialog render and exit attributes with component tests.
- [x] 2.3 Update `src/components/ui/input.tsx` and shared inline error styling so validation error nodes animate in (`opacity` 0→1, `translateY(-4px)`→0 over `200ms`) and out (`140ms`) without horizontal shake; update `src/components/rollcall/shared/workspace-skeleton.tsx` to use the `3200ms` `1`↔`0.55` opacity pulse (static `0.8` under reduced motion); verify with `pnpm vitest run` on affected component tests.
- [x] 2.4 Remove remaining spinning icons (`animate-spin`) in `src/components/rollcall/members/edit-member-dialog.tsx`, `src/components/rollcall/members/wizard-steps/contact-step.tsx`, `src/components/rollcall/check-in/check-in-view.tsx`, and `src/components/rollcall/check-in/attendance-view.tsx` (plus `src/components/rollcall/members/wizard-steps/done-step.tsx` / `member-directory.tsx` QR skeleton pulse), replacing them with non-spinning pending labels; update affected unit tests and verify they pass.

## 3. Unified Door Check-In Sheet and Non-Door Toast Sequencing

- [x] 3.1 Refactor `src/components/rollcall/layout/toast-provider.tsx` into dual channels: a `doorSheet` channel supporting `variant: 'success' | 'duplicate' | 'error'` (`320ms` rise / `224ms` exit, `200ms`/`140ms` scrim, `180ms`-delayed `320ms` SVG tick `stroke-dashoffset` draw, `2000ms` post-enter hold + `scaleX` progress bar on `success`, `3000ms` post-enter hold on `duplicate`/`error`, `Undo` and `Done` buttons, and in-place scan replacement) and a `topToast` channel (`200ms` `-8px` enter, `2500ms` hold, `140ms` exit before replacement); add unit tests in `src/components/rollcall/layout/toast-provider.test.tsx` and verify they pass.
- [x] 3.2 Update `src/components/rollcall/check-in/check-in-view.tsx` to trigger the `doorSheet` for `success` (passing an `onUndo` handler that reverts outbox or synced check-ins and restores attendance state), `duplicate` (`"Already checked in"` + member name), and `error` (`"Member not found"`), and convert the attendance card progress bar from `transition-[width]` to `transform: scaleX()` with `origin-left`; update `src/components/rollcall/check-in/check-in-view.test.tsx` and verify `pnpm vitest run src/components/rollcall/check-in/check-in-view.test.tsx` passes.

## 4. Sequential Directional Wizards and Sliding Edit Tabs

- [x] 4.1 Create a reusable `WizardStepViewport` (or `useSequentialStep` helper) supporting `direction: 'forward' | 'back'`, `120ms` outgoing exit + hide before `200ms` incoming enter, optional `200ms` height transition, and `120ms` opacity-only reduced-motion fallback; verify transition sequencing with unit tests using fake timers.
- [x] 4.2 Update `src/components/rollcall/events/create-event-wizard-dialog.tsx`, `src/components/rollcall/events/steps/fields-step.tsx`, and `src/components/rollcall/events/steps/event-confirm-sheets.tsx` to use Base UI dialog/overlay enter-exit attributes, `WizardStepViewport` (`Back` and summary `Edit` link marked `'back'`), `translateX(20px)` toggle thumbs, and lift-fade confirm sheets; update `src/components/rollcall/events/create-event-wizard-dialog.test.tsx` and verify it passes.
- [x] 4.3 Update `src/components/rollcall/events/edit-event-dialog.tsx` to use Base UI dialog enter-exit attributes, a single `translateX` sliding tab underline (`--tab-index`), `200ms` tab panel crossfade, and `useDelayedUnmount` (`84ms`) on tab dirty dots; update `src/components/rollcall/events/edit-event-dialog.test.tsx` and verify it passes.
- [x] 4.4 Update `src/components/rollcall/members/create-member-wizard-dialog.tsx` and `src/components/rollcall/members/edit-member-dialog.tsx` to use Base UI dialog/confirm enter-exit attributes, `WizardStepViewport` (`Back`, `Change`/`Add photo`, and summary chips marked `'back'`), single `translateX` sliding tab underline, `200ms` panel crossfade, and `84ms` delayed dirty-dot unmount; update `create-member-wizard-dialog.test.tsx` and `edit-member-dialog.test.tsx` and verify they pass.

## 5. List Transitions and Camera Preview Readiness

- [x] 5.1 Update `src/components/rollcall/members/member-directory.tsx`, `src/components/rollcall/events/events-view.tsx`, and `src/components/rollcall/events/events-list.tsx` to mark newly added items with `data-just-added` (`320ms` lift + teal tint fade, cleared after completion) and delay DOM removal of deleted items for `140ms` (`0ms` under reduced motion); update `member-directory.test.tsx` and `events-view.test.tsx` and verify they pass.
- [x] 5.2 Update `src/components/rollcall/members/wizard-steps/photo-step.tsx` and `src/components/rollcall/check-in/check-in-view.tsx` (`use-qr-scanner.ts` / `use-member-camera.ts` stream state) to set `data-state="ready"` when the `MediaStream` is active (`200ms` opacity + `0.98`→`1` scale) and render an opacity-only `200ms` capture flash overlay on photo capture; add/update unit tests and verify they pass.

## 6. End-to-End Integration & Spec Verification

- [x] 6.1 Update `e2e/qr-scanner-feedback.spec.ts` (and any event/member E2E tests checking removed spinners or door sheet variants/actions) to assert the `success` / `duplicate` / `error` door sheet behavior, `Undo` / `Done` actions, and non-spinning submit labels; run `pnpm test:ci` and `pnpm lint` and verify all unit tests and lint checks pass.
- [ ] 6.2 Run `pnpm build` and `pnpm test:e2e` (against local dev server / Supabase test env if available) and inspect key motion flows (`Demo` / check-in hero, create/edit wizards, reduced-motion emulation) to confirm zero console errors and clean layout behavior.

## Workflow follow-up

- Review the completed implementation against `prototype/rollcall-motion/MOTION-SPEC.md` and run `openspec archive apply-motion-spec` once verified.
