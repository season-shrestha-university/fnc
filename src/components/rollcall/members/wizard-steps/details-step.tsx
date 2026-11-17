"use client";

import { useEffect, useRef, type FormEvent, type RefObject } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  IdCard,
  Lock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/input";
import type {
  WizardErrors,
  WizardFormValues,
} from "@/components/rollcall/members/create-member-wizard-types";

type DetailsStepProps = {
  mode?: "create" | "edit";
  values: WizardFormValues;
  errors: WizardErrors;
  photoPreviewUrl: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  focusField?: "name" | "memberId" | null;
  onChange: (field: keyof WizardFormValues, value: string) => void;
  onGoPhoto?: () => void;
  onBack?: () => void;
  onNext?: () => boolean;
};

export function DetailsStep({
  mode = "create",
  values,
  errors,
  photoPreviewUrl,
  headingRef,
  focusField,
  onChange,
  onGoPhoto,
  onBack,
  onNext,
}: DetailsStepProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const memberIdInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (focusField === "name") {
      nameInputRef.current?.focus();
    } else if (focusField === "memberId") {
      memberIdInputRef.current?.focus();
    }
  }, [focusField]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = onNext?.() ?? true;
    if (!ok) {
      nameInputRef.current?.focus();
    }
  }

  const content = (
    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-2xl font-extrabold tracking-[-.02em] outline-none"
      >
        Member details
      </h2>

      {!isEdit && (
        <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-primary">
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreviewUrl}
                alt="Member photo preview"
                className="size-full object-cover object-[50%_25%]"
              />
            ) : (
              <User className="size-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-lg font-extrabold leading-tight ${
                values.name.trim()
                  ? "text-foreground"
                  : "font-semibold text-muted-foreground"
              }`}
            >
              {values.name.trim() || "New member"}
            </p>
            <p className="truncate text-sm font-semibold text-muted-foreground">
              {values.memberId.trim() || "No member ID yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoPhoto}
            className="min-h-11 shrink-0 px-2 text-sm font-bold text-primary hover:underline"
          >
            {photoPreviewUrl ? "Change" : "Add photo"}
          </button>
        </div>
      )}

      {isEdit && errors.form && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <div className={`${isEdit ? "mt-4" : "mt-5"} grid gap-4`}>
        <div className="grid gap-1.5">
          <label
            htmlFor="wizard-member-name"
            className="text-sm font-bold text-foreground"
          >
            Name <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={nameInputRef}
              id="wizard-member-name"
              placeholder="Full name"
              required
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "wizard-name-error" : undefined}
              onChange={(event) => onChange("name", event.target.value)}
              className={`h-14 pl-11 text-base ${
                errors.name
                  ? "border-2 border-destructive focus-visible:ring-destructive/20"
                  : ""
              }`}
            />
          </div>
          <FieldError id="wizard-name-error" message={errors.name} />
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="wizard-member-id"
            className="text-sm font-bold text-foreground"
          >
            Member ID
          </label>
          <div className="relative">
            {isEdit ? (
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            ) : (
              <IdCard className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              ref={memberIdInputRef}
              id="wizard-member-id"
              placeholder="MEMBER-001"
              value={values.memberId}
              readOnly={isEdit}
              disabled={isEdit}
              aria-readonly={isEdit ? "true" : undefined}
              aria-invalid={Boolean(errors.memberId)}
              aria-describedby={
                errors.memberId ? "wizard-member-id-error" : undefined
              }
              onChange={(event) => onChange("memberId", event.target.value)}
              className={`h-14 pl-11 text-base ${
                isEdit
                  ? "bg-muted/70 text-muted-foreground opacity-100"
                  : errors.memberId
                    ? "border-2 border-destructive focus-visible:ring-destructive/20"
                    : ""
              }`}
            />
          </div>
          <FieldError id="wizard-member-id-error" message={errors.memberId} />
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="wizard-member-dob"
            className="text-sm font-bold text-foreground"
          >
            Date of birth
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wizard-member-dob"
              type="date"
              value={values.dob}
              onChange={(event) => onChange("dob", event.target.value)}
              className="h-14 pl-11 text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isEdit) {
    return content;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {content}

      <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
        <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-14 min-h-11 px-5 text-base font-bold"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
            Back
          </Button>
          <Button
            type="submit"
            className="h-14 min-h-11 text-base font-bold sm:min-w-[180px]"
          >
            Next
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </footer>
    </form>
  );
}
