# RollCall motion and transition spec

Shorelines-style motion for the FNC UK check-in app. Calm, quick, purposeful. No bounce, no spinning loaders, no decorative motion.

This is a design document. It does not change app source. The dev bot should drop the tokens into `src/app/globals.css` and apply the patterns with CSS transitions, keyframes and Tailwind utilities. Do not add an animation library.

Character: a door volunteer, one-handed, in a busy foyer. Motion confirms what just happened and then gets out of the way.

---

## Tokens

Paste into `src/app/globals.css`. In Tailwind v4, the `@theme` block maps them to `duration-motion-*` and `ease-motion-*` utilities.

```css
:root {
  --motion-duration-fast: 120ms;
  --motion-duration-base: 200ms;
  --motion-duration-slow: 320ms;
  --motion-duration-fast-exit: 84ms;   /* 70% of enter */
  --motion-duration-base-exit: 140ms;
  --motion-duration-slow-exit: 224ms;

  --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0, 1);
  --motion-ease-exit: cubic-bezier(0.3, 0, 1, 1);

  --motion-translate-step-exit: 8px;
  --motion-translate-step-enter: 12px;
  --motion-translate-dialog: 8px;
  --motion-translate-error: 4px;
  --motion-scale-press: 0.98;
  --motion-scale-dot-from: 0.6;
  --motion-hold-checkin: 2000ms;
}

@theme inline {
  --duration-motion-fast: var(--motion-duration-fast);
  --duration-motion-base: var(--motion-duration-base);
  --duration-motion-slow: var(--motion-duration-slow);
  --duration-motion-fast-exit: var(--motion-duration-fast-exit);
  --duration-motion-base-exit: var(--motion-duration-base-exit);
  --duration-motion-slow-exit: var(--motion-duration-slow-exit);
  --ease-motion-standard: var(--motion-ease-standard);
  --ease-motion-enter: var(--motion-ease-enter);
  --ease-motion-exit: var(--motion-ease-exit);
}
```

Exit duration is always 70% of the matching enter duration. Use the precomputed `--motion-duration-*-exit` variables; do not calculate this in CSS.

### Reduced motion, by default

