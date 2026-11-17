"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AlertCircle, ArrowRight, CalendarDays, ChevronDown } from "lucide-react";

import {
  formatEventDate,
  parseEventDate,
  toEventDateIso,
  type EventFormErrors,
  type EventFormValues,
} from "@/components/rollcall/events/event-form-types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type BasicsStepProps = {
  mode?: "create" | "edit";
  values: EventFormValues;
  errors: EventFormErrors;
  headingRef: RefObject<HTMLHeadingElement | null>;
  focusNameTick?: number;
  isSubmitting?: boolean;
  onNameChange: (name: string) => void;
  onDateChange: (date: string) => void;
  onCancel?: () => void;
  onNext?: () => boolean;
  onDeleteRequest?: () => void;
};

export function BasicsStep({
  mode = "create",
  values,
  errors,
  headingRef,
  focusNameTick = 0,
  isSubmitting = false,
  onNameChange,
  onDateChange,
  onCancel,
  onNext,
  onDeleteRequest,
}: BasicsStepProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const isEdit = mode === "edit";
  const selectedDate = parseEventDate(values.eventDate);

  useEffect(() => {
    if (focusNameTick > 0) {
      nameInputRef.current?.focus();
    }
  }, [focusNameTick]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = onNext?.() ?? true;
    if (!ok) {
      nameInputRef.current?.focus();
    }
  }

  const body = (
    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="sr-only outline-none"
      >
        Basics
      </h2>

      {errors.form && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{errors.form}</span>
        </div>
      )}

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label
            htmlFor="event-name-input"
            className="text-[15px] font-bold text-foreground"
          >
            Event name <span className="text-primary-strong">*</span>
          </label>
          <Input
            ref={nameInputRef}
            id="event-name-input"
            name="name"
            type="text"
            placeholder="e.g. Community Lunch"
            value={values.name}
            onChange={(event) => onNameChange(event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "event-name-error" : undefined}
            className={`h-14 rounded-xl px-3.5 text-[17px] font-medium ${
              errors.name
                ? "border-2 border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : "border-[1.5px] border-input"
            }`}
          />
          {errors.name && (
            <p
              id="event-name-error"
              role="alert"
              className="flex items-center gap-1.5 text-sm font-bold text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="event-date-input"
            className="text-[15px] font-bold text-foreground"
          >
            Date
          </label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger
              id="event-date-input"
              type="button"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center gap-2.5 rounded-xl border-[1.5px] border-input bg-card px-3.5 text-left text-[17px] font-medium text-foreground transition-colors hover:bg-muted/30 focus-visible:border-2 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
            >
              <CalendarDays
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="flex-1 truncate">
                {formatEventDate(values.eventDate)}
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={(date) => {
                  if (!date) return;
                  onDateChange(toEventDateIso(date));
                  setDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isEdit && onDeleteRequest && (
        <div className="mt-7">
          <button
            type="button"
            onClick={onDeleteRequest}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center text-[15px] font-bold text-destructive transition-colors hover:underline disabled:opacity-50"
          >
            Delete event
          </button>
        </div>
      )}
    </div>
  );

  if (isEdit) {
    return body;
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {body}
      <footer className="sticky bottom-0 z-10 grid grid-cols-[auto_1fr] gap-2.5 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          className="h-14 min-h-11 px-5 text-[17px] font-bold"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-14 min-h-11 w-full text-[17px] font-bold"
        >
          Next
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </footer>
    </form>
  );
}
