"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { DirtyDot } from "@/components/rollcall/shared/dirty-dot";

import {
  EVENT_EDIT_SECTIONS,
  EVENT_STEP_META,
  getEventEditDirtyMap,
  isEventEditDirty,
  normalizeTrackedFields,
  validateEventName,
  type EditEventSnapshot,
  type EventEditSection,
  type EventFormErrors,
  type EventFormValues,
} from "@/components/rollcall/events/event-form-types";
import { BasicsStep } from "@/components/rollcall/events/steps/basics-step";
import {
  DeleteEventSheet,
  DiscardChangesSheet,
} from "@/components/rollcall/events/steps/event-confirm-sheets";
import { FieldsStep } from "@/components/rollcall/events/steps/fields-step";
import { Button } from "@/components/ui/button";
import { getCurrentDate } from "@/lib/date";

export type EditableEvent = {
  id: string;
  name: string;
  eventDate: string;
  trackedFields: string[];
};

export type EditEventDialogProps = {
  open: boolean;
  event: EditableEvent | null;
  onClose: () => void;
  onSave: (input: {
    id: string;
    name: string;
    eventDate: string;
    trackedFields: string[];
  }) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
};

export function EditEventDialog(props: EditEventDialogProps) {
  const [lastEvent, setLastEvent] = useState<EditableEvent | null>(props.event);
  if (props.event && props.event !== lastEvent) {
    setLastEvent(props.event);
  }
  const activeEvent = props.event ?? lastEvent;
  const isOpen = props.open && Boolean(props.event);

  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogPrimitive.Portal>
        {activeEvent ? (
          <EditEventContent
            key={activeEvent.id}
            event={activeEvent}
            onClose={props.onClose}
            onSave={props.onSave}
            onDelete={props.onDelete}
          />
        ) : null}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function createSnapshot(event: EditableEvent): EditEventSnapshot {
  return {
    name: event.name,
    eventDate: event.eventDate || getCurrentDate(),
    trackedFields: normalizeTrackedFields(event.trackedFields),
  };
}

function EditEventContent({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: EditableEvent;
  onClose: () => void;
  onSave: EditEventDialogProps["onSave"];
  onDelete: EditEventDialogProps["onDelete"];
}) {
  const [snapshot] = useState<EditEventSnapshot>(() => createSnapshot(event));
  const [step, setStep] = useState<EventEditSection>("basics");
  const [values, setValues] = useState<EventFormValues>(snapshot);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [focusNameTick, setFocusNameTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const tabRefs = useRef<Record<EventEditSection, HTMLButtonElement | null>>({
    basics: null,
    fields: null,
  });

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const dirtyMap = getEventEditDirtyMap(snapshot, values);
  const dirty = isEventEditDirty(dirtyMap);
  const canSave = dirty && Boolean(values.name.trim());
  const isBusy = isSubmitting || isDeleting;

  const requestClose = useCallback(() => {
    if (isBusy) return;
    if (dirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [dirty, isBusy, onClose]);

  useEffect(() => {
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key !== "Escape") return;
      if (document.querySelector('[data-slot="popover-content"]')) return;
      keyboardEvent.preventDefault();
      if (isBusy) return;
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        setDeleteError(undefined);
        return;
      }
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return;
      }
      requestClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, requestClose, showDeleteConfirm, showDiscardConfirm]);

  function handleTabKeyDown(
    keyboardEvent: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (keyboardEvent.key !== "ArrowLeft" && keyboardEvent.key !== "ArrowRight") {
      return;
    }
    keyboardEvent.preventDefault();
    const delta = keyboardEvent.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (index + delta + EVENT_EDIT_SECTIONS.length) % EVENT_EDIT_SECTIONS.length;
    const nextSection = EVENT_EDIT_SECTIONS[nextIndex];
    setStep(nextSection);
    tabRefs.current[nextSection]?.focus();
  }

  function handleNameChange(name: string) {
    setValues((current) => ({ ...current, name }));
    setErrors((current) => {
      const next = { ...current };
      const nameError = validateEventName(name);
      if (nameError) {
        next.name = nameError;
      } else {
        delete next.name;
      }
      delete next.form;
      return next;
    });
  }

  function handleDateChange(eventDate: string) {
    setValues((current) => ({
      ...current,
      eventDate: eventDate || snapshot.eventDate,
    }));
    setErrors((current) => {
      if (!current.form) return current;
      const next = { ...current };
      delete next.form;
      return next;
    });
  }

  function handleToggleField(field: string) {
    setValues((current) => {
      const exists = current.trackedFields.includes(field);
      const nextFields = exists
        ? current.trackedFields.filter((item) => item !== field)
        : [...current.trackedFields, field];
      return {
        ...current,
        trackedFields: normalizeTrackedFields(nextFields),
      };
    });
  }

  async function handleSave() {
    if (isBusy) return;
    const nameError = validateEventName(values.name);
    if (nameError) {
      setErrors((current) => ({ ...current, name: nameError }));
      setStep("basics");
      setFocusNameTick((tick) => tick + 1);
      return;
    }
    if (!dirty) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await onSave({
        id: event.id,
        name: values.name.trim(),
        eventDate: values.eventDate,
        trackedFields: normalizeTrackedFields(values.trackedFields),
      });
      onClose();
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Unable to save event",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    void handleSave();
  }

  async function handleConfirmDelete() {
    if (isBusy) return;
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete(event.id);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete event",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const activeTabIndex = EVENT_EDIT_SECTIONS.indexOf(step);

  return (
    <>
      <DialogPrimitive.Backdrop
        onClick={requestClose}
        className="ui-backdrop fixed inset-0 z-50 bg-foreground/50"
      />
      <DialogPrimitive.Popup
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-dialog-title"
        className="ui-dialog ui-dialog-responsive-sheet fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:bg-card sm:ring-1 sm:ring-border"
      >
        <div aria-live="polite" className="sr-only">
          {EVENT_STEP_META[step].label}
        </div>

        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2 px-4 pt-3 pb-2 sm:flex sm:items-center sm:gap-3 sm:px-6 sm:pt-5 sm:pb-0">
          <button
            type="button"
            onClick={requestClose}
            disabled={isBusy}
            aria-label="Close"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent disabled:opacity-50 sm:order-2 sm:border-0 sm:bg-secondary"
          >
            <X className="size-5" />
          </button>
          <h1
            id="edit-event-dialog-title"
            className="text-center font-heading text-[17px] font-extrabold sm:order-1 sm:flex-1 sm:text-left sm:text-[19px]"
          >
            Edit event
          </h1>
          <span className="sm:hidden" aria-hidden="true" />
        </header>

        <div className="px-5 pt-2 sm:px-6 sm:pt-3">
          <div
            aria-hidden="true"
            className="relative h-1 w-full overflow-hidden rounded-full bg-[#D5DCDF]"
          >
            <span
              className="tab-underline block h-full w-1/2 rounded-full bg-primary"
              style={{ "--tab-index": activeTabIndex } as CSSProperties}
            />
          </div>
          <div
            role="tablist"
            aria-label="Event sections"
            className="grid grid-cols-2"
          >
            {EVENT_EDIT_SECTIONS.map((section, index) => {
              const isActive = step === section;
              const isSectionDirty = dirtyMap[section];
              return (
                <button
                  key={section}
                  ref={(element) => {
                    tabRefs.current[section] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`edit-event-tab-${section}`}
                  aria-selected={isActive}
                  onClick={() => setStep(section)}
                  onKeyDown={(keyboardEvent) =>
                    handleTabKeyDown(keyboardEvent, index)
                  }
                  className="flex min-h-11 items-center justify-center px-1 py-1.5 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-bold leading-none transition-colors duration-motion-fast ease-motion-standard ${
                      isActive ? "text-primary-strong" : "text-muted-foreground"
                    }`}
                  >
                    {EVENT_STEP_META[section].label}
                    <DirtyDot dirty={isSectionDirty} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div key={step} className="tab-panel flex min-h-0 flex-1 flex-col">
            {step === "basics" && (
              <BasicsStep
                mode="edit"
                values={values}
                errors={errors}
                headingRef={headingRef}
                focusNameTick={focusNameTick}
                isSubmitting={isBusy}
                onNameChange={handleNameChange}
                onDateChange={handleDateChange}
                onDeleteRequest={() => {
                  setDeleteError(undefined);
                  setShowDeleteConfirm(true);
                }}
              />
            )}

            {step === "fields" && (
              <FieldsStep
                mode="edit"
                values={values}
                errors={errors}
                headingRef={headingRef}
                isSubmitting={isBusy}
                onToggleField={handleToggleField}
              />
            )}
          </div>

          <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              loadingText="Saving…"
              disabled={!canSave || isBusy}
              className="h-14 min-h-11 w-full text-[17px] font-bold disabled:bg-[#C5CDD0] disabled:text-white disabled:opacity-100"
            >
              Save changes
            </Button>
          </footer>
        </form>

        <DiscardChangesSheet
          open={showDiscardConfirm}
          mode="edit"
          eventName={snapshot.name}
          onKeepEditing={() => setShowDiscardConfirm(false)}
          onDiscard={onClose}
        />

        <DeleteEventSheet
          open={showDeleteConfirm}
          eventName={snapshot.name}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteError(undefined);
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      </DialogPrimitive.Popup>
    </>
  );
}