Zero the distances and scales under `prefers-reduced-motion`. Existing rules then degrade to a 120ms opacity fade, without a second set of keyframes.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 120ms;
    --motion-duration-base: 120ms;
    --motion-duration-slow: 120ms;
    --motion-duration-fast-exit: 84ms;
    --motion-duration-base-exit: 84ms;
    --motion-duration-slow-exit: 84ms;
    --motion-translate-step-exit: 0px;
    --motion-translate-step-enter: 0px;
    --motion-translate-dialog: 0px;
    --motion-translate-error: 0px;
    --motion-scale-press: 1;
    --motion-scale-dot-from: 1;
  }
}
```

Full-height sheets (check-in success, mobile drawers) use `translateY(100%)`, which this token trick cannot zero. They need an explicit reduced-motion rule: no transform, opacity only. The tick draw and the skeleton pulse also need explicit fallbacks — see those rows.

Honor `prefers-reduced-motion` from the operating system. Do not add an in-app toggle.

### What may animate

Animate **transform** and **opacity** only.

Three documented exceptions:

1. **Check-in tick** — `stroke-dashoffset` on a 24–26px SVG. This is the hero moment, and the only paint-property animation in the product.
2. **Color** — toggle track, button disabled-to-enabled, and focus border. Keep these at `--motion-duration-fast` or `--motion-duration-base` with `--motion-ease-standard`. Do not add extra movement to them.
3. **Wizard viewport height** — if two steps differ in height, the step viewport may animate `height` over 200ms with `--motion-ease-standard`, so the footer does not jump. This is the only height animation in the product. It starts when the incoming step appears, after the outgoing step is already hidden.

Do not animate `width`, `top`, `left`, `margin`, or `background-position`. Progress bars use `transform: scaleX()`, not `width`.

---

## Patterns

| Pattern | Trigger | Properties | Duration | Easing | Reduced motion | Where it applies |
|---|---|---|---|---|---|---|
| Wizard step change | Next / Back, or a create-flow “Edit” link that returns to the previous step | **Sequential, so text never overlaps.** The outgoing step fades `opacity` 1→0 over 120ms, plus a tiny `translateX` of −8px going forward or +8px going back. It is then hidden (`visibility: hidden` or `display: none`) so the two steps never render visibly at the same time. The incoming step starts at `opacity` 0 and `translateX` +12px going forward or −12px going back, then animates to rest over 200ms. Keep the step viewport’s height stable during the swap so the footer does not jump; if the steps differ in height, animate `height` over 200ms with standard easing. Total about 320ms. | Exit `--motion-duration-fast` (120ms), then enter `--motion-duration-base` (200ms). Height, if needed, 200ms, starting when the incoming step appears. | Outgoing `--motion-ease-exit` (`cubic-bezier(.3, 0, 1, 1)`). Incoming `--motion-ease-enter` (`cubic-bezier(0, 0, 0, 1)`). Height `--motion-ease-standard`. | A plain 120ms out-then-in opacity swap (no translate, no height animation), or an instant change. | Create-member wizard (Photo → Details → Contact → Done) and create-event wizard (Basics → Check-in fields → Done). Step viewport in the forthcoming wizard dialogs. **Needs logic:** store `direction: 'forward' \| 'back'` when the step changes, and set `data-direction` on the viewport. Hide the outgoing step completely before starting the incoming enter. Back, Cancel-to-previous, and the summary “Edit” link are `'back'`. |
| Tab switch (edit mode) | Tapping Photo / Details / Contact, or Basics / Check-in fields | A single underline (not a bar per tab) slides with `translateX` to the active tab. Tab labels change color instantly, or with a 120ms color fade. Panel content crossfades: outgoing opacity 1→0, incoming 0→1. No horizontal slide — tabs are random access, not a walk. | Underline 200ms. Content 200ms, both ways. | `--motion-ease-standard` | Underline jumps with no slide. Content: 120ms opacity, or instant. | `Edit member` and `Edit event` tab bars. Prefer one absolutely positioned 4px bar whose `translateX` is `index * 100%` of a tab’s width (set `--tab-index` or a style). **Needs logic:** set the underline’s target when the active tab changes. Do not animate `left` or `width`. |
| Dirty dot | A section becomes dirty or clean against the snapshot taken when the dialog opened | Appear: `opacity` 0→1 and `scale(0.6)`→`scale(1)`. Disappear: reverse, 84ms. Transform origin is the center of the 7px teal dot. | Enter 120ms. Exit 84ms. | Enter `--motion-ease-enter`. Exit `--motion-ease-exit`. | Instant appear / disappear. No scale. | The 7px teal dot on an edit tab label (`member` Photo / Details / Contact, `event` Basics / Check-in fields). Animate on mount and unmount, not on every parent render. **Needs logic:** keep the existing per-section `dirty` flags. When a dot is removed, delay unmount until the 84ms exit finishes (`onTransitionEnd`), and skip that wait when reduced motion is on. |
| Toggle switch | Pressing an optional check-in field row (Email, Phone, Address, Date of birth, Photo) | Thumb moves with `translateX` (off: 0; on: 20px, matching the 52×32 track with a 24px thumb and 4px inset). Track color `#C5CDD0` → `#0E7C6B` (color exception). Do not bounce the thumb past the inset. The whole row is the hit target. | 120ms | `--motion-ease-standard` | Instant state change. No thumb slide. | Event create / edit `FieldsStep` toggles, and any later switch in `src/components/ui`. Locked rows (Name, Member ID) do not animate because they do not toggle. |
| Inline field error | A required field fails validation (empty Event name, empty member Name, and the same on blur / Next / Save) | Error line: `opacity` 0→1 and `translateY(-4px)`→0 (it drops into place). Input border goes to `--red` (`#C2412D`) with no movement. **No shake. No pulse.** | 200ms enter. 140ms exit when the field becomes valid. | Enter `--motion-ease-enter`. Exit `--motion-ease-exit`. | 120ms opacity only. No 4px drop. Border color may still change. | `src/components/ui/input.tsx` and the wizard / edit field components. Insert the error node in the flow so the layout can shift; do not animate height — a 4px fade-in is enough. |
| Button press | `pointerdown` / `:active` on a non-disabled button | `scale(0.98)`, then back to `scale(1)` on release. | 120ms both ways | `--motion-ease-standard` | No scale (`--motion-scale-press: 1`). Colors may still change on press (`#0E7C6B` → `#0B5E52`). | `src/components/ui/button.tsx`: primary, outline, tint, danger, 44px default and 56px `lg`. Links and icon chips may use the same scale. Do not scale a disabled button. |
| Button disabled → enabled | The form becomes valid (or dirty, in edit) so the primary action turns on | Background color `#C5CDD0` → `#0E7C6B` (color exception). No scale pop, no glow. The reverse (enabled → disabled) uses the 140ms exit timing. | 200ms enable. 140ms disable. | `--motion-ease-standard` | Instant color change, or 120ms color fade. | Create / edit primary actions: “Save changes”, “Next”, “Create event”. CSS can handle this from `:disabled`; no extra JS. |
| Dialog (centered) | Open / close of a modal dialog | Overlay: `opacity` 0→1. Panel: `opacity` 0→1 and `translateY(8px)`→0 (it lifts into place). Exit reverses both, faster. The panel does not scale. | Overlay and panel enter 200ms. Overlay exit 140ms. Panel exit 140ms. | Enter `--motion-ease-enter`. Exit `--motion-ease-exit`. Overlay uses `--motion-ease-standard`. | Overlay and panel: 120ms opacity, no lift. | `src/components/ui/dialog.tsx`, which is built on `@base-ui/react`. Hook the styles to Base UI’s `data-starting-style`, `data-ending-style`, `data-open` and `data-closed` (see Implementation). Desktop create / edit dialogs use this pattern, including the current single-scroll dialogs until the wizards replace them. |
| Mobile bottom sheet | A sheet that anchors to the bottom on a narrow viewport | Overlay: same fade as the dialog. Sheet: `translateY(100%)`→0. Exit: `translateY(0)`→`100%`. Soft settle means the enter easing, not a bounce or overshoot. | Enter 320ms. Exit 224ms. Overlay enter 200ms, exit 140ms. | Sheet enter `--motion-ease-enter`. Sheet exit `--motion-ease-exit`. Overlay `--motion-ease-standard`. | No slide. 120ms opacity on the sheet and the overlay. | Mobile presentation of dialogs if they are restyled as sheets, and the check-in success sheet below. Media query, not a separate component library. |
| Confirm sheet (discard / delete) | Close or Cancel with unsaved edits; Delete event / Delete member | Same motion as the centered dialog: overlay fade, panel lifts 8px. In the prototypes these sit as a 336px card on a scrim, on top of the edit dialog — they do not replace it. Delete uses the same motion as Discard. **No shake, no red flash.** The destructive color is on the button only. | 200ms enter, 140ms exit | Same as Dialog | Same as Dialog | Discard-changes confirm on member and event edit. Delete-event confirm, stacked on the Basics tab of edit event (it must not close the edit dialog first). Any future delete-member confirm. |
| Check-in success (hero) | A QR scan (or typed id) that checks a member in | See the timing table in the next section. Overlay fades. The teal sheet rises from the bottom with a soft settle. A white tick draws on a 48px badge. Undo and Done are tappable for the whole hold. A thin progress bar at the bottom uses `scaleX(0)`→`scaleX(1)` with `transform-origin: left center`. After the hold, the sheet exits down and the overlay fades. | Sheet enter 320ms, exit 224ms. Overlay enter 200ms, exit 140ms. Tick draw 320ms, starting 180ms after open. Hold 2000ms after the sheet has finished entering. Progress bar runs for those 2000ms. | Sheet `--motion-ease-enter` / `--motion-ease-exit`. Overlay `--motion-ease-standard`. Tick `--motion-ease-standard`. Progress `linear`. | Sheet and overlay fade 120ms, no slide. Tick is already drawn (`stroke-dashoffset: 0`), no draw animation. Progress bar is hidden; auto-dismiss still happens after 2000ms. | The teal check-in confirmation in `src/components/rollcall` toast / check-in view (`toast-provider` today, the door sheet on the check-in screen). This is the most important motion in the app. **Needs logic:** start a 2000ms timer when the *enter* transition ends, not when the sheet is first shown. Cancel the timer on Undo, Done, or unmount. If a second successful scan arrives while the sheet is open, update the member in place, restart the tick and the timer — do not stack sheets. Honor reduced motion with `matchMedia('(prefers-reduced-motion: reduce)')` when choosing unmount delays. |
| Already checked in / unknown | A scan that is a duplicate, or a code that does not match a member | Same sheet geometry and slide as success, but no tick draw and no auto-dismiss (or a 3s hold if a hold is needed to keep the door moving). Variant A, already checked in: calm amber surface (`#A15C2A` on `#F4E6D8`, or an amber sheet at `#8A5A2B`). Copy such as “Already checked in” plus the member’s name. Variant B, unknown or invalid: destructive surface using `--red` / `--red-tint`, copy such as “Member not found”. **No shake in either variant.** | Same sheet timings as success (320ms / 224ms) | Same as success | Fade only, 120ms. Message appears fully formed. | Check-in view, same sheet component with a `variant: 'success' \| 'duplicate' \| 'error'` prop. Prefer one component, not a second toast. |
| Toast | A short confirmation after a save or a non-door action (event created, member updated, and so on) | Enters from the top of the phone frame (or the top of the dialog): `opacity` 0→1 and `translateY(-8px)`→0. Exits up and fades. One toast at a time; a new toast replaces the current one with a 140ms exit then a 200ms enter. | Enter 200ms. Exit 140ms. Hold ~2500ms, then auto-dismiss. | Enter `--motion-ease-enter`. Exit `--motion-ease-exit`. | 120ms opacity, no travel. Auto-dismiss still runs. | `src/components` toast provider, for non-check-in toasts. Do not use this for the door success — that is the hero sheet. |
| List item enter | A newly created member or event appears in its list | The new row: `opacity` 0→1 and `translateY(8px)`→0. A teal tint overlay (`#E3F2EF`) on the row fades `opacity` 1→0 over the same period (opacity only, via `::after`). It lands in its sorted position; it does not fly from a FAB. | 320ms | `--motion-ease-enter`. Tint overlay `--motion-ease-standard`. | 120ms opacity, no travel, no tint. | Member directory list, events list. **Needs logic:** set `data-just-added` on the new row for one animation cycle, then remove the attribute (`onAnimationEnd` or a 320ms timeout). Skip the wait when reduced motion is on. |
| List item removal | A member or event is deleted, after confirm | The row: `opacity` 1→0 and `translateY(0)`→`-4px`. Then unmount. Do not animate `height`. A small layout snap after unmount is acceptable. | 140ms | `--motion-ease-exit` | Instant unmount, or 84ms opacity. | Member directory, events list, after a successful delete. **Needs logic:** wait for `transitionend` (or 140ms) before removing the row from state. Skip the wait when reduced motion is on. |
| Skeleton pulse | A view is waiting on data | The placeholder block’s `opacity` pulses between 1 and 0.55. Low contrast, no moving highlight. **No gradient sweep, no shimmer bar, no sliding light.** | 1600ms one way, 3200ms full cycle, `ease-in-out`, infinite. | `ease-in-out` (this is a loop, not an enter/exit) | Static placeholders at opacity 0.8. `animation: none`. | `src/components/.../workspace-skeleton.tsx` and any other loading placeholders. |
| Page / route change | App-shell navigation between Events, a single event, Members, Dashboard, Sign-in | A 200ms opacity crossfade on the main content, or no motion at all. **No page-wide slide, no shared-element morph, no progress bar at the top of the screen.** Wizard-style sequential step transitions are only for steps inside a dialog. | 200ms, or 0 | `--motion-ease-standard` | Instant swap. | `src/app` routes and `app-shell`. Prefer no route animation unless a flash of empty state is visible; if you add one, keep it to opacity on the main landmark only. |
| Camera preview | The camera stream is ready, or the user taps Retake / Take photo and the preview mounts | The preview surface: `opacity` 0→1 and `scale(0.98)`→`scale(1)`. The live badge can fade in with it. Do not animate the video frames. A capture flash is allowed as a white overlay `opacity` 0.9→0 over 200ms — opacity only, no extra motion. | 200ms | `--motion-ease-enter` | 120ms opacity, no scale. Flash may still fire as a 120ms fade, or be skipped. | Member create / edit photo step, `html5-qrcode` scanner surface on the check-in screen. **Needs logic:** add an `is-ready` class (or `data-state="ready"`) when the stream exists, not when the component mounts. |

