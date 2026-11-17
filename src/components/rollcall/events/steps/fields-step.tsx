"use client";

import type { RefObject } from "react";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";

import {
  formatEventDate,
  optionalTrackedFieldOptions,
  type EventFormErrors,
  type EventFormValues,
} from "@/components/rollcall/events/event-form-types";
import { requiredTrackedFields } from "@/components/rollcall/shared/member-utils";
import { Button } from "@/components/ui/button";

type FieldsStepProps = {
  mode?: "create" | "edit";
  values: EventFormValues;
  errors?: EventFormErrors;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isSubmitting?: boolean;
  onToggleField: (field: string) => void;
  onBack?: () => void;
  onCreate?: () => void;
};

export function FieldsStep({
  mode = "create",
  values,
  errors,
  headingRef,
  isSubmitting = false,
  onToggleField,
  onBack,
  onCreate,
}: FieldsStepProps) {
  const isEdit = mode === "edit";

  const body = (
    <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6 sm:py-4">
      {!isEdit && (
        <div className="mb-3.5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold leading-snug text-foreground">
              {values.name.trim()}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
              {formatEventDate(values.eventDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="min-h-11 shrink-0 px-2 text-[15px] font-bold text-primary-strong hover:underline disabled:opacity-50"
          >
            Edit
          </button>
        </div>
      )}

      {errors?.form && (
        <div
          role="alert"
          className="mb-3.5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{errors.form}</span>
        </div>
      )}

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-2.5 font-heading text-xl font-extrabold tracking-[-.02em] outline-none"
      >
        What should we record at the door?
      </h2>

      <div className="flex flex-col gap-1.5">
        {requiredTrackedFields.map((field) => (
          <div
            key={field}
            className="flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] bg-[#EEF1F2] px-4 text-[17px] font-bold text-foreground"
          >
            <span className="flex items-center gap-2.5">
              <Lock
                className="size-[18px] shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{field}</span>
            </span>
            <span className="text-[13px] font-semibold text-muted-foreground">
              Always recorded
            </span>
          </div>
        ))}

        {optionalTrackedFieldOptions.map((field) => {
          const isPressed = values.trackedFields.includes(field);
          return (
            <button
              key={field}
              type="button"
              aria-pressed={isPressed}
              onClick={() => onToggleField(field)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-4 text-left text-[17px] font-bold text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span>{field}</span>
              <span
                aria-hidden="true"
                className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-motion-fast ease-motion-standard ${
                  isPressed ? "bg-primary" : "bg-[#C5CDD0]"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-6 rounded-full bg-white transition-transform duration-motion-fast ease-motion-standard ${
                    isPressed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isEdit) {
    return body;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {body}
      <footer className="sticky bottom-0 z-10 grid grid-cols-[auto_1fr] gap-2.5 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          className="h-14 min-h-11 px-5 text-[17px] font-bold"
          onClick={onBack}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          loading={isSubmitting}
          loadingText="Creating…"
          className="h-14 min-h-11 w-full text-[17px] font-bold"
          onClick={onCreate}
        >
          Create event
        </Button>
      </footer>
    </div>
  );
}
