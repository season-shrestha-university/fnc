"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import {
  EVENT_STEP_META,
  hasCreateUnsavedChanges,
  normalizeTrackedFields,
  validateEventName,
  type EventFormErrors,
  type EventFormValues,
  type EventWizardStep,
} from "@/components/rollcall/events/event-form-types";
import { BasicsStep } from "@/components/rollcall/events/steps/basics-step";
import { DoneStep } from "@/components/rollcall/events/steps/done-step";
import { DiscardChangesSheet } from "@/components/rollcall/events/steps/event-confirm-sheets";
import { FieldsStep } from "@/components/rollcall/events/steps/fields-step";
import { defaultTrackedFields } from "@/components/rollcall/shared/member-utils";
import {
  WizardStepViewport,
  type WizardDirection,
} from "@/components/rollcall/shared/wizard-step-viewport";
import { getCurrentDate } from "@/lib/date";

export type CreateEventWizardDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    eventDate: string;
    trackedFields: string[];
  }) => Promise<string>;
  onStartCheckIn?: (savedId: string) => void;
  onBackToEvents?: () => void;
};

export function CreateEventWizardDialog(props: CreateEventWizardDialogProps) {
  const [prevOpen, setPrevOpen] = useState(props.open);
  const [sessionKey, setSessionKey] = useState(0);

  if (props.open !== prevOpen) {
    setPrevOpen(props.open);
    if (props.open) {
      setSessionKey((key) => key + 1);
    }
  }

  return (
    <DialogPrimitive.Root open={props.open}>
      <DialogPrimitive.Portal>
        <CreateEventWizardContent key={sessionKey} {...props} />
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CreateEventWizardContent({
  onClose,
  onCreate,
  onStartCheckIn,
  onBackToEvents,
}: CreateEventWizardDialogProps) {
  const router = useRouter();
  const [initialDate] = useState(() => getCurrentDate());
  const [step, setStep] = useState<EventWizardStep>("basics");
  const [direction, setDirection] = useState<WizardDirection>("forward");
  const [values, setValues] = useState<EventFormValues>(() => ({
    name: "",
    eventDate: initialDate,
    trackedFields: [...defaultTrackedFields],
  }));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [focusNameTick, setFocusNameTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const requestClose = useCallback(() => {
    if (isSubmitting || step === "done") return;
    if (hasCreateUnsavedChanges(values, initialDate)) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [initialDate, isSubmitting, onClose, step, values]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector('[data-slot="popover-content"]')) return;
      event.preventDefault();
      if (isSubmitting || step === "done") return;
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return;
      }
      requestClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, requestClose, showDiscardConfirm, step]);

  function handleNameChange(name: string) {
    setValues((current) => ({ ...current, name }));
    setErrors((current) => {
      const next = { ...current };
      if (name.trim()) {
        delete next.name;
      }
      delete next.form;
      return next;
    });
  }

  function handleDateChange(eventDate: string) {
    setValues((current) => ({
      ...current,
      eventDate: eventDate || initialDate,
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

  function handleNext(): boolean {
    const nameError = validateEventName(values.name);
    if (nameError) {
      setErrors((current) => ({ ...current, name: nameError }));
      setFocusNameTick((tick) => tick + 1);
      return false;
    }
    setErrors({});
    setDirection("forward");
    setStep("fields");
    return true;
  }

  async function handleCreate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const id = await onCreate({
        name: values.name.trim(),
        eventDate: values.eventDate,
        trackedFields: normalizeTrackedFields(values.trackedFields),
      });
      setSavedId(id);
      setDirection("forward");
      setStep("done");
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Unable to save event",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartCheckIn() {
    if (!savedId) return;
    onClose();
    if (onStartCheckIn) {
      onStartCheckIn(savedId);
    } else {
      router.push(`/events/${savedId}/check-in`);
    }
  }

  function handleBackToEvents() {
    onClose();
    onBackToEvents?.();
  }

  const stepMeta = step === "done" ? null : EVENT_STEP_META[step];
  const liveAnnouncement = stepMeta
    ? `${stepMeta.number} of 2, ${stepMeta.label}`
    : "Event created";

  return (
    <>
      <DialogPrimitive.Backdrop
        onClick={requestClose}
        className="ui-backdrop fixed inset-0 z-50 bg-foreground/50"
      />
      <DialogPrimitive.Popup
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-event-wizard-title"
        className="ui-dialog ui-dialog-responsive-sheet fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:bg-card sm:ring-1 sm:ring-border"
      >
        <div aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>

        {step !== "done" ? (
          <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2 px-4 pt-3 pb-2 sm:flex sm:items-center sm:gap-3 sm:px-6 sm:pt-5 sm:pb-0">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              aria-label="Close"
              className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent disabled:opacity-50 sm:order-2 sm:border-0 sm:bg-secondary"
            >
              <X className="size-5" />
            </button>
            <h1
              id="create-event-wizard-title"
              className="text-center font-heading text-[17px] font-extrabold sm:order-1 sm:flex-1 sm:text-left sm:text-[19px]"
            >
              Create event
            </h1>
            <span className="sm:hidden" aria-hidden="true" />
          </header>
        ) : (
          <h1 id="create-event-wizard-title" className="sr-only">
            Event created
          </h1>
        )}

        {stepMeta && (
          <div className="px-5 pt-2 sm:px-6 sm:pt-4">
            <div className="grid grid-cols-2 gap-1.5" aria-hidden="true">
              {[1, 2].map((segment) => (
                <div
                  key={segment}
                  className={`h-1 rounded-full transition-colors ${
                    segment <= stepMeta.number ? "bg-primary" : "bg-[#D5DCDF]"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-sm font-bold text-muted-foreground">
              <span className="text-primary-strong">{stepMeta.number} of 2</span>{" "}
              · {stepMeta.label}
            </p>
          </div>
        )}

        <WizardStepViewport
          stepKey={step}
          direction={direction}
          onStepVisible={() => headingRef.current?.focus()}
          className="flex min-h-0 flex-1 flex-col"
        >
          {(renderedStep) => (
            <>
              {renderedStep === "basics" && (
                <BasicsStep
                  mode="create"
                  values={values}
                  errors={errors}
                  headingRef={headingRef}
                  focusNameTick={focusNameTick}
                  isSubmitting={isSubmitting}
                  onNameChange={handleNameChange}
                  onDateChange={handleDateChange}
                  onCancel={requestClose}
                  onNext={handleNext}
                />
              )}

              {renderedStep === "fields" && (
                <FieldsStep
                  mode="create"
                  values={values}
                  errors={errors}
                  headingRef={headingRef}
                  isSubmitting={isSubmitting}
                  onToggleField={handleToggleField}
                  onBack={() => {
                    setDirection("back");
                    setStep("basics");
                  }}
                  onCreate={() => void handleCreate()}
                />
              )}

              {renderedStep === "done" && (
                <DoneStep
                  eventName={values.name.trim()}
                  eventDate={values.eventDate}
                  headingRef={headingRef}
                  onStartCheckIn={handleStartCheckIn}
                  onBackToEvents={handleBackToEvents}
                />
              )}
            </>
          )}
        </WizardStepViewport>

        <DiscardChangesSheet
          open={showDiscardConfirm}
          mode="create"
          onKeepEditing={() => setShowDiscardConfirm(false)}
          onDiscard={onClose}
        />
      </DialogPrimitive.Popup>
    </>
  );
}