---

## Check-in success timing

The hero moment. One sequence, from a successful scan:

| t | What happens |
|---|---|
| 0ms | Overlay begins fading in (200ms). The teal sheet begins rising from `translateY(100%)` to `0` (320ms, enter easing). Undo and Done are already in the tree and tappable as soon as they are visible. |
| 180ms | The tick starts drawing: a check path with `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset` 1→0, 320ms, standard easing. The white 48px badge is already visible (it can scale 0.6→1 in 120ms if that reads more clearly, using the dirty-dot treatment). |
| 320ms | The sheet has settled. Start the 2000ms hold. The progress bar starts `scaleX(0)`→`scaleX(1)` over 2000ms, linear. |
| 2320ms | If the volunteer has not pressed Undo or Done, the sheet exits down (224ms, exit easing) and the overlay fades (140ms). |
| Undo or Done at any time | Cancel the hold timer and run the exit immediately. Undo also reverts the check-in (existing logic). Done dismisses without reverting. |

Stroke-dashoffset is the only exception to the transform-and-opacity rule, and only on this tick.

Suggested markup for the tick:

```html
<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
  <path
    pathLength="1"
    d="M6.5 13.5 11 18 19.5 8.5"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

```css
.tick-path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.sheet.is-open .tick-path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset var(--motion-duration-slow) var(--motion-ease-standard) 180ms;
}
@media (prefers-reduced-motion: reduce) {
  .tick-path,
  .sheet.is-open .tick-path {
    stroke-dashoffset: 0;
    transition: none;
  }
}
```

---

## Implementation notes

### CSS and Tailwind, nothing else

Use transitions and `@keyframes` already available in CSS, and Tailwind v4 utilities (`duration-motion-base`, `ease-motion-enter`, `data-[ending-style]:…`). Do not add Framer Motion, GSAP, `react-spring`, or `tailwindcss-animate` unless it is already in the project and already doing this job. If a helper is already imported and unused for these patterns, do not start using it here.

### `@base-ui/react` dialogs

Style enter and exit off Base UI’s state attributes, not off a React `isOpen` boolean that unmounts on the first frame.

```css
.ui-backdrop {
  opacity: 1;
  transition: opacity var(--motion-duration-base) var(--motion-ease-standard);
}
.ui-backdrop[data-starting-style],
.ui-backdrop[data-ending-style] {
  opacity: 0;
}
.ui-backdrop[data-ending-style] {
  transition-duration: var(--motion-duration-base-exit);
}

