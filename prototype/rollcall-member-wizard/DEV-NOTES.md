# Create a member QR: 3-step flow (dev notes)

Design reference: `index.html` (all screens), `prototype.html` (clickable), PNGs in `shots/`.
This file covers the logic the design does not show. Keep the existing create-member API and QR generation as they are. Only the dialog's UI and state change.

## Fields (unchanged from today's form)
`name` (required), `memberId` (placeholder `MEMBER-001`), `dateOfBirth`, `email`, `phone`, `address`, `photo` (file or camera capture).
Don't add new fields. Validation rules for Member ID, email and phone stay whatever they are now.

## Step state
- One form state for the whole dialog, e.g. a single `react-hook-form` instance or one `useState` object, owned by the dialog, **not** by each step.
- `step: 'photo' | 'details' | 'contact' | 'done'`. Photo has a sub-state: `camera` (live preview) or `captured` (preview shown with Retake).
- Steps unmount/mount when you move between them, but values live in the parent, so going Back never loses what was typed. Verify: type in Email, go Back, come forward again, and the value is still there.
- The progress bar shows `Step n of 3 · <name>`. Segments up to and including the current step are filled. The done state hides the bar.

## Navigation
| From | Next / primary | Back |
|---|---|---|
| Photo (camera) | Take photo → `captured`. Upload from device → file picker → `captured`. Skip for now → `details` with `photo = null` | — (close button only) |
| Photo (captured) | Next → `details` | Retake → clears photo, back to `camera` |
| Details | Next → validate, then `contact` | Back → Photo (`captured` if there is a photo, else `camera`) |
| Contact | Create & generate QR → submit | Back → Details |
| Done | Download QR / Add another member / Done | — |

- The summary chips on Contact are shortcuts: Photo chip → Photo step, the other chips → Details.
- "Change" / "Add photo" on the Details card → Photo step.
- Close (X) or Esc at any step: if any field has a value, confirm before discarding. Otherwise close straight away.

## Validation
- **Name is required before leaving Details.** On Next with an empty or whitespace name: stay on the step, show the inline error "Enter the member's name to continue" under the field (red border, `aria-invalid`, error linked with `aria-describedby`), and move focus to the Name input. Clear the error as soon as the user types.
- Run any existing per-field checks (Member ID format, email) on the step that owns the field, so errors never appear on a step the user can't see.
- Contact fields are optional. "Create & generate QR" is never disabled on that step.
- On submit, also validate the whole form again (defence in depth). If a server error belongs to a field, jump to that field's step and show it there.

## Camera lifecycle (step 1)
- Call `getUserMedia({ video: { facingMode: 'user' } })` when the Photo step **mounts in `camera` state**. Show the dark preview with the oval guide while the stream is loading.
- **Stop every track** (`stream.getTracks().forEach(t => t.stop())`) when: a photo is captured, the user skips, the user moves to another step, the dialog closes, or the component unmounts. Put this in the effect cleanup so the camera light never stays on.
- Restart the stream on Retake, and when coming Back to Photo with no photo.
- Switch-camera button: stop the current stream, then request `facingMode: 'environment'` (or the reverse). Hide the button if only one camera exists (`enumerateDevices`).
- Capture: draw the video frame to a canvas (mirror it horizontally for the front camera so it matches the preview), then `toBlob('image/jpeg', 0.85)`. Store the Blob/File in form state and preview it with `URL.createObjectURL`. Revoke the URL on Retake and on reset.
- If permission is denied or no camera exists: replace the preview with a message ("Camera not available. Upload a photo instead.") and keep **Upload from device** and **Skip for now** working.
- Upload: `<input type="file" accept="image/*">`. On mobile, `capture="user"` is optional. Any size or type checks the current form has apply here.

## Submit (step 3)
- "Create & generate QR" calls the **existing** create-member action/endpoint with the same payload as today, photo included (or none if skipped).
- While submitting: disable both footer buttons, show a spinner and "Creating…" in the primary button, and block closing.
- On success: go to `done`, using the created member returned by the server (its ID is the source of truth for the QR, not the typed value).
- On failure: stay on Contact and show the error. Keep every value.

## Done state
- Show the photo (or the default avatar if skipped), name, ID and the QR from the **existing QR generation**. Don't build a new generator.
- Download QR: the same download/print behaviour that exists today, with filename `<memberId>-qr.png`.
- **Add another member**: reset the form to empty, clear errors, revoke photo URLs, set `step = 'photo'` and restart the camera. Also refresh/revalidate the members list in the background.
- **Done**: close the dialog and refresh the members list.

## Layout notes
- Mobile (< 640px): full-screen sheet. The footer is sticky (`position: sticky; bottom: 0`) with safe-area padding (`env(safe-area-inset-bottom)`). Content scrolls above it.
- Desktop: a 600px dialog with the same steps. The footer shows the step actions in one row (Skip link on the left, actions on the right).
- Focus: move focus to the step heading (or the first field) on every step change, and announce "Step 2 of 3, Details" with an `aria-live="polite"` region.
- Buttons are 56px high, and every target is at least 44px.