.ui-dialog {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity var(--motion-duration-base) var(--motion-ease-enter),
    transform var(--motion-duration-base) var(--motion-ease-enter);
}
.ui-dialog[data-starting-style],
.ui-dialog[data-ending-style] {
  opacity: 0;
  transform: translateY(var(--motion-translate-dialog));
}
.ui-dialog[data-ending-style] {
  transition-duration: var(--motion-duration-base-exit);
  transition-timing-function: var(--motion-ease-exit);
}
```

Keep the component mounted for the exit duration. Base UI already does this when `data-ending-style` is used. Do not write a hand-rolled parallel state machine for the same dialog.

### Wizard direction

The swap is sequential, not a crossfade. The outgoing step must finish and be hidden before the incoming step starts, so the two steps’ text never overlaps.

```tsx
// Needs logic
const [step, setStep] = useState<'basics' | 'fields' | 'done'>('basics');
const [direction, setDirection] = useState<'forward' | 'back'>('forward');

async function goTo(next: typeof step, dir: 'forward' | 'back') {
  setDirection(dir);
  setExitState('exiting');
  await wait(reducedMotion ? 120 : 120); // outgoing fade, 120ms
  hideOutgoing();                        // visibility: hidden or display: none
  setStep(next);                         // incoming starts at opacity 0
  await wait(reducedMotion ? 120 : 200); // incoming fade
}
```

```css
.step-panel[data-state="exiting"] {
  opacity: 0;
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-exit),
    transform var(--motion-duration-fast) var(--motion-ease-exit);
}
.step-panel[data-direction="forward"][data-state="exiting"] {
  transform: translateX(calc(var(--motion-translate-step-exit) * -1)); /* -8px */
}
.step-panel[data-direction="back"][data-state="exiting"] {
  transform: translateX(var(--motion-translate-step-exit)); /* +8px */
}
.step-panel[data-state="enter-from"] {
  opacity: 0;
  transition: none;
}
.step-panel[data-direction="forward"][data-state="enter-from"] {
  transform: translateX(var(--motion-translate-step-enter)); /* +12px */
}
.step-panel[data-direction="back"][data-state="enter-from"] {
  transform: translateX(calc(var(--motion-translate-step-enter) * -1)); /* -12px */
}
.step-panel[data-state="entering"] {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity var(--motion-duration-base) var(--motion-ease-enter),
    transform var(--motion-duration-base) var(--motion-ease-enter);
}
```

Keep the outgoing panel mounted only for its 120ms exit, then hide it (`visibility: hidden` or `display: none`) before the incoming panel is shown. Do not start both transitions at the same time. If the steps differ in height, lock the viewport height during the exit, then animate it to the incoming height over 200ms with `--motion-ease-standard` when the enter begins.

### Check-in timer

```tsx
// Needs logic
function onEnterEnd() {
  if (reducedMotion) {
    holdTimer = setTimeout(close, 2000);
    return;
  }
  holdTimer = setTimeout(close, 2000);
}
function onUndo() {
  clearTimeout(holdTimer);
  close(); // then revert the check-in
}
function onNewSuccess(member) {
  clearTimeout(holdTimer);
  setMember(member);
  restartTick();
  // start a new enter if the sheet was closing; otherwise just restart the hold
}
```

The progress bar must use `transform: scaleX()`, not `width`:

```css
.hold-bar > i {
  display: block;
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: left center;
  background: #fff;
}
.sheet.is-holding .hold-bar > i {
  transform: scaleX(1);
  transition: transform var(--motion-hold-checkin) linear;
}
```

### Unmount after exit

Anything that leaves the tree (toast, list row, dirty dot, step panel, confirm sheet) must stay mounted until its exit transition ends, then unmount. Read `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and unmount immediately, or after 84–120ms, when it is on. Do not wait the full 224–320ms in that case.

### Focus and overlays

Do not animate the focus ring. Keep the existing 4px teal ring. Overlays are `rgba(27, 37, 40, 0.5)` (or `0.45` on the door sheet). Fade opacity of the overlay, not its background-color.

### What this spec does not do

- No bounce, spring, or overshoot (cubic-bezier y-values stay at or below 1).
- No spinning loaders. Buttons may swap their label to “Creating…” and use a static ellipsis or a reduced-motion-safe pulsing opacity on the text, not a rotating icon.
- No skeleton gradient sweep.
- No motion on the Weave logo, except it may fade in with the sign-in screen if the route fades.
- Dark mode is not restyled here. When dark tokens are later refreshed, the same durations and easings apply.

---

## Logic the designer did not add

The following need behaviour changes or small amounts of state. They should go through OpenSpec if that is the project’s rule for behaviour, then a styling pass.

1. Wizard `direction` state, and a sequential swap: keep the outgoing step mounted for its 120ms exit, hide it, then start the incoming enter.
2. Check-in sheet auto-dismiss timer, cancellation, and in-place restart on a second scan.
3. `variant` on the door sheet for duplicate and unknown codes.
4. Delayed unmount for dirty-dot exit, list-item removal, and toasts.
5. `data-just-added` on a newly created list row.
6. `data-state="ready"` on the camera preview when the stream exists.
7. Tab underline position from the active index.
8. Respecting `prefers-reduced-motion` in JS unmount delays and in the tick / hold restart.

Tokens, class names, and the transitions themselves are styling and can land with the designer’s pass once the logic is in place.

---

## Reference

Live motion: `demo.html` (phone frames with Replay, plus a Reduce motion switch that simulates the fallback).

Static board: `index.html` and `shots/00-overview.png`.

Visual language: Manrope, background `#F2F4F5`, ink `#1A2B29`, grey `#5C676B`, teal `#0E7C6B` (pressed `#0B5E52`), destructive `#C2412D`, white cards at 16px radius. Existing prototypes in `prototype/rollcall-member-edit/` and `prototype/rollcall-event-create/`.
